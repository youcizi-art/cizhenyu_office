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
    return errorResponse("未授权访问，请先登录", 401);
  }

  const docId = params.id as string;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("文档不存在", 404);
    }

    const body = (await request.json().catch(() => ({}))) as {
      sharePassword?: string;
      shareMode?: "download" | "preview";
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
    doc.shareToken = shareToken;
    doc.shareMode = shareMode;
    if (sharePassword) {
      doc.sharePassword = sharePassword;
    } else {
      delete doc.sharePassword;
    }
    doc.updatedAt = Date.now();

    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      shareToken,
      document: doc,
    });
  } catch (err) {
    return errorResponse("设置分享失败: " + String(err), 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const docId = params.id as string;
  try {
    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("文档不存在", 404);
    }

    delete doc.shareToken;
    delete doc.sharePassword;
    delete doc.shareMode;
    doc.updatedAt = Date.now();

    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      message: "已关闭分享",
      document: doc,
    });
  } catch (err) {
    return errorResponse("关闭分享失败: " + String(err), 500);
  }
}
