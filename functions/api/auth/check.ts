import { PagesContext } from "../../types";
import { jsonResponse, verifyAuth, getConfiguredPassword } from "../../utils";

/**
 * 校验当前登录态
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const configuredPassword = getConfiguredPassword(env);

  // 未配置密码则始终视为已登录（开放模式）
  if (!configuredPassword) {
    return jsonResponse({
      authenticated: true,
      requiresPassword: false,
    });
  }

  const isValid = await verifyAuth(request, env);
  return jsonResponse({
    authenticated: isValid,
    requiresPassword: true,
  });
}
