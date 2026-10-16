import { PagesContext } from "../../../types";
import { errorResponse, loadMetadata, getR2Bucket } from "../../../utils";

/**
 * 公开接口：获取 Markdown 分享文档的文本内容 (仅限 md 类型)
 * 支持密码保护验证
 */
export async function onRequestGet(context: PagesContext<"token">): Promise<Response> {
  const { env, params, request } = context;
  const token = params.token as string;

  if (!token) {
    return errorResponse("Missing share token", 400);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Storage service not ready", 500);
  }

  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.shareToken === token);

  if (!doc) {
    return errorResponse("Share link does not exist or has expired", 404);
  }

  if (doc.type !== "md") {
    return errorResponse("This document type does not support plain text preview", 400);
  }

  // 校验提取密钥 (如果该文档设置了密码)
  if (doc.sharePassword) {
    const url = new URL(request.url);
    const providedKey = (
      url.searchParams.get("key") ||
      url.searchParams.get("pwd") ||
      request.headers.get("X-Share-Key") ||
      ""
    ).trim();

    if (!providedKey || providedKey !== doc.sharePassword) {
      return errorResponse("Access passcode is incorrect or missing", 403);
    }
  }

  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("Document entity not found in storage bucket", 404);
  }

  const textContent = await object.text();

  return new Response(textContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
