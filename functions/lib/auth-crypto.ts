/**
 * 企业版安全加密与会话管理服务
 * 基于标准 Web Crypto API 实现 PBKDF2 密码哈希与 Session Token 校验
 * 适用于 Cloudflare Workers / Pages Functions Edge 边缘无服务器环境
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;
const DIGEST_ALGORITHM = "SHA-256";

/**
 * 将 ArrayBuffer 转为十六进制字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 将十六进制字符串转为 Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 生成安全的随机 Salt (32 字节)
 */
export function generateSalt(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return bufferToHex(randomBytes.buffer);
}

/**
 * 使用 PBKDF2 算法对密码进行安全加盐哈希
 * @param password 明文密码
 * @param existingSalt 可选的指定盐值，若不传则自动随机生成
 */
export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateSalt();
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(salt) as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: DIGEST_ALGORITHM,
    },
    passwordKey,
    KEY_LENGTH_BITS
  );

  const hash = bufferToHex(derivedBits);
  return { hash, salt };
}

/**
 * 校验用户输入的明文密码与存储的哈希是否一致
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

/**
 * 计算字符串的 SHA-256 哈希值 (用于 Session Token 快速比对)
 */
export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return bufferToHex(hashBuffer);
}

/**
 * 生成安全的随机会话 Token 与其数据库存储哈希
 */
export async function generateSessionToken(): Promise<{
  token: string;
  tokenHash: string;
}> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const token = bufferToHex(randomBytes.buffer);
  const tokenHash = await sha256Hex(token);
  return { token, tokenHash };
}

/**
 * 构造 HttpOnly 安全会话 Cookie
 */
export function createSessionCookie(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  return `office_enterprise_session=${encodeURIComponent(
    token
  )}; Path=/; Expires=${expiresDate}; HttpOnly; SameSite=Lax; Secure`;
}

/**
 * 构造清理会话 Cookie 的指令
 */
export function clearSessionCookie(): string {
  return `office_enterprise_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure`;
}
