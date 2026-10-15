import { PagesContext } from "../../../types";
import { errorResponse, loadMetadata, getR2Bucket } from "../../../utils";

/**
 * 公开接口：根据分享凭证直接下载文档二进制 (无需登录)
 */
export async function onRequestGet(context: PagesContext<"token">): Promise<Response> {
  const { env, params } = context;
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

  // 校验提取密钥 (如果该文档设置了密码)
  if (doc.sharePassword) {
    const url = new URL(context.request.url);
    const providedKey = (url.searchParams.get("key") || url.searchParams.get("pwd") || context.request.headers.get("X-Share-Key") || "").trim();
    if (!providedKey || providedKey !== doc.sharePassword) {
      return errorResponse("提取密钥错误或缺失", 403);
    }
  }

  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("存储桶中未找到该文档实体", 404);
  }

  const encodedFileName = encodeURIComponent(doc.name);
  const isHead = context.request.method === "HEAD";

  return new Response(isHead ? null : object.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size),
    },
  });
}

export const onRequestHead = onRequestGet;

