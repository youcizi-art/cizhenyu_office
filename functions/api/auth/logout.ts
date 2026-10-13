import { PagesContext } from "../../types";
import { jsonResponse } from "../../utils";

/**
 * 退出登录接口：清除 Cookie
 */
export async function onRequestPost(_context: PagesContext): Promise<Response> {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "office_auth_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"
  );

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": headers.get("Set-Cookie") || "",
    },
  });
}
