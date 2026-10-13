import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
} from "../../utils";

/**
 * 重命名分类 (PATCH) 或 删除分类 (DELETE)
 */
export async function onRequestPatch(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const categoryId = params.id as string;
  try {
    const body = (await request.json()) as { name?: string };
    const name = body?.name?.trim();
    if (!name) {
      return errorResponse("分类名称不能为空", 400);
    }

    const metadata = await loadMetadata(env);
    const category = metadata.categories.find((c) => c.id === categoryId);
    if (!category) {
      return errorResponse("分类不存在", 404);
    }

    category.name = name;
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      category,
    });
  } catch (err) {
    return errorResponse("更新分类失败: " + String(err), 500);
  }
}

export async function onRequestDelete(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("未授权访问，请先登录", 401);
  }

  const categoryId = params.id as string;
  try {
    const metadata = await loadMetadata(env);
    const index = metadata.categories.findIndex((c) => c.id === categoryId);
    if (index === -1) {
      return errorResponse("分类不存在", 404);
    }

    // 递归找出该分类及其所有子分类 ID
    const toDeleteIds = new Set<string>([categoryId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of metadata.categories) {
        if (cat.parentId && toDeleteIds.has(cat.parentId) && !toDeleteIds.has(cat.id)) {
          toDeleteIds.add(cat.id);
          added = true;
        }
      }
    }

    // 将这些分类下的文档的 categoryId 置为 null (移动到未分类)
    for (const doc of metadata.documents) {
      if (doc.categoryId && toDeleteIds.has(doc.categoryId)) {
        doc.categoryId = null;
      }
    }

    // 移除这些分类
    metadata.categories = metadata.categories.filter((c) => !toDeleteIds.has(c.id));
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      deletedCategoryIds: Array.from(toDeleteIds),
    });
  } catch (err) {
    return errorResponse("删除分类失败: " + String(err), 500);
  }
}
