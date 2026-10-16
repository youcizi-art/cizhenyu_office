import { PagesContext } from "../../../types";
import { jsonResponse, errorResponse, loadMetadata, getR2Bucket } from "../../../utils";

/**
 * 公开接口：获取分享文档的基本展示信息 (无需登录)
 */
export async function onRequestGet(context: PagesContext<"token">): Promise<Response> {
  const { env, params } = context;
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

  // 仅对外暴露非敏感展示信息，不支持在线查看具体内容，不泄露真实密码
  return jsonResponse({
    name: doc.name,
    type: doc.type,
    size: doc.size,
    updatedAt: doc.updatedAt,
    requiresPassword: Boolean(doc.sharePassword),
    shareMode: doc.shareMode || "download",
  });
}
