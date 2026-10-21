"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";
import { useEnterprise } from "../context/enterprise-auth-context";
import { fetchEnterpriseDashboard, EnterpriseDashboardData } from "@/lib/enterprise-api";
import { DashboardStatCard } from "./dashboard-stat-card";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardActivityFeed } from "./dashboard-activity-feed";
import { MemberManagementDialog } from "../members/member-management-dialog";
import { InvitationManagementDialog } from "../members/invitation-management-dialog";
import { RoleBadge } from "../permissions/permission-badge";
import {
  FileText,
  Users,
  Lock,
  Globe,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";

export function EnterpriseDashboardView() {
  const t = useExtracted();
  const router = useRouter();
  const { user, org, isAdmin } = useEnterprise();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnterpriseDashboardData | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchEnterpriseDashboard();
      if (res) setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxSeats = data?.organization.maxSeats || org?.maxSeats || 50;
  const currentMembers = data?.organization.currentMembers || 1;
  const seatPercent = Math.round((currentMembers / maxSeats) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* 顶部企业欢迎横幅 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 p-6 backdrop-blur-xl dark:border-white/10 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Building className="h-3 w-3" />
                {org?.name || data?.organization.name || "Enterprise"}
              </span>
              {user && <RoleBadge role={user.role} />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t({ id: "Enterprise.Dashboard.WelcomeBack", message: "Welcome back" })}, {user?.name}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t({ id: "Enterprise.Dashboard.SecurityProtected", message: "Protected by enterprise RBAC and Cloudflare isolated cloud storage." })}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/documents")}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              <span>{t({ id: "Enterprise.Dashboard.GoDocuments", message: "Open Documents" })}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 张核心 KPI 指标卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 文档总数 */}
        <DashboardStatCard
          title={t({ id: "Enterprise.Dashboard.TotalDocuments", message: "Enterprise Documents" })}
          value={data?.stats.documentsCount ?? 0}
          subtitle={t({ id: "Enterprise.Dashboard.InCloudStorage", message: "Stored securely in Cloudflare R2" })}
          icon={FileText}
        />

        {/* 团队席位配额 */}
        <DashboardStatCard
          title={t({ id: "Enterprise.Dashboard.TeamSeats", message: "Staff Capacity" })}
          value={`${currentMembers} / ${maxSeats}`}
          subtitle={`${seatPercent}% ${t({ id: "Enterprise.Dashboard.SeatsUsed", message: "seats occupied" })}`}
          icon={Users}
          progressPercent={seatPercent}
        />

        {/* 实时协同编辑锁 */}
        <DashboardStatCard
          title={t({ id: "Enterprise.Dashboard.ActiveLocks", message: "Active Collaborations" })}
          value={data?.stats.activeLocksCount ?? 0}
          subtitle={t({ id: "Enterprise.Dashboard.DocsBeingEdited", message: "Exclusive locks with auto-lease TTL" })}
          icon={Lock}
          trendText={data?.stats.activeLocksCount ? "Live" : "Idle"}
        />

        {/* 受控外部分享 */}
        <DashboardStatCard
          title={t({ id: "Enterprise.Dashboard.ExternalShares", message: "Controlled Shares" })}
          value={data?.stats.sharedCount ?? 0}
          subtitle={t({ id: "Enterprise.Dashboard.SharedExternally", message: "Protected by passcode & expiry" })}
          icon={Globe}
        />
      </div>

      {/* 快捷操作区 */}
      <DashboardQuickActions
        onOpenMembers={() => setMembersOpen(true)}
        onOpenInvitations={() => setInvitationsOpen(true)}
      />

      {/* 团队动态与安全审计流 */}
      <DashboardActivityFeed activities={data?.recentActivities || []} />

      {/* 弹窗：成员管理 */}
      <MemberManagementDialog
        isOpen={membersOpen}
        onClose={() => {
          setMembersOpen(false);
          loadData();
        }}
      />

      {/* 弹窗：邀请凭证管理 */}
      {isAdmin && (
        <InvitationManagementDialog
          isOpen={invitationsOpen}
          onClose={() => setInvitationsOpen(false)}
        />
      )}
    </div>
  );
}
