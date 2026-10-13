import { Env } from "../../types";

/**
 * OnlyOffice 字体服务处理器
 * 匹配路径：/v9.3.0.24-1/fonts/*
 * 优先从 R2 存储桶读取，如不存在则自动回源拉取并持久化至 R2（Write-Through）
 */
export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split("/fonts/");
  const fontId = segments[1];

  if (!fontId) {
    return new Response("Not found", { status: 404 });
  }

  const bucket = context.env.DOCUMENTS_BUCKET || context.env.DOCUMENTS;
  const r2Key = `fonts/${fontId}`;

  // 1. 尝试从 R2 缓存读取
  if (bucket) {
    try {
      const obj = await bucket.get(r2Key);
      if (obj) {
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set("Content-Type", "application/octet-stream");
        headers.set("Cache-Control", "public, max-age=31556952, immutable");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(obj.body, { headers });
      }
    } catch (err) {
      console.error("[Fonts R2 Get Error]", err);
    }
  }

  // 2. 回源拉取并存入 R2 供后续永久秒开
  try {
    const upstreamUrl = `https://office-editor.ziziyi.com/v9.3.0.24-1/fonts/${fontId}`;
    const res = await fetch(upstreamUrl);
    if (!res.ok) {
      return new Response("Font not found", { status: res.status });
    }

    const buf = await res.arrayBuffer();

    // 异步写入 R2
    if (bucket) {
      context.waitUntil(
        bucket.put(r2Key, buf, {
          httpMetadata: { contentType: "application/octet-stream" },
        }).catch((e) => console.error("[Fonts R2 Put Error]", e))
      );
    }

    return new Response(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=31556952, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[Fonts Upstream Error]", err);
    return new Response("Failed to fetch font", { status: 502 });
  }
};
