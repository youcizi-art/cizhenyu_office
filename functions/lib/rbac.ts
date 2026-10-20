import { eq, and, gt } from "drizzle-orm";
import { getDb, schema, AppDatabase } from "./db";
import { sha256Hex } from "./auth-crypto";
import { PagesContext, EnterpriseUser, EnterpriseOrg, OrgRole, DocPermission, Env } from "../types";

const ROLE_RANKS: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

const PERMISSION_RANKS: Record<DocPermission, number> = {
  owner: 4,
  editor: 3,
  commenter: 2,
  viewer: 1,
};

const SESSION_COOKIE_NAME = "office_enterprise_session";
const SLIDING_RENEWAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 天内活跃则自动滑动续期 30 天
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionAuthResult {
  user: EnterpriseUser;
  org: EnterpriseOrg;
  sessionId: string;
}

/**
 * 从请求头或 Cookie 中解析企业会话 Token
 */
export function extractSessionToken(request: Request): string | null {
  // 1. Authorization Bearer
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 2. Cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * 校验企业会话并获取当前活跃用户信息与企业组织
 */
export async function getEnterpriseSession(
  request: Request,
  env: Env
): Promise<SessionAuthResult | null> {
  const token = extractSessionToken(request);
  if (!token) return null;

  try {
    const db = getDb(env);
    const tokenHash = await sha256Hex(token);
    const now = Date.now();

    // 联合查询 session、user 与 organization
    const sessions = await db
      .select({
        sessionId: schema.userSessions.id,
        expiresAt: schema.userSessions.expiresAt,
        userId: schema.users.id,
        orgId: schema.users.orgId,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        role: schema.users.role,
        status: schema.users.status,
        userCreatedAt: schema.users.createdAt,
        userUpdatedAt: schema.users.updatedAt,
        orgName: schema.organizations.name,
        orgLogoUrl: schema.organizations.logoUrl,
        orgMaxSeats: schema.organizations.maxSeats,
        orgCreatedAt: schema.organizations.createdAt,
        orgUpdatedAt: schema.organizations.updatedAt,
      })
      .from(schema.userSessions)
      .innerJoin(schema.users, eq(schema.userSessions.userId, schema.users.id))
      .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
      .where(
        and(
          eq(schema.userSessions.tokenHash, tokenHash),
          gt(schema.userSessions.expiresAt, now)
        )
      )
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return null;
    }

    const item = sessions[0];
    if (item.status !== "active") {
      return null; // 用户已处于非活跃或被禁用状态
    }

    // 智能滑动续期：若会话剩余时间小于 7 天，延长至 30 天
    if (item.expiresAt - now < SLIDING_RENEWAL_WINDOW_MS) {
      const newExpiresAt = now + SESSION_TTL_MS;
      await db
        .update(schema.userSessions)
        .set({ expiresAt: newExpiresAt })
        .where(eq(schema.userSessions.id, item.sessionId));
    }

    const user: EnterpriseUser = {
      id: item.userId,
      orgId: item.orgId,
      email: item.email,
      name: item.name,
      avatar: item.avatar,
      role: item.role as OrgRole,
      status: item.status as "active" | "disabled" | "invited",
      createdAt: item.userCreatedAt,
      updatedAt: item.userUpdatedAt,
    };

    const org: EnterpriseOrg = {
      id: item.orgId,
      name: item.orgName,
      logoUrl: item.orgLogoUrl,
      maxSeats: item.orgMaxSeats,
      createdAt: item.orgCreatedAt,
      updatedAt: item.orgUpdatedAt,
    };

    return { user, org, sessionId: item.sessionId };
  } catch (error) {
    console.error("Failed to verify enterprise session:", error);
    return null;
  }
}

/**
 * 校验组织级别角色是否满足最低角色级别
 */
export function assertOrgRole(userRole: OrgRole, minRole: OrgRole): boolean {
  return (ROLE_RANKS[userRole] || 0) >= (ROLE_RANKS[minRole] || 0);
}

/**
 * 获取用户对指定文档的 ACL 权限
 */
export async function getDocumentPermission(
  db: AppDatabase,
  docId: string,
  user: EnterpriseUser
): Promise<DocPermission | null> {
  // 1. 若用户是企业 owner 或 admin，自动拥有该文档的 owner 最高权限
  if (user.role === "owner" || user.role === "admin") {
    return "owner";
  }

  // 2. 从 document_permissions 表检索专属授权
  const perms = await db
    .select({
      permission: schema.documentPermissions.permission,
    })
    .from(schema.documentPermissions)
    .where(
      and(
        eq(schema.documentPermissions.documentId, docId),
        eq(schema.documentPermissions.userId, user.id)
      )
    )
    .limit(1);

  if (perms && perms.length > 0) {
    return perms[0].permission as DocPermission;
  }

  return null;
}

/**
 * 判定权限是否允许执行目标操作
 */
export function canUserPerform(
  permission: DocPermission | null,
  action: "read" | "comment" | "write" | "admin"
): boolean {
  if (!permission) return false;
  const rank = PERMISSION_RANKS[permission] || 0;

  switch (action) {
    case "admin":
      return rank >= 4;
    case "write":
      return rank >= 3;
    case "comment":
      return rank >= 2;
    case "read":
      return rank >= 1;
    default:
      return false;
  }
}

/**
 * 写入合规审计日志
 */
export async function recordAuditLog(
  db: AppDatabase,
  params: {
    orgId: string;
    userId?: string;
    userName?: string;
    action: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      orgId: params.orgId,
      userId: params.userId || null,
      userName: params.userName || null,
      action: params.action,
      targetId: params.targetId || null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || null,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
