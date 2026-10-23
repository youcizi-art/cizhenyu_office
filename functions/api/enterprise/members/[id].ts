import { getDb } from "../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../utils";
import { PagesContext, OrgRole } from "../../../types";

interface TargetUserRow {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

/**
 * 成员角色修改与移除 (PUT / DELETE)
 */
export async function onRequestPut(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const targetUserId = params.id as string;

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  // 必须是 admin 或 owner 才有权限操作
  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Administrator privileges required", 403);
  }

  let body: {
    role?: OrgRole;
    status?: "active" | "disabled";
    name?: string;
    departmentId?: string | null;
    roleGroupIds?: string[];
    docPermissions?: { documentId: string; permission: "owner" | "editor" | "commenter" | "viewer" }[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  try {
    const db = getDb(env);

    // 查询目标成员
    const targetUser = await db.queryOne<TargetUserRow>(
      "SELECT id, org_id, email, name, role, status FROM users WHERE id = ? AND org_id = ? LIMIT 1",
      targetUserId,
      session.org.id
    );

    if (!targetUser) {
      return errorResponse("Member not found in current organization", 404);
    }

    // 不能降权自己或修改自己的角色
    if (targetUser.id === session.user.id && body.role && body.role !== session.user.role) {
      return errorResponse("Cannot modify your own organizational role", 400);
    }

    // 只有 owner 才能修改 owner 账号或赋予 owner 角色
    if (
      (targetUser.role === "owner" || body.role === "owner") &&
      session.user.role !== "owner"
    ) {
      return errorResponse("Forbidden: Only organization owner can manage owner roles", 403);
    }

    const updates: string[] = ["updated_at = ?"];
    const values: unknown[] = [Date.now()];

    if (body.role) {
      updates.push("role = ?");
      values.push(body.role);
    }
    if (body.status) {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name.trim());
    }
    if (body.departmentId !== undefined) {
      updates.push("department_id = ?");
      values.push(body.departmentId || null);
    }

    values.push(targetUserId);
    await db.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...values);

    // 如果传入了 roleGroupIds，同步更新 user_role_groups
    if (Array.isArray(body.roleGroupIds)) {
      await db.execute("DELETE FROM user_role_groups WHERE user_id = ? AND org_id = ?", targetUserId, session.org.id);
      const now = Date.now();
      for (const gid of body.roleGroupIds) {
        if (typeof gid === "string" && gid.trim()) {
          const ugId = crypto.randomUUID();
          await db.execute(
            `INSERT OR IGNORE INTO user_role_groups (id, org_id, user_id, role_group_id, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ugId,
            session.org.id,
            targetUserId,
            gid.trim(),
            now
          );
        }
      }
    }

    // 如果传入了 docPermissions，同步更新 document_permissions
    if (Array.isArray(body.docPermissions)) {
      await db.execute("DELETE FROM document_permissions WHERE user_id = ?", targetUserId);
      const now = Date.now();
      for (const dp of body.docPermissions) {
        if (dp && dp.documentId && dp.permission) {
          const permId = crypto.randomUUID();
          await db.execute(
            `INSERT OR REPLACE INTO document_permissions (id, document_id, user_id, permission, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            permId,
            dp.documentId.trim(),
            targetUserId,
            dp.permission,
            now,
            now
          );
        }
      }
    }

    // 如果状态变为 disabled，物理清理该成员当前所有有效 Session
    if (body.status === "disabled") {
      await db.execute("DELETE FROM user_sessions WHERE user_id = ?", targetUserId);
    }

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "member_update",
      targetId: targetUserId,
      details: body,
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({
      success: true,
      message: "Member updated successfully",
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to update member", 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const targetUserId = params.id as string;

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  // 必须是 admin 或 owner 才有权限操作
  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Administrator privileges required", 403);
  }

  if (targetUserId === session.user.id) {
    return errorResponse("Cannot remove yourself from the organization", 400);
  }

  try {
    const db = getDb(env);

    const targetUser = await db.queryOne<TargetUserRow>(
      "SELECT id, email, name, role FROM users WHERE id = ? AND org_id = ? LIMIT 1",
      targetUserId,
      session.org.id
    );

    if (!targetUser) {
      return errorResponse("Member not found", 404);
    }

    if (targetUser.role === "owner" && session.user.role !== "owner") {
      return errorResponse("Forbidden: Cannot remove the organization owner", 403);
    }

    // 物理级联删除用户及其相关 session、文档权限
    await db.execute("DELETE FROM user_sessions WHERE user_id = ?", targetUserId);
    await db.execute("DELETE FROM document_permissions WHERE user_id = ?", targetUserId);
    await db.execute("DELETE FROM users WHERE id = ?", targetUserId);

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "member_delete",
      targetId: targetUserId,
      details: { email: targetUser.email, name: targetUser.name },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({
      success: true,
      message: "Member removed from organization",
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to remove member", 500);
  }
}
