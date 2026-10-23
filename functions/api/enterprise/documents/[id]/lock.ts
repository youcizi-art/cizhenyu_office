import { getDb } from "../../../../lib/db";
import { getEnterpriseSession, assertOrgRole, recordAuditLog } from "../../../../lib/rbac";
import { jsonResponse, errorResponse } from "../../../../utils";
import { PagesContext } from "../../../../types";

/**
 * 独占写锁租约有效期 (TTL): 60 秒
 */
const LOCK_TTL_MS = 60 * 1000;

interface LockRecord {
  document_id: string;
  locked_by_user_id: string;
  locked_by_user_name: string;
  locked_at: number;
  expires_at: number;
}

/**
 * GET /api/enterprise/documents/[id]/lock
 * 检查当前文档的锁状态 (任何人有读权限均可查询)
 */
export async function onRequestGet(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const documentId = params.id as string;
  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const db = getDb(env);
    const now = Date.now();

    const lock = await db.queryOne<LockRecord>(
      `SELECT document_id, locked_by_user_id, locked_by_user_name, locked_at, expires_at
       FROM document_locks
       WHERE document_id = ? AND expires_at > ?
       LIMIT 1`,
      documentId,
      now
    );

    if (!lock) {
      return jsonResponse({
        success: true,
        isLocked: false,
        lock: null,
      });
    }

    const isLockedByMe = lock.locked_by_user_id === session.user.id;

    return jsonResponse({
      success: true,
      isLocked: true,
      isLockedByMe,
      lock: {
        documentId: lock.document_id,
        userId: lock.locked_by_user_id,
        userName: lock.locked_by_user_name,
        lockedAt: lock.locked_at,
        expiresAt: lock.expires_at,
        remainingSeconds: Math.max(0, Math.round((lock.expires_at - now) / 1000)),
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to inspect document lock", 500);
  }
}

/**
 * POST /api/enterprise/documents/[id]/lock
 * 申请获取文档独占锁 (Action: acquire | heartbeat | unlock | takeover)
 */
export async function onRequestPost(context: PagesContext<"id">): Promise<Response> {
  const { request, env, params } = context;
  if (!env.DB) return errorResponse("Database is not configured", 500);

  const documentId = params.id as string;
  const session = await getEnterpriseSession(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  let body: { action?: "acquire" | "heartbeat" | "unlock" | "takeover"; docName?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = { action: "acquire" };
  }

  const action = body.action || "acquire";
  const now = Date.now();
  const db = getDb(env);
  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";

  try {
    // 查找文档信息以记录审计日志
    const doc = await db.queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM documents WHERE id = ? LIMIT 1`,
      documentId
    );
    const targetDocName = body.docName || doc?.name || documentId;

    // 查找当前是否已有未过期的有效锁
    const currentLock = await db.queryOne<LockRecord>(
      `SELECT document_id, locked_by_user_id, locked_by_user_name, locked_at, expires_at
       FROM document_locks
       WHERE document_id = ? AND expires_at > ?
       LIMIT 1`,
      documentId,
      now
    );

    // 1. 申请加锁 (acquire)
    if (action === "acquire") {
      if (currentLock) {
        if (currentLock.locked_by_user_id === session.user.id) {
          // 本人持锁，自动平滑续约
          const nextExpires = now + LOCK_TTL_MS;
          await db.execute(
            `UPDATE document_locks SET expires_at = ? WHERE document_id = ?`,
            nextExpires,
            documentId
          );
          return jsonResponse({
            success: true,
            acquired: true,
            isLockedByMe: true,
            lock: {
              documentId,
              userId: session.user.id,
              userName: session.user.name,
              lockedAt: currentLock.locked_at,
              expiresAt: nextExpires,
              remainingSeconds: Math.round(LOCK_TTL_MS / 1000),
            },
          });
        }

        // 被他人占用，返回 423 Locked
        return jsonResponse(
          {
            success: false,
            acquired: false,
            error: `Document is currently locked by ${currentLock.locked_by_user_name}`,
            lock: {
              documentId,
              userId: currentLock.locked_by_user_id,
              userName: currentLock.locked_by_user_name,
              lockedAt: currentLock.locked_at,
              expiresAt: currentLock.expires_at,
              remainingSeconds: Math.max(0, Math.round((currentLock.expires_at - now) / 1000)),
            },
          },
          423
        );
      }

      // 无锁或已过期：执行原子获取 (UPSERT)
      const expiresAt = now + LOCK_TTL_MS;
      await db.execute(
        `INSERT INTO document_locks (document_id, locked_by_user_id, locked_by_user_name, locked_at, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(document_id) DO UPDATE SET
           locked_by_user_id = excluded.locked_by_user_id,
           locked_by_user_name = excluded.locked_by_user_name,
           locked_at = excluded.locked_at,
           expires_at = excluded.expires_at`,
        documentId,
        session.user.id,
        session.user.name,
        now,
        expiresAt
      );

      await recordAuditLog(db, {
        orgId: session.org.id,
        userId: session.user.id,
        userName: session.user.name,
        action: "LOCK_ACQUIRE",
        targetId: documentId,
        details: { documentName: targetDocName, ttlSeconds: LOCK_TTL_MS / 1000 },
        ipAddress: clientIp,
      });

      return jsonResponse({
        success: true,
        acquired: true,
        isLockedByMe: true,
        lock: {
          documentId,
          userId: session.user.id,
          userName: session.user.name,
          lockedAt: now,
          expiresAt,
          remainingSeconds: Math.round(LOCK_TTL_MS / 1000),
        },
      });
    }

    // 2. 心跳续约 (heartbeat)
    if (action === "heartbeat") {
      if (!currentLock) {
        return jsonResponse(
          { success: false, error: "Lock expired or not found. Please re-acquire." },
          409
        );
      }

      if (currentLock.locked_by_user_id !== session.user.id) {
        return jsonResponse(
          {
            success: false,
            error: `Lock was taken over by ${currentLock.locked_by_user_name}`,
            lock: currentLock,
          },
          409
        );
      }

      const nextExpires = now + LOCK_TTL_MS;
      await db.execute(
        `UPDATE document_locks SET expires_at = ? WHERE document_id = ?`,
        nextExpires,
        documentId
      );

      return jsonResponse({
        success: true,
        refreshed: true,
        expiresAt: nextExpires,
        remainingSeconds: Math.round(LOCK_TTL_MS / 1000),
      });
    }

    // 3. 主动释放锁 (unlock)
    if (action === "unlock") {
      if (currentLock && currentLock.locked_by_user_id === session.user.id) {
        await db.execute(`DELETE FROM document_locks WHERE document_id = ?`, documentId);
        await recordAuditLog(db, {
          orgId: session.org.id,
          userId: session.user.id,
          userName: session.user.name,
          action: "LOCK_RELEASE",
          targetId: documentId,
          details: { documentName: targetDocName },
          ipAddress: clientIp,
        });
      }
      return jsonResponse({ success: true, released: true });
    }

    // 4. 管理员强制接管 (takeover)
    if (action === "takeover") {
      const isOwnerOrAdmin = assertOrgRole(session.user.role, "admin");
      if (!isOwnerOrAdmin) {
        return errorResponse("Forbidden: Only organization administrators can force takeover document locks", 403);
      }

      const previousLocker = currentLock?.locked_by_user_name || "Unknown";
      const expiresAt = now + LOCK_TTL_MS;

      await db.execute(
        `INSERT INTO document_locks (document_id, locked_by_user_id, locked_by_user_name, locked_at, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(document_id) DO UPDATE SET
           locked_by_user_id = excluded.locked_by_user_id,
           locked_by_user_name = excluded.locked_by_user_name,
           locked_at = excluded.locked_at,
           expires_at = excluded.expires_at`,
        documentId,
        session.user.id,
        session.user.name,
        now,
        expiresAt
      );

      await recordAuditLog(db, {
        orgId: session.org.id,
        userId: session.user.id,
        userName: session.user.name,
        action: "LOCK_FORCE_TAKEOVER",
        targetId: documentId,
        details: {
          documentName: targetDocName,
          previousLocker,
        },
        ipAddress: clientIp,
      });

      return jsonResponse({
        success: true,
        acquired: true,
        isLockedByMe: true,
        message: `Successfully took over lock from ${previousLocker}`,
        lock: {
          documentId,
          userId: session.user.id,
          userName: session.user.name,
          lockedAt: now,
          expiresAt,
          remainingSeconds: Math.round(LOCK_TTL_MS / 1000),
        },
      });
    }

    return errorResponse("Invalid lock action", 400);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to process document lock", 500);
  }
}
