import { getDb } from "../../lib/db";
import { getEnterpriseSession } from "../../lib/rbac";
import { loadMetadata, jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

interface AuditLogRow {
  id: string;
  user_name: string | null;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: number;
}

/**
 * 获取企业工作台仪表盘聚合指标 (GET)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  const { user, org } = session;

  try {
    const db = getDb(env);
    const now = Date.now();

    // 1. 组织席位与成员统计
    const memberStat = await db.queryOne<{ total: number; active: number }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
       FROM users WHERE org_id = ?`,
      org.id
    );

    // 2. 文档总数与外部分享统计 (从 R2 存储桶元数据读取)
    let documentsCount = 0;
    let sharedCount = 0;
    try {
      const meta = await loadMetadata(env);
      const docs = meta.documents || [];
      documentsCount = docs.length;
      sharedCount = docs.filter((d) => Boolean(d.shareToken)).length;
    } catch {
      // 容错
    }

    // 3. 当前有效协同编辑锁数量
    const lockStat = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM document_locks WHERE expires_at > ?",
      now
    );

    // 4. 最近 10 条团队协同与安全动态流
    const recentActivities = await db.queryAll<AuditLogRow>(
      `SELECT id, user_name, action, target_id, details, created_at 
       FROM audit_logs 
       WHERE org_id = ? 
       ORDER BY created_at DESC LIMIT 10`,
      org.id
    );

    return jsonResponse({
      organization: {
        id: org.id,
        name: org.name,
        maxSeats: org.maxSeats || 50,
        currentMembers: memberStat?.total || 1,
        activeMembers: memberStat?.active || 1,
      },
      stats: {
        documentsCount,
        sharedCount,
        activeLocksCount: lockStat?.count || 0,
      },
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        userName: a.user_name || "System",
        action: a.action,
        targetId: a.target_id,
        details: a.details ? JSON.parse(a.details) : null,
        createdAt: a.created_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(`Failed to load dashboard metrics: ${message}`, 500);
  }
}
