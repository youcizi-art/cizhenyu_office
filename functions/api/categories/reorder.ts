import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
} from "../../utils";

/**
 * 批量更新同一层级分类排序 (POST /api/categories/reorder)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  try {
    const body = (await request.json()) as { orderedCategoryIds?: string[] };
    const orderedCategoryIds = body.orderedCategoryIds;

    if (!Array.isArray(orderedCategoryIds) || orderedCategoryIds.length === 0) {
      return errorResponse("Invalid category order data", 400);
    }

    const metadata = await loadMetadata(env);
    const catMap = new Map(metadata.categories.map((c) => [c.id, c]));

    // 给本次传入的分类赋新排序序号
    orderedCategoryIds.forEach((id, index) => {
      const cat = catMap.get(id);
      if (cat) {
        cat.order = index;
      }
    });

    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      count: orderedCategoryIds.length,
    });
  } catch (err) {
    return errorResponse("Failed to save category order: " + String(err), 500);
  }
}
