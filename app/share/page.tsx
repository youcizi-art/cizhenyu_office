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
} from "lucide-react";
import { getDocConfig } from "@/lib/document-types";
import { getShareInfo, getShareDownloadUrl, checkAuth, DocumentType } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/recent-files";

function ShareDownloadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [docInfo, setDocInfo] = useState<{
    name: string;
    type: DocumentType;
    size: number;
    updatedAt: number;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function init() {
      if (!token) {
        setError("分享凭证缺失或无效");
        setLoading(false);
        return;
      }
      try {
        const info = await getShareInfo(token);
        setDocInfo(info);

        const authRes = await checkAuth();
        setIsAdmin(authRes.authenticated);
      } catch (err) {
        setError(String(err).replace("Error: ", "") || "分享链接不存在或已失效");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  const handleDownload = () => {
    if (!token) return;
    const downloadUrl = getShareDownloadUrl(token);
    window.location.href = downloadUrl;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">正在获取分享文件信息...</p>
        </div>
      </div>
    );
  }

  if (error || !docInfo) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0c] p-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">无法访问分享内容</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {error || "此分享链接可能已被发布者关闭或该文档已被删除。"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const docCfg = getDocConfig(docInfo.type);

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0a0a0c] p-4 font-sans text-foreground">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <Globe className="w-3.5 h-3.5" />
            公开只读下载
          </span>
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

        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            立即免密下载
          </button>

          {isAdmin && (
            <button
              onClick={() => router.push("/documents")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-primary" />
              我是管理员，进入文档库
            </button>
          )}
        </div>

        <div className="mt-6 border-t border-border/60 pt-4 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            此链接为公开分享链接，仅支持直接下载原始文件。<br />
            文档所有权受保护，只有已登录管理员才拥有在线编辑权限。
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
        <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0c]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ShareDownloadContent />
    </Suspense>
  );
}
