import { Category, PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
  generateId,
} from "../../utils";

/**
 * 创建新分类 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
    };

    const name = body?.name?.trim();
    if (!name) {
      return errorResponse("分类名称不能为空", 400);
    }

    const metadata = await loadMetadata(env);
    const parentId = body.parentId || null;

    if (parentId) {
      const parentExists = metadata.categories.some((c) => c.id === parentId);
      if (!parentExists) {
        return errorResponse("指定的父分类不存在", 404);
      }
    }

    const newCategory: Category = {
      id: generateId(),
      name,
      parentId,
      createdAt: Date.now(),
    };

    metadata.categories.push(newCategory);
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      category: newCategory,
    });
  } catch (err) {
    return errorResponse("创建分类失败: " + String(err), 500);
  }
}
