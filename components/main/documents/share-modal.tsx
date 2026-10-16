"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Globe,
  KeyRound,
  RefreshCw,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { DocumentMeta } from "@/lib/api";

// 随机生成 4 位字母数字提取密钥
function generatePasscode(): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface ShareModalProps {
  open: boolean;
  doc: DocumentMeta | null;
  shareUrl: string;
  copied: boolean;
  onClose: () => void;
  onEnableShare: (passcode?: string, shareMode?: "download" | "preview") => void | Promise<void>;
  onDisableShare: () => void | Promise<void>;
  onCopy: (fullText: string) => void;
}

/**
 * 分享链接配置弹窗
 * 支持公开下载、密钥提取，以及 Markdown 独有的网页展示分享模式
 */
export function ShareModal({
  open,
  doc,
  shareUrl,
  copied,
  onClose,
  onEnableShare,
  onDisableShare,
  onCopy,
}: ShareModalProps) {
  const t = useExtracted();
  const [usePasscode, setUsePasscode] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [shareMode, setShareMode] = useState<"download" | "preview">("download");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleEnableShareClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEnableShare(usePasscode ? passcode.trim() : undefined, shareMode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableShareClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDisableShare();
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (doc) {
      if (doc.sharePassword) {
        setUsePasscode(true);
        setPasscode(doc.sharePassword);
      } else {
        setUsePasscode(false);
        setPasscode(generatePasscode());
      }
      const canPreview = doc.type === "md" || doc.type === "image" || doc.type === "video" || doc.type === "audio";
      setShareMode(canPreview && doc.shareMode === "preview" ? "preview" : "download");
    }
  }, [doc]);

  if (!open || !doc) return null;

  const canPreview =
    doc.type === "md" ||
    doc.type === "image" ||
    doc.type === "video" ||
    doc.type === "audio";

  const effectiveUrl =
    canPreview && shareMode === "preview"
      ? shareUrl.includes("mode=preview")
        ? shareUrl
        : `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}mode=preview`
      : shareUrl.replace(/[?&]mode=preview/, "");

  const handleCopyShare = () => {
    if (usePasscode && passcode.trim()) {
      const linkWithPwd = effectiveUrl.includes("?")
        ? `${effectiveUrl}&pwd=${encodeURIComponent(passcode.trim())}`
        : `${effectiveUrl}?pwd=${encodeURIComponent(passcode.trim())}`;
      const text = `${t({ id: "ShareLinkText", message: "Link" })}: ${linkWithPwd}  ${t({ id: "PasscodeText", message: "Passcode" })}: ${passcode.trim()}`;
      onCopy(text);
    } else {
      onCopy(effectiveUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Share2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {t({ id: "PublicShareTitle", message: "Share Document Link" })}
          </h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {t({ id: "DocumentLabel", message: "Document: " })}
          <strong className="text-foreground">{doc.name}</strong>
        </p>

        {doc.shareToken ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  {doc.shareMode === "preview" ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t({ id: "SharePreviewActive", message: "Web Preview Sharing Active" })}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t({ id: "DirectDownloadLink", message: "Direct Download Link" })}</span>
                    </>
                  )}
                </span>
                {doc.sharePassword && (
                  <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    {t({ id: "Passcode", message: "Passcode" })}: {doc.sharePassword}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={effectiveUrl}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t({ id: "Copied", message: "Copied" }) : t({ id: "Copy", message: "Copy" })}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDisableShareClick}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSubmitting
                    ? t({ id: "DisablingShare", message: "Disabling..." })
                    : t({ id: "DisableShare", message: "Disable Sharing" })}
                </span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                {t({ id: "Close", message: "Close" })}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t({
                id: "DirectDownloadDesc",
                message: "Visitors with this link can download or view the document directly without workspace login.",
              })}
            </p>

            {/* 可在线展示格式：分享方式选择（下载 vs 展示） */}
            {canPreview && (
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                <span className="text-xs font-medium text-foreground block">
                  {t({ id: "ShareMode", message: "Share Mode" })}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareMode("download")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      shareMode === "download"
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t({ id: "ShareDownloadMode", message: "Direct Download" })}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareMode("preview")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      shareMode === "preview"
                        ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t({ id: "SharePreviewMode", message: "Web Preview (Online View)" })}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 提取密钥选项配置 */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={usePasscode}
                  onChange={(e) => setUsePasscode(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  {t({ id: "EnableSharePassword", message: "Enable Access Passcode Protection" })}
                </span>
              </label>

              {usePasscode && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={t({ id: "SharePasswordPlaceholder", message: "4-8 character passcode..." })}
                    maxLength={12}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-hidden focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setPasscode(generatePasscode())}
                    className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title={t({ id: "GenerateRandomKey", message: "Generate random key" })}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t({ id: "Randomize", message: "Randomize" })}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                {t({ id: "Cancel", message: "Cancel" })}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleEnableShareClick}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSubmitting
                    ? t({ id: "EnablingShare", message: "Enabling..." })
                    : t({ id: "EnableShare", message: "Enable Sharing" })}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
