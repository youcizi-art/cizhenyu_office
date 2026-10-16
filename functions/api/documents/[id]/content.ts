import { PagesContext } from "../../../types";
import { errorResponse, verifyAuth, loadMetadata, getR2Bucket, getMimeType } from "../../../utils";

/**
 * 获取文档内容二进制流 (用于在线编辑器加载或媒体预览)
 */
export async function onRequestGet(context: PagesContext<"id">): Promise<Response> {
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
  const metadata = await loadMetadata(env);
  const doc = metadata.documents.find((d) => d.id === docId);

  if (!doc) {
    return errorResponse("Document not found", 404);
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

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
    },
  });
}
