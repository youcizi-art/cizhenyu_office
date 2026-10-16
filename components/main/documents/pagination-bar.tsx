"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useExtracted } from "next-intl";
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
  const t = useExtracted();

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
    <footer className="px-4 py-2.5 border-t border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* 左侧：条数范围信息 */}
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          {t("Showing {start} - {end} of {total} items", {
            start: String(startItem),
            end: String(endItem),
            total: String(total),
          })}
        </span>

        {/* 每页条数选择器 */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:outline-hidden focus:border-primary cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} {t({ id: "PageSizeLabel", message: "per page" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 右侧：页码切换按钮群 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label={t({ id: "PreviousPage", message: "Previous" })}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-muted-foreground">
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
                  "min-w-7 h-7 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center",
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
          className="p-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          aria-label={t({ id: "NextPage", message: "Next" })}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
