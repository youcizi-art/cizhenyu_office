import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

interface AuditLogRow {
  id: string;
  org_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: number;
}

/**
 * GET /api/enterprise/audit-logs
 * 分页检索企业合规审计日志，支持按 action、user、时间范围及关键词搜索
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  // 仅限管理员/所有者查看企业合规审计日志
  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Requires organization administrator privileges", 403);
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));
  const actionFilter = url.searchParams.get("action") || "";
  const search = url.searchParams.get("search")?.trim() || "";
  const offset = (page - 1) * pageSize;

  try {
    const db = getDb(env);

    // 自动清理机制：静默清理当前组织超过 90 天（3个月）且非安全告警类操作的常规日志
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    try {
      await db.execute(
        `DELETE FROM audit_logs 
         WHERE org_id = ? 
           AND created_at < ? 
           AND action NOT IN ('lock_force_takeover', 'auth_login_failed', 'security_violation')`,
        session.org.id,
        ninetyDaysAgo
      );
    } catch {
      // 容错静默
    }

    const conditions: string[] = ["org_id = ?"];
    const params: unknown[] = [session.org.id];

    if (actionFilter) {
      conditions.push("action = ?");
      params.push(actionFilter);
    }

    if (search) {
      conditions.push("(user_name LIKE ? OR details LIKE ? OR target_id LIKE ? OR ip_address LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.join(" AND ");

    // 统计总数
    const countSql = `SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereClause}`;
    const totalRow = await db.queryOne<{ total: number }>(countSql, ...params);
    const total = totalRow?.total || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    // 分页查询日志详情
    const listSql = `
      SELECT id, org_id, user_id, user_name, action, target_id, details, ip_address, created_at
      FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.queryAll<AuditLogRow>(listSql, ...params, pageSize, offset);

    const logs = rows.map((r) => {
      let parsedDetails: any = null;
      if (r.details) {
        try {
          parsedDetails = JSON.parse(r.details);
        } catch {
          parsedDetails = { raw: r.details };
        }
      }
      return {
        id: r.id,
        orgId: r.org_id,
        userId: r.user_id,
        userName: r.user_name || "System",
        action: r.action,
        targetId: r.target_id,
        details: parsedDetails,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      };
    });

    return jsonResponse({
      success: true,
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to query audit logs", 500);
  }
}

/**
 * DELETE /api/enterprise/audit-logs
 * 支持按指定 ID 单条/批量删除，或管理员按时间范围一键清理历史日志
 */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin")) {
    return errorResponse("Forbidden: Administrator privileges required", 403);
  }

  const url = new URL(request.url);
  const logId = url.searchParams.get("id");
  const olderThanDays = url.searchParams.get("days");

  try {
    const db = getDb(env);

    if (logId) {
      await db.execute("DELETE FROM audit_logs WHERE id = ? AND org_id = ?", logId, session.org.id);
      return jsonResponse({ success: true, message: "Log record deleted" });
    }

    if (olderThanDays) {
      const days = parseInt(olderThanDays, 10);
      if (isNaN(days) || days < 0) {
        return errorResponse("Invalid days parameter", 400);
      }
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      await db.execute("DELETE FROM audit_logs WHERE org_id = ? AND created_at < ?", session.org.id, cutoffTime);
      return jsonResponse({ success: true, message: `Audit logs older than ${days} days pruned` });
    }

    // 支持通过请求体批量删除 ID
    let body: { ids?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // ignore
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      for (const id of body.ids) {
        await db.execute("DELETE FROM audit_logs WHERE id = ? AND org_id = ?", id, session.org.id);
      }
      return jsonResponse({ success: true, deletedCount: body.ids.length });
    }

    return errorResponse("Log ID or pruning parameters required", 400);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete audit logs", 500);
  }
}
