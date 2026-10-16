"use client";

import React, { useState } from "react";
import { Search, Upload, X, Tag, Move } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";

export interface DocumentTypeOption {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
}

interface DocumentsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeType: string;
  onTypeChange: (typeKey: string) => void;
  types: DocumentTypeOption[];
  displayTags: string[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  onOpenUpload: () => void;
  totalCount: number;
}

export function DocumentsToolbar({
  searchQuery,
  onSearchChange,
  activeType,
  onTypeChange,
  types,
  displayTags,
  selectedTag,
  onTagChange,
  onOpenUpload,
  totalCount,
}: DocumentsToolbarProps) {
  const t = useExtracted();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      {/* 桌面端顶部搜索与上传栏 */}
      <header className="hidden md:flex px-4 py-3 border-b border-border bg-card/30 items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t({ id: "SearchDocumentsPlaceholder", message: "Search documents..." })}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t({ id: "UploadFile", message: "Upload File" })}</span>
          </button>
        </div>
      </header>

      {/* 文档类型筛选栏与移动端极简操作入口 */}
      <div className="px-3 md:px-4 py-1.5 md:py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-2 text-xs">
        {/* 类型筛选滚动组 */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          {types.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => onTypeChange(type.key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1",
                activeType === type.key
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <type.icon className="w-3 h-3" />
              <span>{type.name}</span>
            </button>
          ))}
        </div>

        {/* 移动端专属收起操作图标群 (搜索 + 上传) */}
        <div className="flex md:hidden items-center gap-1 shrink-0 pl-1.5 border-l border-border/60">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className={cn(
              "p-1.5 rounded-lg border transition-colors cursor-pointer relative",
              searchQuery || mobileSearchOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            {searchQuery && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenUpload}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            aria-label="Upload"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 移动端展开的搜索浮层 */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 py-2 border-b border-border bg-card animate-in slide-in-from-top-2 duration-150">
          <div className="relative w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                placeholder={t({ id: "SearchDocumentsPlaceholder", message: "Search documents..." })}
                className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-hidden focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="px-2.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              {t({ id: "Close", message: "Close" })}
            </button>
          </div>
        </div>
      )}

      {/* 标签筛选栏 (单独占一行，置于文档类型下方) */}
      {displayTags.length > 0 && (
        <div className="px-3 md:px-4 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto text-xs animate-in fade-in">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 font-medium mr-1">
            <Tag className="w-3 h-3 text-sky-500" />
            <span>{t({ id: "FilterByTag", message: "Tags:" })}</span>
          </span>
          <button
            type="button"
            onClick={() => onTagChange(null)}
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer shrink-0",
              selectedTag === null
                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t({ id: "AllTags", message: "All" })}
          </button>
          {displayTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagChange(selectedTag === tag ? null : tag)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer shrink-0",
                selectedTag === tag
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 提示与拖拽辅助说明条 (仅桌面端展示，移动端直接隐藏节省空间) */}
      <div className="hidden md:flex px-4 py-1.5 bg-muted/10 border-b border-border/40 items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Move className="w-3 h-3 text-primary" />
          <span>{t({ id: "DragHint", message: "Hold card for 0.25s to drag and reorder" })}</span>
        </div>
        <span>
          {t("{count} documents", { count: String(totalCount) })}
        </span>
      </div>
    </>
  );
}
