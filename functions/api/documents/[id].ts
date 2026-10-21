import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
  getR2Bucket,
} from "../../utils";

/**
 * 更新文档内容 (PUT) 或 删除文档 (DELETE)
 */
export async function onRequestPut(context: PagesContext<"id">): Promise<Response> {
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
  if (!docId) {
    return errorResponse("Missing document ID", 400);
  }

  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("Document not found", 404);
    }

    const doc = metadata.documents[docIndex];

    // 企业级四维 RBAC 校验与操作审计
    const { getEnterpriseSession, recordAuditLog } = await import("../../lib/rbac");
    const { resolveUserEffectivePermissions } = await import("../../lib/permission-engine");
    const { getDb } = await import("../../lib/db");

    const session = await getEnterpriseSession(request, env);
    if (session && env.DB) {
      const db = getDb(env);
      const resolved = await resolveUserEffectivePermissions(db, session.user, {
        id: doc.id,
        type: doc.type,
        categoryId: doc.categoryId,
        tags: doc.tags || [],
      });

      if (!resolved.actions.includes("edit")) {
        return errorResponse("Forbidden: You do not have 'edit' permission for this document", 403);
      }

      await recordAuditLog(db, {
        orgId: session.org.id,
        userId: session.user.id,
        userName: session.user.name,
        action: "doc_edit",
        targetId: doc.id,
        details: { docName: doc.name, docType: doc.type },
        ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
      });
    }

    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return errorResponse("Uploaded content is empty", 400);
    }

    // 允许通过请求头或 query 参数将旧的 .doc 格式升级为 .docx
    const url = new URL(request.url);
    const newNameParam = url.searchParams.get("name");
    if (newNameParam && newNameParam.trim()) {
      const cleanName = newNameParam.trim();
      doc.name = cleanName;
      if (cleanName.toLowerCase().endsWith(".docx")) {
        doc.type = "docx";
      }
    } else if (doc.name.toLowerCase().endsWith(".doc")) {
      doc.name = doc.name + "x";
      doc.type = "docx";
    }

    // 1. 覆盖 R2 对象
    await bucket.put(doc.r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: "application/octet-stream",
      },
    });

    // 2. 更新元数据
    doc.size = arrayBuffer.byteLength;
    doc.updatedAt = Date.now();
    metadata.documents[docIndex] = doc;
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      document: doc,
    });
  } catch (err) {
    return errorResponse("Failed to update document: " + String(err), 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
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
  if (!docId) {
    return errorResponse("Missing document ID", 400);
  }

  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("Document not found", 404);
    }

    const doc = metadata.documents[docIndex];
    // 从 R2 物理删除
    await bucket.delete(doc.r2Key);

    // 从索引中移除
    metadata.documents.splice(docIndex, 1);
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (err) {
    return errorResponse("Failed to delete document: " + String(err), 500);
  }
}
