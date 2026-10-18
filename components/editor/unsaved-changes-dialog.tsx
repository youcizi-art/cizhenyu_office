"use client";

import React from "react";
import { AlertTriangle, Save, LogOut, X, Loader2 } from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";

interface UnsavedChangesDialogProps {
  open: boolean;
  isSaving: boolean;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
  onCancel: () => void;
}

/**
 * 编辑器未保存修改退出确认弹窗
 * 覆盖 Word、Excel、PPT、Markdown 退出场景，防止意外丢失数据
 */
export function UnsavedChangesDialog({
  open,
  isSaving,
  onSaveAndExit,
  onDiscardAndExit,
  onCancel,
}: UnsavedChangesDialogProps) {
  const t = useExtracted();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground">
              {t({ id: "UnsavedChangesTitle", message: "Unsaved Changes" })}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t({
                id: "UnsavedChangesDesc",
                message:
                  "You have unsaved changes in this document. Leaving now will cause modifications to be lost. What would you like to do?",
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {t({ id: "KeepEditing", message: "Keep Editing" })}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={onDiscardAndExit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t({ id: "DiscardAndExit", message: "Discard and Leave" })}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveAndExit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isSaving
                ? t({ id: "Saving", message: "Saving..." })
                : t({ id: "SaveAndExit", message: "Save and Leave" })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
