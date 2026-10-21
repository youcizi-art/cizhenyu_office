import { getDb } from "../../lib/db";
import { getEnterpriseSession } from "../../lib/rbac";
import { resolveUserEffectivePermissions } from "../../lib/permission-engine";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 权限计算与预览解析 API (POST)
 * 支持管理员输入特定用户 ID 与文档 ID 实时模拟/预览权限判定链路，
 * 也支持普通用户获取自己针对特定文档的有效操作集合。
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return errorResponse("Database is not configured", 500);
  }

  const session = await getEnterpriseSession(request, env);
  if (!session) {
    return errorResponse("Unauthorized", 401);
  }

  let body: {
    documentId: string;
    simulatedUserId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  if (!body.documentId) {
    return errorResponse("documentId is required", 400);
  }

  try {
    const db = getDb(env);

    // 1. 获取目标文档信息
    const doc = await db.queryOne<{
      id: string;
      type: string;
      category_id: string | null;
      tags: string | null;
    }>("SELECT id, type, category_id, tags FROM documents WHERE id = ? LIMIT 1", body.documentId);

    if (!doc) {
      return errorResponse("Document not found", 404);
    }

    let parsedTags: string[] = [];
    try {
      if (doc.tags) {
        parsedTags = JSON.parse(doc.tags);
      }
    } catch {
      // 容错
    }

    // 2. 确定判定对象用户 (若指定 simulatedUserId 且当前是 Admin/Owner，则模拟该用户)
    let targetUser = session.user;
    if (body.simulatedUserId && (session.user.role === "owner" || session.user.role === "admin")) {
      const userRow = await db.queryOne<{
        id: string;
        org_id: string;
        email: string;
        name: string;
        avatar: string | null;
        role: string;
        status: string;
        created_at: number;
        updated_at: number;
      }>("SELECT * FROM users WHERE id = ? AND org_id = ? LIMIT 1", body.simulatedUserId, session.org.id);

      if (userRow) {
        targetUser = {
          id: userRow.id,
          orgId: userRow.org_id,
          email: userRow.email,
          name: userRow.name,
          avatar: userRow.avatar,
          role: userRow.role as any,
          status: userRow.status as any,
          createdAt: userRow.created_at,
          updatedAt: userRow.updated_at,
        };
      }
    }

    // 3. 运行四维权限判定引擎
    const result = await resolveUserEffectivePermissions(db, targetUser, {
      id: doc.id,
      type: doc.type,
      categoryId: doc.category_id,
      tags: parsedTags,
    });

    return jsonResponse({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      document: {
        id: doc.id,
        type: doc.type,
        categoryId: doc.category_id,
        tags: parsedTags,
      },
      result,
    });
  } catch (error: any) {
    console.error("Failed to resolve permissions:", error);
    return errorResponse(error.message || "Failed to resolve permissions", 500);
  }
}
