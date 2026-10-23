import { getDb } from "../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../utils";
import { PagesContext } from "../../../types";

export interface DepartmentRow {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  order: number;
  created_at: number;
  updated_at: number;
}

/**
 * 获取组织所有部门 (GET)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const db = getDb(env);
    const rows = await db.query<DepartmentRow>(
      'SELECT id, org_id, name, parent_id, "order", created_at, updated_at FROM departments WHERE org_id = ? ORDER BY "order" ASC, created_at ASC',
      session.org.id
    );

    // 统计各部门人数
    const memberCounts = await db.query<{ department_id: string; count: number }>(
      "SELECT department_id, COUNT(*) as count FROM users WHERE org_id = ? AND department_id IS NOT NULL GROUP BY department_id",
      session.org.id
    );
    const countMap = new Map(memberCounts.map((m) => [m.department_id, m.count]));

    const departments = rows.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      name: r.name,
      parentId: r.parent_id,
      order: r.order,
      memberCount: countMap.get(r.id) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return jsonResponse({ success: true, departments });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch departments", 500);
  }
}

/**
 * 创建新部门 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  let body: { name?: string; parentId?: string | null };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const name = (body.name || "").trim();
  if (!name) return errorResponse("Department name cannot be empty", 400);

  try {
    const db = getDb(env);
    const parentId = body.parentId || null;

    if (parentId) {
      const parent = await db.queryOne<{ id: string }>(
        "SELECT id FROM departments WHERE id = ? AND org_id = ? LIMIT 1",
        parentId,
        session.org.id
      );
      if (!parent) {
        return errorResponse("Specified parent department not found", 404);
      }
    }

    const now = Date.now();
    const id = crypto.randomUUID();

    await db.execute(
      'INSERT INTO departments (id, org_id, name, parent_id, "order", created_at, updated_at) VALUES (?, ?, ?, ?, 999999, ?, ?)',
      id,
      session.org.id,
      name,
      parentId,
      now,
      now
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "dept_create",
      targetId: id,
      details: { name, parentId },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse(
      {
        success: true,
        department: {
          id,
          orgId: session.org.id,
          name,
          parentId,
          order: 999999,
          memberCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      201
    );
  } catch (error: any) {
    return errorResponse(error.message || "Failed to create department", 500);
  }
}
