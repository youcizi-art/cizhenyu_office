"use client";

import React from "react";
import {
  X,
  Download,
  Share2,
  Tag,
  FolderInput,
  Edit3,
  Trash2,
  HardDrive,
  Clock,
  Calendar,
  Folder,
  AlertCircle,
  File as FileGeneric,
} from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";
import { DocumentMeta, Category } from "@/lib/api";
import { getDocConfig } from "@/lib/document-types";
import { formatRelativeTime } from "@/utils/recent-files";
import { cn } from "@/lib/utils";

interface FileDetailsModalProps {
  doc: DocumentMeta | null;
  categories: Category[];
  onClose: () => void;
  onDownload: (doc: DocumentMeta) => void;
  onShare: (doc: DocumentMeta) => void;
  onEditTags: (doc: DocumentMeta) => void;
  onMove: (doc: DocumentMeta) => void;
  onRename: (doc: DocumentMeta) => void;
  onDelete: (doc: DocumentMeta) => void;
}

/**
 * 针对不可在线编辑的其他类型文件（Other）的详情与操作弹窗
 */
export function FileDetailsModal({
  doc,
  categories,
  onClose,
  onDownload,
  onShare,
  onEditTags,
  onMove,
  onRename,
  onDelete,
}: FileDetailsModalProps) {
  const t = useExtracted();

  if (!doc) return null;

  const docCfg = getDocConfig(doc.type);
  const category = categories.find((c) => c.id === doc.categoryId);
  const categoryName = category ? category.name : t({ id: "UnclassifiedCategory", message: "Unclassified (Root)" });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground space-y-5">
        {/* 顶部标题与关闭按钮 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-xl shrink-0", docCfg.lightBgColor)}>
              <docCfg.icon className={cn("w-5 h-5", docCfg.color)} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t({ id: "FileDetails", message: "File Details" })}
              </h2>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
                {doc.type}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 文件名与提示信息 */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground break-all" title={doc.name}>
            {doc.name}
          </p>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t({
                id: "UnsupportedEditorHint",
                message:
                  "This file format does not support online editing or inline preview. You can download the original file or share it.",
              })}
            </p>
          </div>
        </div>

        {/* 元信息网格 */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <HardDrive className="w-3.5 h-3.5" />
              {t({ id: "FileSize", message: "File Size" })}
            </span>
            <p className="font-semibold text-foreground">{(doc.size / 1024).toFixed(1)} KB</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Folder className="w-3.5 h-3.5" />
              {t({ id: "CategoryLabel", message: "Category" })}
            </span>
            <p className="font-semibold text-foreground truncate">{categoryName}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {t({ id: "UpdatedTime", message: "Updated At" })}
            </span>
            <p className="font-medium text-foreground text-[11px]">
              {formatRelativeTime(doc.updatedAt)} ({formatDate(doc.updatedAt)})
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {t({ id: "CreatedTime", message: "Created At" })}
            </span>
            <p className="font-medium text-foreground text-[11px]">
              {formatDate(doc.createdAt)}
            </p>
          </div>
        </div>

        {/* 标签 */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Tag className="w-3.5 h-3.5 text-sky-500" />
              {t({ id: "TagsLabel", message: "Tags" })}
            </span>
            <div className="flex flex-wrap gap-1">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 快捷操作区 */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRename(doc);
              }}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={t({ id: "Rename", message: "Rename" })}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onMove(doc);
              }}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={t({ id: "MoveCategory", message: "Move Category" })}
            >
              <FolderInput className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditTags(doc);
              }}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={t({ id: "EditTags", message: "Edit Tags" })}
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(doc);
              }}
              className="p-2 rounded-xl border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
              title={t({ id: "DeletePermanently", message: "Delete" })}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onShare(doc);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t({ id: "ShareLink", message: "Share Link" })}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload(doc);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t({ id: "DownloadFile", message: "Download" })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
