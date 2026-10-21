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
