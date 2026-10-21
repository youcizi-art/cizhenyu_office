import { PagesContext } from "../../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
  generateId,
} from "../../../utils";

/**
 * 开启或刷新分享链接 (POST) / 关闭分享 (DELETE)
 */
export async function onRequestPost(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  const docId = params.id as string;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("Document not found", 404);
    }

    // 企业级四维 RBAC 校验与操作审计
    const { getEnterpriseSession, recordAuditLog } = await import("../../../lib/rbac");
    const { resolveUserEffectivePermissions } = await import("../../../lib/permission-engine");
    const { getDb } = await import("../../../lib/db");

    const session = await getEnterpriseSession(request, env);
    if (session && env.DB) {
      const db = getDb(env);
      const resolved = await resolveUserEffectivePermissions(db, session.user, {
        id: doc.id,
        type: doc.type,
        categoryId: doc.categoryId,
        tags: doc.tags || [],
      });

      if (!resolved.actions.includes("share")) {
        return errorResponse("Forbidden: You do not have 'share' permission for this document", 403);
      }

      await recordAuditLog(db, {
        orgId: session.org.id,
        userId: session.user.id,
        userName: session.user.name,
        action: "doc_share_created",
        targetId: doc.id,
        details: { docName: doc.name },
        ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
      });
    }

    const body = (await request.json().catch(() => ({}))) as {
      sharePassword?: string;
      shareMode?: "download" | "preview";
      expiresInHours?: number;
    };
    const sharePassword = typeof body.sharePassword === "string" ? body.sharePassword.trim() : undefined;
    const isPreviewable =
      doc.type === "md" ||
      doc.type === "image" ||
      doc.type === "video" ||
      doc.type === "audio";
    const shareMode = body.shareMode === "preview" && isPreviewable ? "preview" : "download";

    // 生成或更新 16 位分享 Token
    const shareToken = generateId().replace(/-/g, "").substring(0, 16);
    const now = Date.now();
    doc.shareToken = shareToken;
    doc.shareMode = shareMode;
    doc.shareCreatedAt = now;

    // 时效设置：步长按小时计算，最长为 7 天 (168 小时)；在 0 或 168 (最右侧) 均视为永久
    const hours = typeof body.expiresInHours === "number" ? Math.round(body.expiresInHours) : 0;
    if (hours > 0 && hours < 168) {
      doc.shareExpiresAt = now + hours * 3600 * 1000;
    } else {
      delete doc.shareExpiresAt;
    }

    if (sharePassword) {
      doc.sharePassword = sharePassword;
    } else {
      delete doc.sharePassword;
    }
    doc.updatedAt = now;

    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      shareToken,
      document: doc,
    });
  } catch (err) {
    return errorResponse("Failed to configure share link: " + String(err), 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  const docId = params.id as string;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("Document not found", 404);
    }

    delete doc.shareToken;
    delete doc.sharePassword;
    delete doc.shareMode;
    delete doc.shareExpiresAt;
    delete doc.shareCreatedAt;
    doc.updatedAt = Date.now();

    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      message: "Share link closed successfully",
      document: doc,
    });
  } catch (err) {
    return errorResponse("Failed to close share link: " + String(err), 500);
  }
}
