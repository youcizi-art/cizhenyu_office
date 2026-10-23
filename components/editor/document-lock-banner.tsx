"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { DocumentLockInfo } from "@/lib/enterprise-api";
import { Lock, ShieldAlert, User, Clock, Loader2, ArrowRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DocumentLockBannerProps {
  isLockedByMe: boolean;
  currentLocker: DocumentLockInfo | null;
  canTakeover: boolean;
  onTakeover: () => Promise<boolean>;
  onRefresh: () => void;
  loading?: boolean;
}

export function DocumentLockBanner({
  isLockedByMe,
  currentLocker,
  canTakeover,
  onTakeover,
  onRefresh,
  loading = false,
}: DocumentLockBannerProps) {
  const t = useExtracted();
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState<boolean>(false);
  const [isTakingOver, setIsTakingOver] = useState<boolean>(false);

  // 如果没有锁或者自己持锁，不阻碍全宽横幅（自己持锁时展示紧凑微标识）
  if (isLockedByMe) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-medium">
          {t({ id: "Enterprise.Lock.EditingLockedByYou", message: "Exclusive Edit Lock Acquired" })}
        </span>
      </div>
    );
  }

  // 他人持锁，阻断并展示醒目的防冲突横幅
  if (!currentLocker) return null;

  const handleConfirmTakeover = async () => {
    setIsTakingOver(true);
    try {
      const ok = await onTakeover();
      if (ok) {
        setTakeoverDialogOpen(false);
      }
    } finally {
      setIsTakingOver(false);
    }
  };

  return (
    <>
      <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="font-semibold">
              {t({ id: "Enterprise.Lock.ReadOnlyMode", message: "Read-Only Mode" })}:
            </span>{" "}
            <span>
              {t({
                id: "Enterprise.Lock.CurrentlyEditedBy",
                message: "This document is currently being edited.",
              })}{" "}
              ({currentLocker.userName || "User"})
            </span>{" "}
            <span className="opacity-80">
              {t({
                id: "Enterprise.Lock.ModificationsLocked",
                message: "Changes are prevented to avoid saving conflicts.",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-background/60 hover:bg-background text-foreground transition-colors cursor-pointer text-xs"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t({ id: "Refresh", message: "Refresh" })}
          </button>

          {canTakeover && (
            <button
              type="button"
              onClick={() => setTakeoverDialogOpen(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-xs cursor-pointer text-xs"
            >
              <span>{t({ id: "Enterprise.Lock.ForceTakeover", message: "Force Takeover" })}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={takeoverDialogOpen}
        onClose={() => setTakeoverDialogOpen(false)}
        onConfirm={handleConfirmTakeover}
        title={t({ id: "Enterprise.Lock.TakeoverModalTitle", message: "Force Takeover Document Lock" })}
        description={
          t({
            id: "Enterprise.Lock.TakeoverModalDesc",
            message:
              "Taking over the lock will downgrade current editor to read-only view immediately. Any unsaved edits from them might be lost. Do you wish to proceed?",
          }) + ` (${currentLocker.userName || "User"})`
        }
        confirmText={t({ id: "Enterprise.Lock.ConfirmTakeover", message: "Takeover Lock" })}
        destructive
        loading={isTakingOver}
      />
    </>
  );
}
