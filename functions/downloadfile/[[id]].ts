import { PagesContext } from "../types";

/**
 * 处理 OnlyOffice 客户端的 downloadfile 探测请求 (如 checkExtendedPDF / PDF 探测)
 * 支持 GET, POST, OPTIONS
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // 返回 200 空二进制流或标准 204，防止 405 Method Not Allowed
  return new Response(new Uint8Array(0), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
