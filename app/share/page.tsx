"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Download,
  Globe,
  Loader2,
  AlertCircle,
  Clock,
  HardDrive,
  Edit,
  KeyRound,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { getDocConfig } from "@/lib/document-types";
import {
  getShareInfo,
  getShareDownloadUrl,
  getShareContent,
  checkAuth,
  DocumentType,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/recent-files";
import { MarkdownPreviewView } from "@/components/editor/markdown-preview-view";

function ShareDownloadContent() {
  const t = useExtracted();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const initialKey = searchParams.get("pwd") || searchParams.get("key") || "";
  const queryMode = searchParams.get("mode") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [docInfo, setDocInfo] = useState<{
    name: string;
    type: DocumentType;
    size: number;
    updatedAt: number;
    requiresPassword?: boolean;
    shareMode?: "download" | "preview";
  } | null>(null);

  const [passcode, setPasscode] = useState<string>(initialKey);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Markdown 在线展示内容状态
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  // 判断是否处于 Markdown 展示分享模式
  const isPreviewMode =
    docInfo?.type === "md" &&
    (docInfo.shareMode === "preview" || queryMode === "preview");

  useEffect(() => {
    async function init() {
      if (!token) {
        setError(t({ id: "ShareTokenMissing", message: "Share token is missing or invalid" }));
        setLoading(false);
        return;
      }
      try {
        const info = await getShareInfo(token);
        setDocInfo(info);

        const isMdPreview =
          info.type === "md" &&
          (info.shareMode === "preview" || queryMode === "preview");

        // 若为 Markdown 在线展示分享且免密，或 URL 已带密钥，尝试预拉取内容
        if (isMdPreview) {
          if (!info.requiresPassword) {
            const content = await getShareContent(token);
            setMarkdownContent(content);
          } else if (initialKey.trim()) {
            try {
              const content = await getShareContent(token, initialKey.trim());
              setMarkdownContent(content);
            } catch {
              // 初始密钥无效，停留在输入密码界面
            }
          }
        }

        const authRes = await checkAuth();
        setIsAdmin(authRes.authenticated);
      } catch (err) {
        setError(
          String(err).replace("Error: ", "") ||
            t({ id: "ShareLinkInvalid", message: "Share link does not exist or has expired" })
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token, initialKey, queryMode, t]);

  // 处理下载动作
  const triggerDownloadAction = (downloadUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !docInfo) return;

    if (docInfo.requiresPassword) {
      if (!passcode.trim()) {
        setPasscodeError(t({ id: "EnterPasscodeHint", message: "Please enter access passcode" }));
        return;
      }
      setPasscodeError("");
      setIsVerifying(true);

      try {
        const testUrl = getShareDownloadUrl(token, passcode.trim());
        const probeRes = await fetch(testUrl, { method: "HEAD" });
        if (probeRes.status === 403) {
          setPasscodeError(t({ id: "InvalidPasscode", message: "Incorrect passcode. Please try again." }));
          setIsVerifying(false);
          return;
        }
        if (!probeRes.ok) {
          setPasscodeError(t({ id: "DownloadFailed", message: "Download failed, please try again later" }));
          setIsVerifying(false);
          return;
        }

        toast.success(t({ id: "Unlocked", message: "Access Granted, starting download..." }));
        triggerDownloadAction(testUrl, docInfo.name);
      } catch {
        triggerDownloadAction(getShareDownloadUrl(token, passcode.trim()), docInfo.name);
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // 免密公开下载
    triggerDownloadAction(getShareDownloadUrl(token), docInfo.name);
  };

  // 处理 Markdown 在线预览验证提取
  const handleVerifyPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docInfo) return;
    if (!passcode.trim()) {
      setPasscodeError(t({ id: "EnterPasscodeHint", message: "Please enter access passcode" }));
      return;
    }

    setPasscodeError("");
    setIsVerifying(true);

    try {
      const content = await getShareContent(token, passcode.trim());
      setMarkdownContent(content);
      toast.success(t({ id: "Unlocked", message: "Access Granted, loading document..." }));
    } catch (err) {
      setPasscodeError(
        String(err).includes("403") || String(err).includes("错误")
          ? t({ id: "InvalidPasscode", message: "Incorrect passcode. Please try again." })
          : t({ id: "DownloadFailed", message: "Verification failed, please try again later" })
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // 防止页面横向溢出
  useEffect(() => {
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = prev;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            {t({ id: "LoadingShareInfo", message: "Fetching shared file information..." })}
          </p>
        </div>
      </div>
    );
  }

  if (error || !docInfo) {
    return (
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] p-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            {t({ id: "CannotAccessShare", message: "Cannot access shared content" })}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {error ||
              t({
                id: "ShareLinkExpiredHint",
                message: "This share link might have been revoked or the document has been deleted.",
              })}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            {t({ id: "BackToHome", message: "Back to Home" })}
          </button>
        </div>
      </div>
    );
  }

  // 若处于 Markdown 在线展示分享模式，且内容已成功载入，渲染专门的只读网页阅读器
  if (isPreviewMode && markdownContent !== null) {
    return (
      <MarkdownPreviewView
        content={markdownContent}
        docName={docInfo.name}
        docSize={docInfo.size}
        updatedAt={docInfo.updatedAt}
        onDownload={() => handleDownload()}
      />
    );
  }

  const docCfg = getDocConfig(docInfo.type);

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] p-4 font-sans text-foreground">
      {/* 背景氛围渐变 */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141416]/90 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-center mb-6">
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center shadow-md ring-8 ring-primary/5",
              docCfg.lightBgColor
            )}
          >
            <docCfg.icon className={cn("w-10 h-10", docCfg.color)} />
          </div>
        </div>

        <div className="text-center mb-6">
          {isPreviewMode ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-2">
              <Eye className="w-3.5 h-3.5" />
              {t({ id: "MarkdownSharedPreview", message: "Markdown Online Preview" })}
            </span>
          ) : docInfo.requiresPassword ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              {t({ id: "PasscodeProtected", message: "Passcode Protected" })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <Globe className="w-3.5 h-3.5" />
              {t({ id: "PublicDirectDownload", message: "Direct Public Download" })}
            </span>
          )}

          <h1
            className="text-xl font-bold tracking-tight text-foreground truncate px-2"
            title={docInfo.name}
          >
            {docInfo.name}
          </h1>

          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {(docInfo.size / 1024).toFixed(1)} KB
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(docInfo.updatedAt)}
            </span>
          </div>
        </div>

        {/* 提取码输入表单 (如果需要密钥) */}
        {docInfo.requiresPassword ? (
          <form
            onSubmit={isPreviewMode ? handleVerifyPreview : handleDownload}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>{t({ id: "Passcode", message: "Access Passcode" })}</span>
                <span className="text-[11px] text-muted-foreground">
                  {isPreviewMode
                    ? t({ id: "EnterKeyToView", message: "Enter passcode to read document online" })
                    : t({ id: "EnterKeyToExtract", message: "Enter passcode to download" })}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError("");
                  }}
                  placeholder={t({ id: "EnterPasscode", message: "Enter passcode" })}
                  maxLength={16}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-mono tracking-wider focus:outline-hidden transition-all",
                    passcodeError
                      ? "border-destructive ring-1 ring-destructive/40"
                      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  )}
                  autoFocus
                />
                <KeyRound className="absolute right-3.5 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {passcodeError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {passcodeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.99] disabled:opacity-70 transition-all cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t({ id: "VerifyingPasscode", message: "Verifying..." })}
                </>
              ) : isPreviewMode ? (
                <>
                  <Eye className="w-4 h-4" />
                  {t({ id: "ViewDocumentOnline", message: "Read Online" })}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {t({ id: "VerifyAndDownload", message: "Extract & Download" })}
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleDownload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {t({ id: "DownloadFileNow", message: "Download Document Now" })}
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.push("/documents")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-primary" />
              {t({ id: "AdminEnterWorkspace", message: "Admin: Enter Workspace" })}
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-border/60 pt-4 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t({
              id: "ShareFooterHint",
              message:
                "This is a shared read-only link for downloading original files. Only authorized workspace administrators can edit online.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ShareDownloadContent />
    </Suspense>
  );
}
