import { eq } from "drizzle-orm";
import { getDb, schema } from "../../lib/db";
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  createSessionCookie,
} from "../../lib/auth-crypto";
import { recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

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
    const foundUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    let targetUser = foundUsers[0];

    // 2. 冷启动智能引导：如果系统没有任何用户，且当前是初次登录，自动注册为超级所有者 (Owner)
    if (!targetUser) {
      const allUsersCount = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
      if (allUsersCount.length === 0) {
        // 创建默认企业组织
        const orgId = crypto.randomUUID();
        const orgName = (body.orgName || "CIZHENYU Enterprise").trim();
        await db.insert(schema.organizations).values({
          id: orgId,
          name: orgName,
          logoUrl: null,
          maxSeats: 50,
          createdAt: now,
          updatedAt: now,
        });

        // 创建首位所有者用户
        const userId = crypto.randomUUID();
        const { hash, salt } = await hashPassword(password);
        const userName = (body.name || email.split("@")[0] || "Admin").trim();

        await db.insert(schema.users).values({
          id: userId,
          orgId,
          email,
          passwordHash: hash,
          salt,
          name: userName,
          avatar: null,
          role: "owner",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });

        targetUser = {
          id: userId,
          orgId,
          email,
          passwordHash: hash,
          salt,
          name: userName,
          avatar: null,
          role: "owner",
          status: "active",
          createdAt: now,
          updatedAt: now,
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
      targetUser.passwordHash,
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

    await db.insert(schema.userSessions).values({
      id: sessionId,
      userId: targetUser.id,
      tokenHash,
      ipAddress: clientIp,
      userAgent,
      expiresAt,
      createdAt: now,
    });

    // 6. 获取组织信息
    const orgs = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, targetUser.orgId))
      .limit(1);

    const org = orgs[0] || {
      id: targetUser.orgId,
      name: "Enterprise",
      logoUrl: null,
      maxSeats: 20,
      createdAt: now,
      updatedAt: now,
    };

    // 7. 写入审计日志
    await recordAuditLog(db, {
      orgId: targetUser.orgId,
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
          orgId: targetUser.orgId,
          email: targetUser.email,
          name: targetUser.name,
          avatar: targetUser.avatar,
          role: targetUser.role,
        },
        org: {
          id: org.id,
          name: org.name,
          logoUrl: org.logoUrl,
          maxSeats: org.maxSeats,
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
