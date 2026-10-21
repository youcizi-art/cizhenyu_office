import { PagesContext } from "../../../types";
import { errorResponse, verifyAuth, loadMetadata, getR2Bucket, getMimeType } from "../../../utils";
import { getEnterpriseSession, recordAuditLog } from "../../../lib/rbac";
import { resolveUserEffectivePermissions } from "../../../lib/permission-engine";
import { getDb } from "../../../lib/db";

/**
 * 获取文档内容二进制流 (用于在线编辑器加载、媒体预览或受控下载)
 */
export async function onRequestGet(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket not bound", 500);
  }

  const docId = params.id as string;
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.id === docId);

  if (!doc) {
    return errorResponse("Document not found", 404);
  }

  const url = new URL(request.url);
  const isInline = url.searchParams.get("inline") === "true";
  const requiredAction = isInline ? "view" : "download";

  // 企业级四维 RBAC 校验与操作审计
  const session = await getEnterpriseSession(request, env);
  if (session && env.DB) {
    const db = getDb(env);
    const resolved = await resolveUserEffectivePermissions(db, session.user, {
      id: doc.id,
      type: doc.type,
      categoryId: doc.categoryId,
      tags: doc.tags || [],
    });

    if (!resolved.actions.includes(requiredAction)) {
      return errorResponse(`Forbidden: You do not have '${requiredAction}' permission for this document`, 403);
    }

    // 记录合规审计日志 (view / download 动作追踪)
    await recordAuditLog(db, {
      orgId: session.org.id,
      userId: session.user.id,
      userName: session.user.name,
      action: isInline ? "doc_view" : "doc_download",
      targetId: doc.id,
      details: { docName: doc.name, docType: doc.type },
      ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
    });
  }

  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("Document entity not found in storage bucket", 404);
  }

  const contentType = getMimeType(doc.name);
  const encodedFileName = encodeURIComponent(doc.name);
  const dispositionType = isInline ? "inline" : "attachment";

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
    },
  });
}

