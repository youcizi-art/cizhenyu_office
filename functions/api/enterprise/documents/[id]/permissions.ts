import { getDb } from "../../../../lib/db";
import {
  getEnterpriseSession,
  getDocumentPermission,
  assertOrgRole,
  recordAuditLog,
} from "../../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../../utils";
import { PagesContext, DocPermission } from "../../../../types";

interface PermRow {
  id: string;
  userId: string;
  permission: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userRole: string;
  createdAt: number;
}

/**
 * 单文档 ACL 细粒度权限查询、授予与撤销 (GET / POST / DELETE)
 */
export async function onRequestGet(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const documentId = params.id as string;

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  try {
    const db = getDb(env);

    // 检查调用者对文档是否有访问权限
    const myPerm = await getDocumentPermission(db, documentId, session.user);
    if (!myPerm && !assertOrgRole(session.user.role, "admin")) {
      return errorResponse("Forbidden: You do not have permission to view ACL of this document", 403);
    }

    const sql = `
      SELECT 
        dp.id AS id,
        dp.user_id AS userId,
        dp.permission AS permission,
        u.name AS userName,
        u.email AS userEmail,
        u.avatar AS userAvatar,
        u.role AS userRole,
        dp.created_at AS createdAt
      FROM document_permissions dp
      INNER JOIN users u ON dp.user_id = u.id
      WHERE dp.document_id = ?
    `;

    const permissions = await db.queryAll<PermRow>(sql, documentId);

    return jsonResponse({
      success: true,
      currentUserPermission: myPerm,
      permissions,
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to load document permissions", 500);
  }
}

export async function onRequestPost(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const documentId = params.id as string;

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  try {
    const db = getDb(env);

    // 只有企业 admin/owner，或该文档的 owner 才能调配权限
    const myPerm = await getDocumentPermission(db, documentId, session.user);
    if (myPerm !== "owner" && !assertOrgRole(session.user.role, "admin")) {
      return errorResponse("Forbidden: Document owner or administrator privileges required", 403);
    }

    let body: { userId?: string; permission?: DocPermission };
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON payload", 400);
    }

    const targetUserId = (body.userId || "").trim();
    const permission = body.permission || "editor";

    if (!targetUserId) {
      return errorResponse("Target userId is required", 400);
    }

    const now = Date.now();

    // 检查是否已有授权记录，做 Upsert
    const existing = await db.queryOne<{ id: string }>(
      "SELECT id FROM document_permissions WHERE document_id = ? AND user_id = ? LIMIT 1",
      documentId,
      targetUserId
    );

    if (existing) {
      await db.execute(
        "UPDATE document_permissions SET permission = ?, updated_at = ? WHERE id = ?",
        permission,
        now,
        existing.id
      );
    } else {
      await db.execute(
        `INSERT INTO document_permissions (id, document_id, user_id, permission, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        documentId,
        targetUserId,
        permission,
        now,
        now
      );
    }

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "perm_grant",
      targetId: documentId,
      details: { targetUserId, permission },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({
      success: true,
      message: "Document permission granted successfully",
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to grant document permission", 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const documentId = params.id as string;

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized: Enterprise session required", 401);
  }

  const url = new URL(request.url);
  const targetUserId = (url.searchParams.get("userId") || "").trim();
  if (!targetUserId) {
    return errorResponse("Query parameter userId is required", 400);
  }

  try {
    const db = getDb(env);

    const myPerm = await getDocumentPermission(db, documentId, session.user);
    if (myPerm !== "owner" && !assertOrgRole(session.user.role, "admin")) {
      return errorResponse("Forbidden: Document owner or administrator privileges required", 403);
    }

    await db.execute(
      "DELETE FROM document_permissions WHERE document_id = ? AND user_id = ?",
      documentId,
      targetUserId
    );

    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: "perm_revoke",
      targetId: documentId,
      details: { targetUserId },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });

    return jsonResponse({
      success: true,
      message: "Document permission revoked successfully",
    });
  } catch (err: any) {
    return errorResponse(err.message || "Failed to revoke document permission", 500);
  }
}
