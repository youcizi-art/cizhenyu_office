import { getDb } from "../../lib/db";
import {
  hashPassword,
  generateSessionToken,
  createSessionCookie,
} from "../../lib/auth-crypto";
import { recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface InvitationRow {
  id: string;
  org_id: string;
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  expires_at: number;
}

/**
 * 员工凭安全邀请码激活入职 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return errorResponse("Cloudflare D1 Database binding 'DB' is not configured", 500);
  }

  let body: { code?: string; email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const code = (body.code || "").trim().toUpperCase();
  const email = (body.email || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const password = (body.password || "").trim();

  if (!code || !email || !password) {
    return errorResponse("Invitation code, email, and password are required", 400);
  }

  if (password.length < 6) {
    return errorResponse("Password must be at least 6 characters", 400);
  }

  try {
    const db = getDb(env);
    const now = Date.now();

    // 1. 查找邀请码
    const invitation = await db.queryOne<InvitationRow>(
      "SELECT * FROM invitation_codes WHERE code = ? LIMIT 1",
      code
    );

    if (!invitation) {
      return errorResponse("Invalid or nonexistent invitation code", 404);
    }

    if (invitation.expires_at < now) {
      return errorResponse("Invitation code has expired", 400);
    }

    if (invitation.used_count >= invitation.max_uses) {
      return errorResponse("Invitation code usage limit exceeded", 400);
    }

    // 2. 检查邮箱是否已存在
    const existingUser = await db.queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      email
    );
    if (existingUser) {
      return errorResponse("An account with this email already exists", 409);
    }

    // 3. 检查组织席位
    const org = await db.queryOne<{ id: string; name: string; max_seats: number }>(
      "SELECT id, name, max_seats FROM organizations WHERE id = ? LIMIT 1",
      invitation.org_id
    );
    if (!org) {
      return errorResponse("Associated organization not found", 404);
    }

    const currentCount = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE org_id = ?",
      invitation.org_id
    );
    if ((currentCount?.count || 0) >= org.max_seats) {
      return errorResponse("Organization seat limit reached. Please contact your admin", 403);
    }

    // 4. 创建用户
    const userId = crypto.randomUUID();
    const { hash, salt } = await hashPassword(password);
    const userName = name || email.split("@")[0] || "Employee";

    await db.execute(
      `INSERT INTO users (id, org_id, email, password_hash, salt, name, avatar, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      invitation.org_id,
      email,
      hash,
      salt,
      userName,
      null,
      invitation.role,
      "active",
      now,
      now
    );

    // 5. 递增邀请码核销次数
    await db.execute(
      "UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = ?",
      invitation.id
    );

    // 6. 审计日志
    await recordAuditLog(db, {
      orgId: invitation.org_id,
      userId,
      userName,
      action: "invite_accepted",
      targetId: userId,
      details: { code, role: invitation.role, email },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    // 7. 发放会话 Cookie 实现一键登录
    const { token, tokenHash } = await generateSessionToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = now + SESSION_TTL_MS;

    await db.execute(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      userId,
      tokenHash,
      request.headers.get("CF-Connecting-IP") || null,
      request.headers.get("User-Agent") || null,
      expiresAt,
      now
    );

    const cookieHeader = createSessionCookie(token, SESSION_TTL_MS / 1000);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          orgId: invitation.org_id,
          email,
          name: userName,
          role: invitation.role,
          status: "active",
        },
        organization: {
          id: org.id,
          name: org.name,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(`Failed to accept invitation: ${message}`, 500);
  }
}
