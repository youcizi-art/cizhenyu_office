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
    return errorResponse("缺少分享凭证", 400);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("存储服务未就绪", 500);
  }

  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.shareToken === token);

  if (!doc) {
    return errorResponse("分享链接不存在或已失效", 404);
  }

  if (doc.type !== "md") {
    return errorResponse("该文档类型不支持纯文本在线展示", 400);
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
      return errorResponse("提取密钥错误或缺失", 403);
    }
  }

  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("存储桶中未找到该文档实体", 404);
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
