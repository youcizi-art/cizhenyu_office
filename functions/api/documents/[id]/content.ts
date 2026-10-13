import { PagesContext } from "../../../types";
import { errorResponse, verifyAuth, loadMetadata } from "../../../utils";

/**
 * 获取文档内容二进制流 (用于在线编辑器加载)
 */
export async function onRequestGet(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const bucket = env.DOCUMENTS_BUCKET;
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket 未绑定", 500);
  }

  const docId = params.id as string;
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.id === docId);

  if (!doc) {
    return errorResponse("文档不存在", 404);
  }

  const object = await bucket.get(doc.r2Key);
  if (!object) {
    return errorResponse("存储桶中未找到该文档实体", 404);
  }

  const encodedFileName = encodeURIComponent(doc.name);
  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size),
    },
  });
}
