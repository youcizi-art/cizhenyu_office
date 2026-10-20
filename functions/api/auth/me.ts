import { getEnterpriseSession } from "../../lib/rbac";
import { getDb, schema } from "../../lib/db";
import { jsonResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 获取当前登录的企业用户信息及系统初始化状态 (GET)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({
      authenticated: false,
      enterpriseConfigured: false,
      message: "D1 Database is not bound",
    });
  }

  try {
    const session = await getEnterpriseSession(request, env);
    if (!session) {
      // 检查系统是否有任何用户（用于前端决定展示“初始化企业管理员”还是“常规企业登录”）
      const db = getDb(env);
      const anyUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
      const isInitialized = anyUsers.length > 0;

      return jsonResponse({
        authenticated: false,
        enterpriseConfigured: true,
        isInitialized,
      });
    }

    return jsonResponse({
      authenticated: true,
      enterpriseConfigured: true,
      isInitialized: true,
      user: session.user,
      org: session.org,
    });
  } catch (error: any) {
    console.error("Failed to fetch enterprise auth status:", error);
    return jsonResponse({
      authenticated: false,
      enterpriseConfigured: false,
      error: error.message || "Failed to query authentication state",
    });
  }
}
