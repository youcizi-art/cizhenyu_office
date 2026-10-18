"use client";

import React from "react";
import { X, Download, HardDrive, Clock, Film, Music, Image as ImageIcon, File } from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";
import { DocumentMeta } from "@/lib/api";
import { formatRelativeTime } from "@/utils/recent-files";
import { cn } from "@/lib/utils";

interface MediaPreviewModalProps {
  open?: boolean;
  doc: DocumentMeta | null;
  onClose: () => void;
  onDownload?: (doc: DocumentMeta) => void;
}

/**
 * 媒体资源文件（图片/音视频）后台在线预览弹窗
 */
export function MediaPreviewModal({
  open,
  doc,
  onClose,
  onDownload,
}: MediaPreviewModalProps) {
  const t = useExtracted();

  const isOpen = typeof open === "boolean" ? open : !!doc;
  if (!isOpen || !doc) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(doc);
    } else {
      const a = document.createElement("a");
      a.href = `/api/documents/${encodeURIComponent(doc.id)}/content`;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 使用带 inline=true 的获取接口，服务端响应对应 Content-Type 且不强制弹下载
  const mediaUrl = `/api/documents/${encodeURIComponent(doc.id)}/content?inline=true`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl text-foreground overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              {doc.type === "image" ? (
                <ImageIcon className="w-4 h-4" />
              ) : doc.type === "video" ? (
                <Film className="w-4 h-4" />
              ) : doc.type === "audio" ? (
                <Music className="w-4 h-4" />
              ) : (
                <File className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate text-foreground" title={doc.name}>
                {doc.name}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-2.5 h-2.5" />
                  {(doc.size / 1024).toFixed(1)} KB
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatRelativeTime(doc.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t({ id: "DownloadFile", message: "Download" })}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title={t({ id: "Close", message: "Close" })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 媒体主体展示区 */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/10 dark:bg-black/30 min-h-[300px]">
          {doc.type === "image" && (
            <div className="relative max-w-full max-h-[70vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt={doc.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-border/50"
              />
            </div>
          )}

          {doc.type === "video" && (
            <div className="w-full max-w-3xl flex items-center justify-center">
              <video
                controls
                autoPlay
                playsInline
                src={mediaUrl}
                className="w-full max-h-[70vh] rounded-xl shadow-lg bg-black"
              >
                {t({ id: "BrowserVideoNotSupported", message: "Your browser does not support video playback." })}
              </video>
            </div>
          )}

          {doc.type === "audio" && (
            <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-lg flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner animate-pulse">
                <Music className="w-10 h-10" />
              </div>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-sm truncate text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(doc.size / 1024).toFixed(1)} KB</p>
              </div>
              <audio controls autoPlay src={mediaUrl} className="w-full mt-2">
                {t({ id: "BrowserAudioNotSupported", message: "Your browser does not support audio playback." })}
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
