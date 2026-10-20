import { getDb } from "../../lib/db";
import { extractSessionToken, getEnterpriseSession, recordAuditLog } from "../../lib/rbac";
import { sha256Hex, clearSessionCookie } from "../../lib/auth-crypto";
import { jsonResponse } from "../../utils";
import { PagesContext } from "../../types";

/**
 * 企业会话登出 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (env.DB) {
    try {
      const session = await getEnterpriseSession(request, env);
      const token = extractSessionToken(request);
      if (token) {
        const db = getDb(env);
        const tokenHash = await sha256Hex(token);
        await db.execute("DELETE FROM user_sessions WHERE token_hash = ?", tokenHash);

        if (session) {
          await recordAuditLog(db, {
            orgId: session.org.id,
            userId: session.user.id,
            userName: session.user.name,
            action: "user_logout",
            ipAddress: request.headers.get("CF-Connecting-IP") || undefined,
          });
        }
      }
    } catch (e) {
      console.error("Logout cleanup error:", e);
    }
  }

  return jsonResponse(
    { success: true, message: "Logged out successfully" },
    200,
    {
      "Set-Cookie": clearSessionCookie(),
    }
  );
}
