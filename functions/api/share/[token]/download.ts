import { PagesContext } from "../../../types";
import {
  errorResponse,
  loadMetadata,
  getR2Bucket,
  getMimeType,
  checkAndCleanExpiredShare,
} from "../../../utils";

/**
 * 公开接口：根据分享凭证直接下载或内联展示文档二进制 (无需登录)
 * 支持密码保护验证与时效检查
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

  // 惰性时效对比：如果已超过有效期，服务端自动关闭分享并回写持久化 R2
  const isExpired = await checkAndCleanExpiredShare(env, doc, metadata);
  if (isExpired) {
    return errorResponse("Share link has expired", 410);
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

  const url = new URL(request.url);
  const isInline = url.searchParams.get("inline") === "true";
  const contentType = getMimeType(doc.name);
  const encodedFileName = encodeURIComponent(doc.name);
  const dispositionType = isInline ? "inline" : "attachment";
  const isHead = request.method === "HEAD";

  return new Response(isHead ? null : object.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
    },
  });
}

export const onRequestHead = onRequestGet;

