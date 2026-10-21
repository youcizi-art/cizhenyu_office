import { getDb } from "../../lib/db";
import { getEnterpriseSession, assertOrgRole } from "../../lib/rbac";
import { jsonResponse, errorResponse } from "../../utils";
import { PagesContext } from "../../types";

interface InvitationRow {
  id: string;
  org_id: string;
  code: string;
  role: string;
  max_uses: number;
  used_count: number;
  created_by_user_id: string | null;
  expires_at: number;
  created_at: number;
}

/**
 * 随机生成形如 "YCZ-8F3K9A" 的企业安全邀请码
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "YCZ-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 获取组织下所有激活邀请码 (GET)
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized: Enterprise session required", 401);
  if (!assertOrgRole(session.user.role, "admin")) return errorResponse("Permission denied", 403);

  try {
    const db = getDb(env);
    const list = await db.queryAll<InvitationRow>(
      "SELECT * FROM invitation_codes WHERE org_id = ? ORDER BY created_at DESC LIMIT 100",
      session.org.id
    );
    return jsonResponse({ invitations: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(`Failed to load invitations: ${message}`, 500);
  }
}

/**
 * 生成新安全邀请码 (POST)
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized: Enterprise session required", 401);
  if (!assertOrgRole(session.user.role, "admin")) return errorResponse("Permission denied", 403);

  let body: { role?: string; maxUses?: number; validDays?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const role = body.role === "admin" || body.role === "viewer" ? body.role : "member";
  const maxUses = Math.min(Math.max(1, Number(body.maxUses) || 1), 50);
  const validDays = Math.min(Math.max(1, Number(body.validDays) || 7), 30);
  const now = Date.now();
  const expiresAt = now + validDays * 24 * 60 * 60 * 1000;

  try {
    const db = getDb(env);
    const id = crypto.randomUUID();
    const code = generateCode();

    await db.execute(
      `INSERT INTO invitation_codes (id, org_id, code, role, max_uses, used_count, created_by_user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      session.org.id,
      code,
      role,
      maxUses,
      0,
      session.user.id,
      expiresAt,
      now
    );

    return jsonResponse({
      success: true,
      invitation: {
        id,
        code,
        role,
        maxUses,
        usedCount: 0,
        expiresAt,
        createdAt: now,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(`Failed to create invitation: ${message}`, 500);
  }
}

/**
 * 作废/删除邀请码 (DELETE)
 */
export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized: Enterprise session required", 401);
  if (!assertOrgRole(session.user.role, "admin")) return errorResponse("Permission denied", 403);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("Missing invitation id", 400);

  try {
    const db = getDb(env);
    await db.execute("DELETE FROM invitation_codes WHERE id = ? AND org_id = ?", id, session.org.id);
    return jsonResponse({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(`Failed to delete invitation: ${message}`, 500);
  }
}
