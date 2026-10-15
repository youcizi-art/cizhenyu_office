import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
} from "../../utils";

/**
 * 批量更新文档排序 (POST /api/documents/reorder)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  try {
    const body = (await request.json()) as { orderedDocIds?: string[] };
    const orderedDocIds = body.orderedDocIds;

    if (!Array.isArray(orderedDocIds) || orderedDocIds.length === 0) {
      return errorResponse("排序数据格式不正确", 400);
    }

    const metadata = await loadMetadata(env);
    const docMap = new Map(metadata.documents.map((d) => [d.id, d]));

    // 给每个文档打上 order 序号，并重构 documents 数组
    const reorderedDocs: typeof metadata.documents = [];
    orderedDocIds.forEach((id, index) => {
      const doc = docMap.get(id);
      if (doc) {
        doc.order = index;
        reorderedDocs.push(doc);
        docMap.delete(id);
      }
    });

    // 补齐未包含在 orderedDocIds 里的遗留文档（排在末尾）
    docMap.forEach((doc) => {
      reorderedDocs.push(doc);
    });

    metadata.documents = reorderedDocs;
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      count: reorderedDocs.length,
    });
  } catch (err) {
    return errorResponse("保存文档排序失败: " + String(err), 500);
  }
}
