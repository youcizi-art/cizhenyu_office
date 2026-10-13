import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
  getR2Bucket,
} from "../../utils";

/**
 * 更新文档内容 (PUT) 或 删除文档 (DELETE)
 */
export async function onRequestPut(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket 未绑定", 500);
  }

  const docId = params.id as string;
  if (!docId) {
    return errorResponse("缺少文档 ID", 400);
  }

  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("文档不存在", 404);
    }

    const doc = metadata.documents[docIndex];
    const arrayBuffer = await request.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return errorResponse("上传的内容为空", 400);
    }

    // 1. 覆盖 R2 对象
    await bucket.put(doc.r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: "application/octet-stream",
      },
    });

    // 2. 更新元数据
    doc.size = arrayBuffer.byteLength;
    doc.updatedAt = Date.now();
    metadata.documents[docIndex] = doc;
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      document: doc,
    });
  } catch (err) {
    return errorResponse("更新文档失败: " + String(err), 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket 未绑定", 500);
  }

  const docId = params.id as string;
  if (!docId) {
    return errorResponse("缺少文档 ID", 400);
  }

  try {
    const metadata = await loadMetadata(env);
    const docIndex = metadata.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) {
      return errorResponse("文档不存在", 404);
    }

    const doc = metadata.documents[docIndex];
    // 从 R2 物理删除
    await bucket.delete(doc.r2Key);

    // 从索引中移除
    metadata.documents.splice(docIndex, 1);
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      message: "文档已删除",
    });
  } catch (err) {
    return errorResponse("删除文档失败: " + String(err), 500);
  }
}
