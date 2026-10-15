"use client";

import React from "react";
import {
  FileText,
  Table,
  Presentation,
  Share2,
  Download,
  Trash2,
  Edit3,
  FolderInput,
  MoreVertical,
  Globe,
  Tag,
  Pin,
  PinOff,
  Eye,
  FileEdit,
  KeyRound,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { getDocConfig } from "@/lib/document-types";
import { formatRelativeTime } from "@/utils/recent-files";
import { DocumentMeta } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentCardProps {
  doc: DocumentMeta;
  onOpen: (doc: DocumentMeta) => void;
  onDownload: (doc: DocumentMeta) => void;
  onShare: (doc: DocumentMeta) => void;
  onRename: (doc: DocumentMeta) => void;
  onMove: (doc: DocumentMeta) => void;
  onDelete: (doc: DocumentMeta) => void;
  onTogglePin: (doc: DocumentMeta) => void;
  onEditTags: (doc: DocumentMeta) => void;
  onTagClick?: (tag: string) => void;
}

export function DocumentCard({
  doc,
  onOpen,
  onDownload,
  onShare,
  onRename,
  onMove,
  onDelete,
  onTogglePin,
  onEditTags,
  onTagClick,
}: DocumentCardProps) {
  const t = useExtracted();
  const docCfg = getDocConfig(doc.type);

  return (
    <div
      data-drag-doc-id={doc.id}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={() => onOpen(doc)}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-md cursor-pointer select-none",
        doc.pinned
          ? "border-primary/40 bg-primary/[0.02] shadow-2xs"
          : "border-border/80 hover:border-primary/30"
      )}
    >
      {/* 顶部行：图标、置顶徽章与更多操作菜单 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
              docCfg.lightBgColor
            )}
          >
            <docCfg.icon className={cn("w-5 h-5", docCfg.color)} />
          </div>

          {/* 置顶标识 */}
          {doc.pinned && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
              title={t({ id: "PinnedToTop", message: "Pinned to top" })}
            >
              <Pin className="w-2.5 h-2.5 fill-current" />
              <span>{t({ id: "Pinned", message: "Pinned" })}</span>
            </span>
          )}

          {/* 分享状态徽章 */}
          {doc.shareToken && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
                doc.shareMode === "preview"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  : doc.sharePassword
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              )}
              title={
                doc.shareMode === "preview"
                  ? t({ id: "DisplayShareActive", message: "Online web view share active" })
                  : doc.sharePassword
                  ? t({ id: "PasscodeShareActive", message: "Shared with access passcode" })
                  : t({ id: "PublicShareActive", message: "Public share link active" })
              }
            >
              {doc.shareMode === "preview" ? (
                <>
                  <Eye className="w-2.5 h-2.5" />
                  <span>{t({ id: "DisplayShare", message: "View" })}</span>
                  {doc.sharePassword && <KeyRound className="w-2.5 h-2.5 text-amber-500" />}
                </>
              ) : doc.sharePassword ? (
                <>
                  <KeyRound className="w-2.5 h-2.5" />
                  <span>{t({ id: "KeyShare", message: "Key" })}</span>
                </>
              ) : (
                <>
                  <Globe className="w-2.5 h-2.5" />
                  <span>{t({ id: "Public", message: "Public" })}</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* 独立操作 Popover 菜单 */}
        <div data-interactive="true" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                aria-label={t({ id: "MoreActions", message: "More actions" })}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1.5 rounded-xl text-xs space-y-0.5">
              <button
                onClick={() => onOpen(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                {doc.type === "pdf" ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-red-500" />
                    <span>{t({ id: "PreviewFile", message: "Preview" })}</span>
                  </>
                ) : (
                  <>
                    <FileEdit className="w-3.5 h-3.5 text-primary" />
                    <span>{t({ id: "EditOnline", message: "Edit Online" })}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onTogglePin(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                {doc.pinned ? (
                  <>
                    <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t({ id: "Unpin", message: "Unpin" })}</span>
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 text-primary" />
                    <span>{t({ id: "Pin", message: "Pin to Top" })}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onEditTags(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-sky-500" />
                <span>{t({ id: "EditTags", message: "Edit Tags" })}</span>
              </button>

              <button
                onClick={() => onShare(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t({ id: "ShareLink", message: "Share Link" })}</span>
              </button>

              <button
                onClick={() => onDownload(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t({ id: "DownloadFile", message: "Download" })}</span>
              </button>

              <div className="h-px bg-border my-1" />

              <button
                onClick={() => onRename(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t({ id: "Rename", message: "Rename" })}</span>
              </button>

              <button
                onClick={() => onMove(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <FolderInput className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t({ id: "MoveCategory", message: "Move Category" })}</span>
              </button>

              <button
                onClick={() => onDelete(doc)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t({ id: "DeletePermanently", message: "Delete" })}</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 文档名称 */}
      <h3
        className="font-semibold text-sm text-foreground truncate mb-1"
        title={doc.name}
      >
        {doc.name}
      </h3>

      {/* 标签列表 */}
      {doc.tags && doc.tags.length > 0 && (
        <div
          data-interactive="true"
          className="flex flex-wrap gap-1 my-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {doc.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 底部文件信息 */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
        <span>{(doc.size / 1024).toFixed(1)} KB</span>
        <span>{formatRelativeTime(doc.updatedAt)}</span>
      </div>
    </div>
  );
}
