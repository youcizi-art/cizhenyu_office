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
    return errorResponse("Unauthorized, please log in first", 401);
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      parentId?: string | null;
    };

    const name = body?.name?.trim();
    if (!name) {
      return errorResponse("Category name cannot be empty", 400);
    }

    const metadata = await loadMetadata(env);
    const parentId = body.parentId || null;

    if (parentId) {
      const parentExists = metadata.categories.some((c) => c.id === parentId);
      if (!parentExists) {
        return errorResponse("Specified parent category does not exist", 404);
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
    return errorResponse("Failed to create category: " + String(err), 500);
  }
}
