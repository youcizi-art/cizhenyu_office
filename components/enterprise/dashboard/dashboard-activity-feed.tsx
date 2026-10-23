"use client";

import React from "react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { formatRelativeTime } from "@/utils/recent-files";
import { History, Shield, FileEdit, Share2, Key, UserPlus, ArrowRight } from "lucide-react";

interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: number;
}

interface DashboardActivityFeedProps {
  activities: ActivityItem[];
}

export function DashboardActivityFeed({ activities }: DashboardActivityFeedProps) {
  const t = useExtracted();

  const getActionBadge = (action: string) => {
    switch (action) {
      case "doc_edit":
      case "lock_acquire":
        return {
          icon: FileEdit,
          color: "text-blue-500 bg-blue-500/10",
          label: t({ id: "Enterprise.Activity.Edit", message: "Edited Document" }),
        };
      case "doc_share":
        return {
          icon: Share2,
          color: "text-emerald-500 bg-emerald-500/10",
          label: t({ id: "Enterprise.Activity.Share", message: "Created Share" }),
        };
      case "invite_accepted":
      case "member_add":
        return {
          icon: UserPlus,
          color: "text-purple-500 bg-purple-500/10",
          label: t({ id: "Enterprise.Activity.Joined", message: "Member Joined" }),
        };
      case "perm_change":
        return {
          icon: Key,
          color: "text-amber-500 bg-amber-500/10",
          label: t({ id: "Enterprise.Activity.Perm", message: "Permissions Changed" }),
        };
      default:
        return {
          icon: Shield,
          color: "text-slate-500 bg-slate-500/10",
          label: t({ id: "Enterprise.Activity.Action", message: "System Activity" }),
        };
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#18181b]/80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span>{t({ id: "Enterprise.Dashboard.RecentActivity", message: "Recent Team Activity" })}</span>
        </h3>
        <Link
          href="/audit-logs"
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors group cursor-pointer"
        >
          <span>{t({ id: "Enterprise.Dashboard.AuditLogsStream", message: "Audit Trail" })}</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t({ id: "Enterprise.Dashboard.NoActivities", message: "No recent activities recorded yet." })}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const badge = getActionBadge(item.action);
            const Icon = badge.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badge.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.userName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {badge.label}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-[11px] text-muted-foreground pl-2 font-mono">
                  {formatRelativeTime(item.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
