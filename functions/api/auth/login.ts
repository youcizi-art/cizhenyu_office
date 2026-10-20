import { getDb } from "../../lib/db";
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  createSessionCookie,
} from "../../lib/auth-crypto";
import { recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext, OrgRole } from "../../types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

interface UserRow {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  avatar: string | null;
  role: string;
  status: string;
  created_at: number;
  updated_at: number;
}

/**
 * 企业版用户登录与组织首次初始化 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return errorResponse("Cloudflare D1 Database binding 'DB' is not configured", 500);
  }

  let body: { email?: string; password?: string; orgName?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();

  if (!email || !password) {
    return errorResponse("Email and password are required", 400);
  }

  try {
    const db = getDb(env);
    const now = Date.now();

    // 1. 检查是否存在该用户
    let targetUser = await db.queryOne<UserRow>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      email
    );

    // 2. 冷启动智能引导：如果系统没有任何用户，且当前是初次登录，自动注册为超级所有者 (Owner)
    if (!targetUser) {
      const anyUser = await db.queryOne<{ id: string }>("SELECT id FROM users LIMIT 1");
      if (!anyUser) {
        // 创建默认企业组织
        const orgId = crypto.randomUUID();
        const orgName = (body.orgName || "CIZHENYU Enterprise").trim();
        await db.execute(
          "INSERT INTO organizations (id, name, logo_url, max_seats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          orgId,
          orgName,
          null,
          50,
          now,
          now
        );

        // 创建首位所有者用户
        const userId = crypto.randomUUID();
        const { hash, salt } = await hashPassword(password);
        const userName = (body.name || email.split("@")[0] || "Admin").trim();

        await db.execute(
          `INSERT INTO users (id, org_id, email, password_hash, salt, name, avatar, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          userId,
          orgId,
          email,
          hash,
          salt,
          userName,
          null,
          "owner",
          "active",
          now,
          now
        );

        targetUser = {
          id: userId,
          org_id: orgId,
          email,
          password_hash: hash,
          salt,
          name: userName,
          avatar: null,
          role: "owner",
          status: "active",
          created_at: now,
          updated_at: now,
        };
      } else {
        return errorResponse("Invalid email or password", 401);
      }
    }

    // 3. 校验账号状态
    if (targetUser.status !== "active") {
      return errorResponse("Account has been disabled or is pending activation", 403);
    }

    // 4. 校验密码哈希
    const isPasswordValid = await verifyPassword(
      password,
      targetUser.password_hash,
      targetUser.salt
    );
    if (!isPasswordValid) {
      return errorResponse("Invalid email or password", 401);
    }

    // 5. 生成 Session Token 与 Hash
    const { token, tokenHash } = await generateSessionToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = now + SESSION_TTL_MS;
    const clientIp = request.headers.get("CF-Connecting-IP") || undefined;
    const userAgent = request.headers.get("User-Agent") || undefined;

    await db.execute(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      targetUser.id,
      tokenHash,
      clientIp || null,
      userAgent || null,
      expiresAt,
      now
    );

    // 6. 获取组织信息
    const org = (await db.queryOne<{ id: string; name: string; logo_url: string | null; max_seats: number }>(
      "SELECT id, name, logo_url, max_seats FROM organizations WHERE id = ? LIMIT 1",
      targetUser.org_id
    )) || {
      id: targetUser.org_id,
      name: "Enterprise",
      logo_url: null,
      max_seats: 20,
    };

    // 7. 写入审计日志
    await recordAuditLog(db, {
      orgId: targetUser.org_id,
      userId: targetUser.id,
      userName: targetUser.name,
      action: "user_login",
      ipAddress: clientIp,
      details: { email: targetUser.email },
    });

    // 8. 构造 HttpOnly 安全 Cookie 响应
    const cookieHeader = createSessionCookie(token, expiresAt);
    return jsonResponse(
      {
        success: true,
        token,
        user: {
          id: targetUser.id,
          orgId: targetUser.org_id,
          email: targetUser.email,
          name: targetUser.name,
          avatar: targetUser.avatar,
          role: targetUser.role as OrgRole,
        },
        org: {
          id: org.id,
          name: org.name,
          logoUrl: org.logo_url,
          maxSeats: org.max_seats,
        },
      },
      200,
      {
        "Set-Cookie": cookieHeader,
      }
    );
  } catch (error: any) {
    console.error("Enterprise login failed:", error);
    return errorResponse(error.message || "Login failed due to internal error", 500);
  }
}
