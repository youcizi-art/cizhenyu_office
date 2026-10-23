import { getDb } from "../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../utils";
import { PagesContext } from "../../../types";

/**
 * 部门更新（PATCH）与删除（DELETE） (/api/enterprise/departments/[id])
 */
export async function onRequestPatch(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  const deptId = params.id as string;
  let body: { name?: string; parentId?: string | null; order?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  try {
    const db = getDb(env);
    const existing = await db.queryOne<{ id: string; name: string; parent_id: string | null }>(
      "SELECT id, name, parent_id FROM departments WHERE id = ? AND org_id = ? LIMIT 1",
      deptId,
      session.org.id
    );

    if (!existing) {
      return errorResponse("Department not found", 404);
    }

    const updates: string[] = ["updated_at = ?"];
    const values: unknown[] = [Date.now()];

    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) return errorResponse("Department name cannot be empty", 400);
      updates.push("name = ?");
      values.push(trimmed);
    }

    if (body.parentId !== undefined) {
      if (body.parentId === deptId) {
        return errorResponse("Cannot set a department as its own parent", 400);
      }
      if (body.parentId) {
        const parent = await db.queryOne<{ id: string }>(
          "SELECT id FROM departments WHERE id = ? AND org_id = ? LIMIT 1",
          body.parentId,
          session.org.id
        );
        if (!parent) return errorResponse("Specified parent department not found", 404);
      }
      updates.push("parent_id = ?");
      values.push(body.parentId || null);
    }

    if (body.order !== undefined) {
      updates.push('"order" = ?');
      values.push(Number(body.order) || 0);
    }

    values.push(deptId, session.org.id);
    await db.execute(
      `UPDATE departments SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`,
      ...values
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "dept_update",
      targetId: deptId,
      details: body,
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({ success: true, message: "Department updated successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update department", 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  const deptId = params.id as string;

  try {
    const db = getDb(env);
    const existing = await db.queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM departments WHERE id = ? AND org_id = ? LIMIT 1",
      deptId,
      session.org.id
    );

    if (!existing) {
      return errorResponse("Department not found", 404);
    }

    // 递归查找当前部门及其所有子部门 ID
    const allDepts = await db.query<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM departments WHERE org_id = ?",
      session.org.id
    );

    const toDeleteIds = new Set<string>([deptId]);
    let added = true;
    while (added) {
      added = false;
      for (const d of allDepts) {
        if (d.parent_id && toDeleteIds.has(d.parent_id) && !toDeleteIds.has(d.id)) {
          toDeleteIds.add(d.id);
          added = true;
        }
      }
    }

    // 解除被删除部门下所有用户的 department_id 绑定（设为 null）
    for (const did of toDeleteIds) {
      await db.execute("UPDATE users SET department_id = NULL WHERE department_id = ? AND org_id = ?", did, session.org.id);
      await db.execute("DELETE FROM departments WHERE id = ? AND org_id = ?", did, session.org.id);
    }

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "dept_delete",
      targetId: deptId,
      details: { name: existing.name, deletedCount: toDeleteIds.size },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({ success: true, deletedIds: Array.from(toDeleteIds) });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete department", 500);
  }
}
