import { PagesContext } from "../../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
} from "../../../utils";

/**
 * 更新文档元数据（重命名、移动分类）
 */
export async function onRequestPatch(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const docId = params.id as string;
  try {
    const body = (await request.json()) as {
      name?: string;
      categoryId?: string | null;
    };

    const metadata = await loadMetadata(env);
    const doc = metadata.documents.find((d) => d.id === docId);
    if (!doc) {
      return errorResponse("文档不存在", 404);
    }

    if (typeof body.name === "string" && body.name.trim()) {
      doc.name = body.name.trim();
    }

    if ("categoryId" in body) {
      doc.categoryId = body.categoryId || null;
    }

    doc.updatedAt = Date.now();
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      document: doc,
    });
  } catch (err) {
    return errorResponse("修改元数据失败: " + String(err), 500);
  }
}
