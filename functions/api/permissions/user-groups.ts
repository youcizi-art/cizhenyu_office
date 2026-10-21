import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 用户角色组成员分配接口 (/api/permissions/user-groups)
 * GET: 获取指定用户拥有的角色组列表 ?userId=xxx
 * POST: 给用户分配角色组 { userId, roleGroupId }
 * DELETE: 移除用户的角色组关联 ?userId=xxx&roleGroupId=xxx
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || session.user.id;

  try {
    const db = getDb(env);
    const groups = await db.query<{
      id: string;
      name: string;
      description: string | null;
      is_system: number;
    }>(
      `SELECT g.id, g.name, g.description, g.is_system
       FROM role_groups g
       INNER JOIN user_role_groups urg ON urg.role_group_id = g.id
       WHERE urg.user_id = ? AND urg.org_id = ?`,
      userId,
      session.org.id
    );

    return jsonResponse({
      success: true,
      data: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        isSystem: Boolean(g.is_system),
      })),
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch user groups", 500);
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  let body: { userId: string; roleGroupId: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  if (!body.userId || !body.roleGroupId) {
    return errorResponse("userId and roleGroupId are required", 400);
  }

  try {
    const db = getDb(env);
    const now = Date.now();
    const id = crypto.randomUUID();

    await db.execute(
      `INSERT OR IGNORE INTO user_role_groups (id, org_id, user_id, role_group_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      session.org.id,
      body.userId,
      body.roleGroupId,
      now
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "user_role_group_assigned",
      targetId: body.userId,
      details: { roleGroupId: body.roleGroupId },
    });

    return jsonResponse({ success: true, message: "User assigned to role group" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to assign role group", 500);
  }
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const roleGroupId = url.searchParams.get("roleGroupId");

  if (!userId || !roleGroupId) {
    return errorResponse("userId and roleGroupId are required", 400);
  }

  try {
    const db = getDb(env);
    await db.execute(
      "DELETE FROM user_role_groups WHERE user_id = ? AND role_group_id = ? AND org_id = ?",
      userId,
      roleGroupId,
      session.org.id
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "user_role_group_removed",
      targetId: userId,
      details: { roleGroupId },
    });

    return jsonResponse({ success: true, message: "Role group removed from user" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to remove role group", 500);
  }
}
