import { PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  getConfiguredPassword,
  createAuthToken,
} from "../../utils";

/**
 * 登录接口：验证部署环境变量中的密码
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const configuredPassword = getConfiguredPassword(env);

  // 如果没有配置密码，直接允许免密登录
  if (!configuredPassword) {
    return jsonResponse({
      success: true,
      message: "No password configured. Logged in directly.",
      token: "open_mode",
    });
  }

  try {
    const body = (await request.json()) as { password?: string };
    const inputPassword = body?.password?.trim() || "";

    if (inputPassword !== configuredPassword) {
      return errorResponse("Invalid access key, please try again", 401);
    }

    const token = await createAuthToken(configuredPassword);

    const headers = new Headers();
    // 写入安全 Cookie，有效期 30 天
    headers.append(
      "Set-Cookie",
      `office_auth_token=${encodeURIComponent(
        token
      )}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`
    );

    return new Response(
      JSON.stringify({
        success: true,
        token,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": headers.get("Set-Cookie") || "",
        },
      }
    );
  } catch (err) {
    return errorResponse("Failed to parse request: " + String(err), 400);
  }
}
