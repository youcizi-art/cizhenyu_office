"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100];

export function PaginationBar({
  currentPage,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  if (total === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  // 计算展示的页码序列（带省略号）
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <footer className="px-3 py-1.5 border-t border-border bg-card/70 backdrop-blur-xs flex items-center justify-between gap-2 text-xs shrink-0 select-none">
      {/* 左侧：纯数字条数信息与规格下拉选择 */}
      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
        <span className="font-mono text-[11px] font-medium text-foreground tracking-tight whitespace-nowrap">
          {startItem} - {endItem} <span className="text-muted-foreground font-normal">/</span> {total}
        </span>

        <div className="flex items-center pl-1.5 border-l border-border/60">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-6 px-1.5 rounded-md border border-border bg-background text-foreground text-[11px] font-mono focus:outline-hidden focus:border-primary cursor-pointer"
            aria-label="Items per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 右侧：翻页控制器 */}
      <div className="flex items-center gap-1 shrink-0">
        {/* 上一页 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-6 w-6 rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Previous"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* 移动端紧凑当前页显示 */}
        <div className="flex md:hidden items-center px-1 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">{currentPage}</span>
          <span className="mx-1">/</span>
          <span>{totalPages || 1}</span>
        </div>

        {/* 桌面端完整页码序列 */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-[11px]">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={cn(
                  "min-w-6 h-6 px-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center font-mono",
                  isCurrent
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "border border-border bg-background hover:bg-muted text-foreground"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* 下一页 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-6 w-6 rounded-md border border-border bg-background text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Next"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
