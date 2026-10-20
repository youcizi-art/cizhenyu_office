import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../../../lib/db";
import {
  getEnterpriseSession,
  getDocumentPermission,
  assertOrgRole,
  recordAuditLog,
} from "../../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../../utils";
import { PagesContext, DocPermission } from "../../../../types";

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

    // 联合查询授权列表
    const permissions = await db
      .select({
        id: schema.documentPermissions.id,
        userId: schema.documentPermissions.userId,
        permission: schema.documentPermissions.permission,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userAvatar: schema.users.avatar,
        userRole: schema.users.role,
        createdAt: schema.documentPermissions.createdAt,
      })
      .from(schema.documentPermissions)
      .innerJoin(schema.users, eq(schema.documentPermissions.userId, schema.users.id))
      .where(eq(schema.documentPermissions.documentId, documentId));

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
    const existing = await db
      .select()
      .from(schema.documentPermissions)
      .where(
        and(
          eq(schema.documentPermissions.documentId, documentId),
          eq(schema.documentPermissions.userId, targetUserId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.documentPermissions)
        .set({
          permission,
          updatedAt: now,
        })
        .where(eq(schema.documentPermissions.id, existing[0].id));
    } else {
      await db.insert(schema.documentPermissions).values({
        id: crypto.randomUUID(),
        documentId,
        userId: targetUserId,
        permission,
        createdAt: now,
        updatedAt: now,
      });
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

    await db
      .delete(schema.documentPermissions)
      .where(
        and(
          eq(schema.documentPermissions.documentId, documentId),
          eq(schema.documentPermissions.userId, targetUserId)
        )
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
