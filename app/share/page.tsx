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
import { MediaShareView } from "@/components/share/media-share-view";
import { LanguageSwitcher } from "@/components/language-switcher";

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
    shareExpiresAt?: number;
  } | null>(null);

  const [passcode, setPasscode] = useState<string>(initialKey);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 在线展示内容状态
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [mediaVerified, setMediaVerified] = useState<boolean>(false);
  const [verifiedKey, setVerifiedKey] = useState<string>(initialKey);

  // 判断是否处于展示分享模式 (Markdown、图片、视频、音频)
  const docTypeLower = docInfo?.type?.toLowerCase() || "";
  const isPreviewableDoc =
    docTypeLower === "md" ||
    docTypeLower === "markdown" ||
    docTypeLower === "image" ||
    docTypeLower === "video" ||
    docTypeLower === "audio";

  const isPreviewMode =
    docInfo &&
    isPreviewableDoc &&
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

        const isMedia =
          info.type === "image" || info.type === "video" || info.type === "audio";
        const isMd = info.type === "md";
        const wantsPreview = info.shareMode === "preview" || queryMode === "preview";

        if (wantsPreview) {
          if (!info.requiresPassword) {
            if (isMd) {
              const content = await getShareContent(token);
              setMarkdownContent(content);
            } else if (isMedia) {
              setMediaVerified(true);
            }
          } else if (initialKey.trim()) {
            if (isMd) {
              try {
                const content = await getShareContent(token, initialKey.trim());
                setMarkdownContent(content);
                setVerifiedKey(initialKey.trim());
              } catch {
                // 初始密钥无效，停留在输入密码界面
              }
            } else if (isMedia) {
              try {
                const testUrl = getShareDownloadUrl(token, initialKey.trim(), true);
                const probeRes = await fetch(testUrl, { method: "HEAD" });
                if (probeRes.ok) {
                  setMediaVerified(true);
                  setVerifiedKey(initialKey.trim());
                }
              } catch {
                // 初始密钥无效
              }
            }
          }
        }

        const authRes = await checkAuth();
        setIsAdmin(authRes.authenticated);
      } catch (err) {
        const errMsg = String(err).replace("Error: ", "");
        const isExpiredMsg = errMsg.toLowerCase().includes("expired") || errMsg.includes("410");
        setError(
          isExpiredMsg
            ? t({
                id: "ShareLinkExpired",
                message: "This share link has expired and is no longer available",
              })
            : errMsg ||
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

  // 处理展示分享密码提取验证 (Markdown 与 媒体类型)
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
      if (docInfo.type === "md") {
        const content = await getShareContent(token, passcode.trim());
        setMarkdownContent(content);
        setVerifiedKey(passcode.trim());
        toast.success(t({ id: "Unlocked", message: "Access Granted, loading document..." }));
      } else {
        const testUrl = getShareDownloadUrl(token, passcode.trim(), true);
        const probeRes = await fetch(testUrl, { method: "HEAD" });
        if (probeRes.status === 403) {
          setPasscodeError(t({ id: "InvalidPasscode", message: "Incorrect passcode. Please try again." }));
          setIsVerifying(false);
          return;
        }
        setMediaVerified(true);
        setVerifiedKey(passcode.trim());
        toast.success(t({ id: "Unlocked", message: "Access Granted, loading preview..." }));
      }
    } catch (err) {
      setPasscodeError(
        String(err).includes("403") || String(err).includes("error")
          ? t({ id: "InvalidPasscode", message: "Incorrect passcode. Please try again." })
          : t({ id: "VerificationFailed", message: "Verification failed, please try again later" })
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // 防止页面横向溢出，并严禁公开分享页面弹出任何安装提示
  useEffect(() => {
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";

    // 移除 manifest 链接并拦截 beforeinstallprompt
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) {
      manifest.remove();
    }
    const blockInstall = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("beforeinstallprompt", blockInstall, true);

    return () => {
      document.body.style.overflowX = prev;
      window.removeEventListener("beforeinstallprompt", blockInstall, true);
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
      <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] p-4 text-foreground">
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher />
        </div>
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

  // Markdown 在线展示预览模式 (验证成功)
  if (isPreviewMode && docInfo.type === "md" && markdownContent !== null) {
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

  // 媒体在线展示分享模式 (免密直接展示，或输入密钥验证成功)
  const isMediaDoc =
    docTypeLower === "image" ||
    docTypeLower === "video" ||
    docTypeLower === "audio";

  if (isPreviewMode && isMediaDoc && (!docInfo.requiresPassword || mediaVerified)) {
    const inlineMediaUrl = getShareDownloadUrl(token, verifiedKey || undefined, true);
    return (
      <MediaShareView
        mediaUrl={inlineMediaUrl}
        docName={docInfo.name}
        docType={docInfo.type}
        docSize={docInfo.size}
        updatedAt={docInfo.updatedAt}
        onDownload={() => handleDownload()}
      />
    );
  }

  const docCfg = getDocConfig(docInfo.type);

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] p-4 font-sans text-foreground">
      {/* 顶部右上角多语言切换 */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

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
              {t({ id: "OnlineSharedPreview", message: "Online Web View" })}
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

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {(docInfo.size / 1024).toFixed(1)} KB
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(docInfo.updatedAt)}
            </span>
            {docInfo.shareExpiresAt && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {t({ id: "ValidUntil", message: "Valid until" })}:{" "}
                    {new Date(docInfo.shareExpiresAt).toLocaleDateString()}
                  </span>
                </span>
              </>
            )}
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
