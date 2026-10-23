"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DocumentLockInfo,
  getDocumentLockStatus,
  acquireDocumentLock,
  heartbeatDocumentLock,
  releaseDocumentLock,
  takeoverDocumentLock,
} from "@/lib/enterprise-api";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import { toast } from "sonner";
import { useExtracted } from "next-intl";

interface UseDocumentLockOptions {
  docId: string | null;
  docName?: string;
  enabled?: boolean;
  onLockLost?: () => void;
}

export function useDocumentLock({
  docId,
  docName,
  enabled = true,
  onLockLost,
}: UseDocumentLockOptions) {
  const t = useExtracted();
  const { user, isAuthenticated } = useEnterprise();

  const [isLockedByMe, setIsLockedByMe] = useState<boolean>(false);
  const [currentLocker, setCurrentLocker] = useState<DocumentLockInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onLockLostRef = useRef(onLockLost);
  onLockLostRef.current = onLockLost;

  // 1. 尝试申请锁
  const acquire = useCallback(async () => {
    if (!docId || !isAuthenticated) return false;
    setLoading(true);
    try {
      const res = await acquireDocumentLock(docId, docName);
      if (res.success && res.acquired) {
        setIsLockedByMe(true);
        setCurrentLocker(res.lock || null);
        return true;
      } else {
        setIsLockedByMe(false);
        setCurrentLocker(res.lock || null);
        return false;
      }
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [docId, docName, isAuthenticated]);

  // 2. 检查锁状态
  const checkStatus = useCallback(async () => {
    if (!docId || !isAuthenticated) return;
    try {
      const res = await getDocumentLockStatus(docId);
      if (res.success) {
        if (res.isLocked) {
          setCurrentLocker(res.lock || null);
          setIsLockedByMe(Boolean(res.isLockedByMe));
        } else {
          setCurrentLocker(null);
          setIsLockedByMe(false);
        }
      }
    } catch {}
  }, [docId, isAuthenticated]);

  // 3. 释放锁
  const release = useCallback(async () => {
    if (!docId || !isAuthenticated) return;
    try {
      await releaseDocumentLock(docId, docName);
      setIsLockedByMe(false);
      setCurrentLocker(null);
    } catch {}
  }, [docId, docName, isAuthenticated]);

  // 4. 管理员强制接管
  const takeover = useCallback(async () => {
    if (!docId || !isAuthenticated) return false;
    setLoading(true);
    try {
      const res = await takeoverDocumentLock(docId, docName);
      if (res.success && res.acquired) {
        setIsLockedByMe(true);
        setCurrentLocker(res.lock || null);
        toast.success(
          t({
            id: "Enterprise.Lock.TakeoverSuccess",
            message: "Successfully took over edit lock for this document",
          })
        );
        return true;
      } else {
        toast.error(res.error || "Failed to takeover lock");
        return false;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to takeover lock");
      return false;
    } finally {
      setLoading(false);
    }
  }, [docId, docName, isAuthenticated, t]);

  // 进入页面自动申请或检查锁
  useEffect(() => {
    if (!docId || !isAuthenticated || !enabled) return;

    let active = true;
    (async () => {
      setLoading(true);
      const success = await acquire();
      if (!active) return;
      if (!success) {
        await checkStatus();
      }
      setLoading(false);
    })();

    // 页面卸载或关闭标签页时利用 sendBeacon 或 releaseDocumentLock 快速释放
    const handleUnload = () => {
      if (docId && isLockedByMe) {
        try {
          const url = `/api/enterprise/documents/${encodeURIComponent(docId)}/lock`;
          const payload = JSON.stringify({ action: "unlock" });
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon(url, blob);
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      active = false;
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [docId, isAuthenticated, enabled, acquire, checkStatus, isLockedByMe]);

  // 定时心跳续约 (持锁状态下每 20 秒执行一次)
  useEffect(() => {
    if (!docId || !isLockedByMe || !enabled) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const res = await heartbeatDocumentLock(docId);
        if (!res.success) {
          // 锁失效或被接管
          setIsLockedByMe(false);
          setCurrentLocker(res.lock || null);
          toast.warning(
            t({
              id: "Enterprise.Lock.LostWarning",
              message: "Document lock was lost or taken over. Switched to read-only view.",
            })
          );
          onLockLostRef.current?.();
        }
      } catch {}
    }, 20 * 1000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [docId, isLockedByMe, enabled, t]);

  return {
    isLockedByMe,
    currentLocker,
    loading,
    acquire,
    release,
    takeover,
    refreshStatus: checkStatus,
  };
}
