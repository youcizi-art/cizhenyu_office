import { Env, MetadataIndex, R2Bucket } from "./types";

const METADATA_KEY = "_app/metadata.json";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天有效期

/**
 * 创建统一 JSON 响应
 */
export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

/**
 * 创建错误响应
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

/**
 * 获取系统配置的访问密码
 */
export function getConfiguredPassword(env: Env): string | null {
  return env.PASSWORD || env.ACCESS_KEY || null;
}

/**
 * 生成 HMAC 签名
 */
async function generateHmac(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 为已验证的客户端生成 Token
 */
export async function createAuthToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await generateHmac(secret, timestamp);
  return `${timestamp}.${signature}`;
}

/**
 * 校验请求的身份认证
 */
export async function verifyAuth(request: Request, env: Env): Promise<boolean> {
  const configuredPassword = getConfiguredPassword(env);
  // 如果环境变量未配置密码，则默认无需认证（方便快速预览或本地免密测试）
  if (!configuredPassword) {
    return true;
  }

  // 1. 从 Authorization 请求头获取
  let token: string | null = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. 从 Cookie 获取
  if (!token) {
    const cookieHeader = request.headers.get("Cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/office_auth_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [timestampStr, providedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
    return false; // Token 过期或格式异常
  }

  const expectedSig = await generateHmac(configuredPassword, timestampStr);
  return expectedSig === providedSig;
}

/**
 * 获取绑定的 R2 存储桶（兼容 DOCUMENTS_BUCKET 和 DOCUMENTS 命名）
 */
export function getR2Bucket(env: Env): R2Bucket | undefined {
  return env.DOCUMENTS_BUCKET || env.DOCUMENTS;
}

/**
 * 从 R2 读取元数据索引
 */
export async function loadMetadata(env: Env): Promise<MetadataIndex> {
  const bucket = getR2Bucket(env);
  if (!bucket) {
    throw new Error("DOCUMENTS_BUCKET is not bound in Cloudflare environment");
  }

  try {
    const object = await bucket.get(METADATA_KEY);
    if (!object) {
      return { categories: [], documents: [] };
    }
    const text = await object.text();
    const data = JSON.parse(text) as MetadataIndex;
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
    };
  } catch (error) {
    console.error("Failed to load metadata index:", error);
    return { categories: [], documents: [] };
  }
}

/**
 * 保存元数据索引到 R2
 */
export async function saveMetadata(env: Env, metadata: MetadataIndex): Promise<void> {
  const bucket = getR2Bucket(env);
  if (!bucket) {
    throw new Error("DOCUMENTS_BUCKET is not bound in Cloudflare environment");
  }

  const content = JSON.stringify(metadata, null, 2);
  await bucket.put(METADATA_KEY, content, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
  });
}

/**
 * 随机生成 ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
