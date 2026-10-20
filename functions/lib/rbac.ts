import { getDb, DatabaseClient } from "./db";
import { sha256Hex } from "./auth-crypto";
import { EnterpriseUser, EnterpriseOrg, OrgRole, DocPermission, Env } from "../types";

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

    const sql = `
      SELECT 
        s.id AS sessionId,
        s.expires_at AS expiresAt,
        u.id AS userId,
        u.org_id AS orgId,
        u.email AS email,
        u.name AS name,
        u.avatar AS avatar,
        u.role AS role,
        u.status AS status,
        u.created_at AS userCreatedAt,
        u.updated_at AS userUpdatedAt,
        o.name AS orgName,
        o.logo_url AS orgLogoUrl,
        o.max_seats AS orgMaxSeats,
        o.created_at AS orgCreatedAt,
        o.updated_at AS orgUpdatedAt
      FROM user_sessions s
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN organizations o ON u.org_id = o.id
      WHERE s.token_hash = ? AND s.expires_at > ?
      LIMIT 1
    `;

    const item = await db.queryOne<{
      sessionId: string;
      expiresAt: number;
      userId: string;
      orgId: string;
      email: string;
      name: string;
      avatar: string | null;
      role: string;
      status: string;
      userCreatedAt: number;
      userUpdatedAt: number;
      orgName: string;
      orgLogoUrl: string | null;
      orgMaxSeats: number;
      orgCreatedAt: number;
      orgUpdatedAt: number;
    }>(sql, tokenHash, now);

    if (!item) {
      return null;
    }

    if (item.status !== "active") {
      return null; // 用户已被禁用
    }

    // 滑动续期
    if (item.expiresAt - now < SLIDING_RENEWAL_WINDOW_MS) {
      const newExpiresAt = now + SESSION_TTL_MS;
      await db.execute(
        "UPDATE user_sessions SET expires_at = ? WHERE id = ?",
        newExpiresAt,
        item.sessionId
      );
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
  db: DatabaseClient,
  docId: string,
  user: EnterpriseUser
): Promise<DocPermission | null> {
  // 1. 若用户是企业 owner 或 admin，自动拥有最高 owner 权限
  if (user.role === "owner" || user.role === "admin") {
    return "owner";
  }

  // 2. 查询 ACL 表
  const row = await db.queryOne<{ permission: string }>(
    "SELECT permission FROM document_permissions WHERE document_id = ? AND user_id = ? LIMIT 1",
    docId,
    user.id
  );

  if (row && row.permission) {
    return row.permission as DocPermission;
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
  db: DatabaseClient,
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
    await db.execute(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, action, target_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      params.orgId,
      params.userId || null,
      params.userName || null,
      params.action,
      params.targetId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      Date.now()
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
