import { getDb } from "../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../lib/rbac";
import { hashPassword } from "../../../lib/auth-crypto";
import { jsonResponse, errorResponse } from "../../../utils";
import { PagesContext, OrgRole } from "../../../types";

interface MemberRow {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  status: string;
  created_at: number;
  updated_at: number;
}

/**
 * 企业成员列表与新增成员 (GET / POST)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  try {
    const db = getDb(env);
    const rows = await db.queryAll<MemberRow>(
      "SELECT id, email, name, avatar, role, status, created_at, updated_at FROM users WHERE org_id = ?",
      session.org.id
    );

    const members = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      avatar: r.avatar,
      role: r.role as OrgRole,
      status: r.status as "active" | "disabled" | "invited",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return jsonResponse({
      success: true,
      members,
      org: session.org,
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to fetch members", 500);
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  // 必须是 admin 或 owner 才有权限新增成员
  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Administrator privileges required", 403);
  }

  let body: {
    email?: string;
    name?: string;
    role?: OrgRole;
    password?: string;
    roleGroupIds?: string[];
    docPermissions?: { documentId: string; permission: "owner" | "editor" | "commenter" | "viewer" }[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const role = body.role || "member";
  const initialPassword = (body.password || "").trim();
  const roleGroupIds = Array.isArray(body.roleGroupIds) ? body.roleGroupIds : [];
  const docPermissions = Array.isArray(body.docPermissions) ? body.docPermissions : [];

  if (!email || !initialPassword) {
    return errorResponse("Email and password are required", 400);
  }

  // 只有 owner 才能直接创建 admin
  if (role === "owner" || (role === "admin" && session.user.role !== "owner")) {
    return errorResponse("Forbidden: Insufficient permissions to grant this role", 403);
  }

  try {
    const db = getDb(env);

    // 1. 席位上限校验
    const countRow = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE org_id = ?",
      session.org.id
    );
    const currentCount = countRow ? countRow.count : 0;

    if (currentCount >= session.org.maxSeats) {
      return errorResponse(
        `Seat limit exceeded: Organization maximum seats is ${session.org.maxSeats}`,
        400
      );
    }

    // 2. 邮箱重复校验
    const existing = await db.queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      email
    );

    if (existing) {
      return errorResponse("User with this email already exists", 409);
    }

    // 3. 密码加盐哈希并落库
    const { hash, salt } = await hashPassword(initialPassword);
    const newUserId = crypto.randomUUID();
    const now = Date.now();

    await db.execute(
      `INSERT INTO users (id, org_id, email, password_hash, salt, name, avatar, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newUserId,
      session.org.id,
      email,
      hash,
      salt,
      name || email.split("@")[0],
      null,
      role,
      "active",
      now,
      now
    );

    // 4. 若传入了角色组绑定，写入 user_role_groups
    for (const gid of roleGroupIds) {
      if (typeof gid === "string" && gid.trim()) {
        const ugId = crypto.randomUUID();
        await db.execute(
          `INSERT OR IGNORE INTO user_role_groups (id, org_id, user_id, role_group_id, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          ugId,
          session.org.id,
          newUserId,
          gid.trim(),
          now
        );
      }
    }

    // 4.5 若传入了单一文档的专属权限设置，写入 document_permissions 表
    for (const dp of docPermissions) {
      if (dp && dp.documentId && dp.permission) {
        const permId = crypto.randomUUID();
        await db.execute(
          `INSERT OR REPLACE INTO document_permissions (id, document_id, user_id, permission, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          permId,
          dp.documentId.trim(),
          newUserId,
          dp.permission,
          now,
          now
        );
      }
    }

    // 5. 记录审计日志
    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "member_add",
      targetId: newUserId,
      details: { email, role, roleGroupIds, docPermissionsCount: docPermissions.length },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse(
      {
        success: true,
        member: {
          id: newUserId,
          email,
          name: name || email.split("@")[0],
          role,
          status: "active",
          createdAt: now,
        },
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || "Failed to add member", 500);
  }
}
