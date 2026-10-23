import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 角色组列表与创建接口 (/api/permissions/role-groups)
 * GET: 获取当前组织的所有角色组列表
 * POST: 创建新的角色组 (仅 Admin/Owner)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const db = getDb(env);
    const groups = await db.query<{
      id: string;
      org_id: string;
      name: string;
      description: string | null;
      is_system: number;
      created_at: number;
      updated_at: number;
    }>(
      "SELECT * FROM role_groups WHERE org_id = ? ORDER BY is_system DESC, created_at ASC",
      session.org.id
    );

    // 统计各角色组成员数量
    const memberCounts = await db.query<{ role_group_id: string; count: number }>(
      "SELECT role_group_id, COUNT(*) as count FROM user_role_groups WHERE org_id = ? GROUP BY role_group_id",
      session.org.id
    );
    const countMap = new Map(memberCounts.map((m) => [m.role_group_id, m.count]));

    const formatted = groups.map((g) => ({
      id: g.id,
      orgId: g.org_id,
      name: g.name,
      description: g.description,
      isSystem: Boolean(g.is_system),
      memberCount: countMap.get(g.id) || 0,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));

    return jsonResponse({ success: true, data: formatted });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch role groups", 500);
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

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const name = (body.name || "").trim();
  if (!name) return errorResponse("Role group name is required", 400);

  try {
    const db = getDb(env);
    const now = Date.now();
    const groupId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO role_groups (id, org_id, name, description, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      groupId,
      session.org.id,
      name,
      body.description ? body.description.trim() : null,
      now,
      now
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "role_group_created",
      targetId: groupId,
      details: { name },
    });

    return jsonResponse({
      success: true,
      data: {
        id: groupId,
        orgId: session.org.id,
        name,
        description: body.description || null,
        isSystem: false,
        memberCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to create role group", 500);
  }
}

/**
 * PUT: 编辑角色组 (支持编辑所有角色组，包含默认组的名字与描述)
 */
export async function onRequestPut(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  let body: { id?: string; name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const id = (body.id || "").trim();
  const name = (body.name || "").trim();
  if (!id || !name) {
    return errorResponse("Role group ID and Name are required", 400);
  }

  try {
    const db = getDb(env);
    const existing = await db.queryOne<{ id: string; org_id: string; is_system: number }>(
      "SELECT id, org_id, is_system FROM role_groups WHERE id = ? AND org_id = ?",
      id,
      session.org.id
    );

    if (!existing) {
      return errorResponse("Role group not found", 404);
    }

    const now = Date.now();
    await db.execute(
      `UPDATE role_groups SET name = ?, description = ?, updated_at = ? WHERE id = ? AND org_id = ?`,
      name,
      body.description ? body.description.trim() : null,
      now,
      id,
      session.org.id
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "role_group_updated",
      targetId: id,
      details: { name, description: body.description },
    });

    return jsonResponse({
      success: true,
      data: {
        id,
        orgId: session.org.id,
        name,
        description: body.description || null,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update role group", 500);
  }
}

/**
 * DELETE: 删除角色组 (级联清理 user_role_groups 与 permission_rules)
 */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return errorResponse("Role group ID is required", 400);
  }

  try {
    const db = getDb(env);
    const existing = await db.queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM role_groups WHERE id = ? AND org_id = ?",
      id,
      session.org.id
    );

    if (!existing) {
      return errorResponse("Role group not found", 404);
    }

    // 校验该角色组下是否有挂载的用户
    const userCountRow = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM user_role_groups WHERE role_group_id = ? AND org_id = ?",
      id,
      session.org.id
    );

    if (userCountRow && userCountRow.count > 0) {
      return errorResponse(
        `Cannot delete role group: There are ${userCountRow.count} member(s) currently assigned to this role group. Please reassign or remove them first.`,
        400
      );
    }

    // 清理规则与角色组实体
    await db.execute("DELETE FROM permission_rules WHERE role_group_id = ? AND org_id = ?", id, session.org.id);
    await db.execute("DELETE FROM role_groups WHERE id = ? AND org_id = ?", id, session.org.id);

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "role_group_deleted",
      targetId: id,
      details: { name: existing.name },
    });

    return jsonResponse({ success: true, deletedId: id });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete role group", 500);
  }
}

