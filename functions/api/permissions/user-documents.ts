import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 获取指定用户被显式配置的单文档权限列表 (/api/permissions/user-documents?userId=xxx)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  if (!assertOrgRole(session.user.role, "admin") && !assertOrgRole(session.user.role, "owner")) {
    return errorResponse("Forbidden: requires admin privileges", 403);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return errorResponse("Missing userId parameter", 400);
  }

  try {
    const db = getDb(env);
    const rows = await db.queryAll<{
      id: string;
      document_id: string;
      document_name: string;
      permission: string;
    }>(
      `SELECT 
        dp.id,
        dp.document_id,
        d.name AS document_name,
        dp.permission
       FROM document_permissions dp
       INNER JOIN documents d ON dp.document_id = d.id
       WHERE dp.user_id = ? AND d.organization_id = ?`,
      userId,
      session.org.id
    );

    return jsonResponse({
      success: true,
      permissions: rows.map((r) => ({
        id: r.id,
        docId: r.document_id,
        docName: r.document_name,
        permission: r.permission,
      })),
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch user documents", 500);
  }
}
