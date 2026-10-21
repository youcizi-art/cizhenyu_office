import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";
import { PermissionScopeType, DocumentAction } from "../../lib/permission-types";

/**
 * 权限规则管理接口 (/api/permissions/rules)
 * GET: 获取指定角色组的权限规则列表 ?roleGroupId=xxx
 * POST: 新增或更新规则
 * DELETE: 删除指定规则 ?id=xxx
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const roleGroupId = url.searchParams.get("roleGroupId");
  if (!roleGroupId) return errorResponse("roleGroupId is required", 400);

  try {
    const db = getDb(env);
    const rules = await db.query<{
      id: string;
      org_id: string;
      role_group_id: string;
      scope_type: PermissionScopeType;
      scope_id: string;
      allow_actions: string;
      deny_actions: string;
      created_at: number;
      updated_at: number;
    }>(
      "SELECT * FROM permission_rules WHERE role_group_id = ? AND org_id = ? ORDER BY created_at ASC",
      roleGroupId,
      session.org.id
    );

    const formatted = rules.map((r) => ({
      id: r.id,
      roleGroupId: r.role_group_id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      allowActions: JSON.parse(r.allow_actions || "[]"),
      denyActions: JSON.parse(r.deny_actions || "[]"),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return jsonResponse({ success: true, data: formatted });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch rules", 500);
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

  let body: {
    roleGroupId: string;
    scopeType: PermissionScopeType;
    scopeId: string;
    allowActions: DocumentAction[];
    denyActions: DocumentAction[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  if (!body.roleGroupId || !body.scopeType || !body.scopeId) {
    return errorResponse("roleGroupId, scopeType, and scopeId are required", 400);
  }

  try {
    const db = getDb(env);
    const now = Date.now();
    const ruleId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO permission_rules (id, org_id, role_group_id, scope_type, scope_id, allow_actions, deny_actions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ruleId,
      session.org.id,
      body.roleGroupId,
      body.scopeType,
      body.scopeId,
      JSON.stringify(body.allowActions || []),
      JSON.stringify(body.denyActions || []),
      now,
      now
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "permission_rule_created",
      targetId: ruleId,
      details: {
        roleGroupId: body.roleGroupId,
        scopeType: body.scopeType,
        scopeId: body.scopeId,
        allows: body.allowActions,
        denies: body.denyActions,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        id: ruleId,
        roleGroupId: body.roleGroupId,
        scopeType: body.scopeType,
        scopeId: body.scopeId,
        allowActions: body.allowActions || [],
        denyActions: body.denyActions || [],
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to create rule", 500);
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
  const ruleId = url.searchParams.get("id");
  if (!ruleId) return errorResponse("Rule id is required", 400);

  try {
    const db = getDb(env);
    await db.execute("DELETE FROM permission_rules WHERE id = ? AND org_id = ?", ruleId, session.org.id);

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "permission_rule_deleted",
      targetId: ruleId,
    });

    return jsonResponse({ success: true, message: "Rule deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete rule", 500);
  }
}
