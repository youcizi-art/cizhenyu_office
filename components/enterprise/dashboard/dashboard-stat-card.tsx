"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  progressPercent?: number;
  trendText?: string;
}

export function DashboardStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  progressPercent,
  trendText,
}: DashboardStatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md dark:border-white/10 dark:bg-[#18181b]/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {trendText && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {trendText}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}

      {typeof progressPercent === "number" && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPercent > 90 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
