"use client";

import React from "react";
import Image from "next/image";
import { Download, HardDrive, Clock, Music, Eye } from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";
import { DocumentType } from "@/lib/api";
import { getDocConfig } from "@/lib/document-types";
import { formatRelativeTime } from "@/utils/recent-files";
import { LanguageSwitcher } from "@/components/language-switcher";

interface MediaShareViewProps {
  mediaUrl: string;
  docName: string;
  docType: DocumentType;
  docSize: number;
  updatedAt: number;
  onDownload: () => void;
}

/**
 * 媒体文件（图片、视频、音频）全屏展示分享页面视图
 */
export function MediaShareView({
  mediaUrl,
  docName,
  docType,
  docSize,
  updatedAt,
  onDownload,
}: MediaShareViewProps) {
  const t = useExtracted();
  const docCfg = getDocConfig(docType);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-x-hidden selection:bg-primary selection:text-white">
      {/* 顶部轻量导航栏 */}
      <header className="h-14 border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 sticky top-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center shrink-0">
            <Image width={32} height={32} src="/logo.svg" className="w-8 h-8" alt="Logo" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-block font-extrabold text-sm tracking-wide text-white">
              CIZHENYU
            </span>
            <span className="hidden sm:inline-block text-white/30">•</span>
            <h1 className="text-xs sm:text-sm font-semibold truncate text-slate-200" title={docName}>
              {docName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 mr-2">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {(docSize / 1024).toFixed(1)} KB
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(updatedAt)}
            </span>
          </div>

          <LanguageSwitcher />

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t({ id: "Download", message: "Download" })}</span>
          </button>
        </div>
      </header>

      {/* 主体媒体展示区 */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* 背景光影 */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative z-10 w-full flex items-center justify-center max-w-5xl">
          {docType === "image" && (
            <div className="flex flex-col items-center max-w-full">
              <img
                src={mediaUrl}
                alt={docName}
                className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10 bg-slate-900/50 backdrop-blur-xs"
              />
            </div>
          )}

          {docType === "video" && (
            <div className="w-full flex justify-center">
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[82vh] max-w-4xl w-full rounded-2xl shadow-2xl bg-black border border-white/10"
              />
            </div>
          )}

          {docType === "audio" && (
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner animate-pulse">
                <Music className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400">
                  <Eye className="w-3 h-3" />
                  {t({ id: "AudioPreview", message: "Audio Online Playback" })}
                </span>
                <h2 className="text-base font-bold text-white truncate px-2" title={docName}>
                  {docName}
                </h2>
                <p className="text-xs text-slate-400">
                  {(docSize / 1024).toFixed(1)} KB · {formatRelativeTime(updatedAt)}
                </p>
              </div>
              <div className="w-full pt-2">
                <audio src={mediaUrl} controls autoPlay className="w-full" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
