import { PagesContext } from "../../../types";
import { jsonResponse, errorResponse, loadMetadata } from "../../../utils";

/**
 * 公开接口：获取分享文档的基本展示信息 (无需登录)
 */
export async function onRequestGet(context: PagesContext<"token">): Promise<Response> {
  const { env, params } = context;
  const token = params.token as string;

  if (!token) {
    return errorResponse("缺少分享凭证", 400);
  }

  if (!env.DOCUMENTS_BUCKET) {
    return errorResponse("存储服务未就绪", 500);
  }

  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.shareToken === token);

  if (!doc) {
    return errorResponse("分享链接不存在或已失效", 404);
  }

  // 仅对外暴露非敏感展示信息，不支持在线查看具体内容
  return jsonResponse({
    name: doc.name,
    type: doc.type,
    size: doc.size,
    updatedAt: doc.updatedAt,
  });
}
