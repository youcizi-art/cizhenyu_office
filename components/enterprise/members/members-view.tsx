"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import { EnterpriseUser, fetchEnterpriseMembers } from "@/lib/enterprise-api";
import { MemberTable } from "@/components/enterprise/members/member-table";
import { InviteMemberDialog } from "@/components/enterprise/members/invite-member-dialog";
import { EnterpriseAdminNav } from "@/components/enterprise/admin/enterprise-admin-nav";
import { Users, UserPlus, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function MembersView() {
  const t = useExtracted();
  const { user, org, isAdmin, isOwner } = useEnterprise();

  const [members, setMembers] = useState<EnterpriseUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEnterpriseMembers();
      if (res.success) {
        setMembers(res.members);
      } else {
        toast.error(res.error || "Failed to load members");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const currentCount = members.length;
  const maxSeats = org?.maxSeats || 20;
  const usagePercent = Math.min(100, Math.round((currentCount / maxSeats) * 100));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部企业管理页面导航 (权限角色 & 成员管理) */}
        <EnterpriseAdminNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{org?.name || t({ id: "Enterprise.Members.WorkspaceTitle", message: "Workspace Members" })}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                  {t({ id: "Enterprise.Plan.LtdBadge", message: "Enterprise LTD" })}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.Members.Subtitle",
                  message: "Manage team accounts, assign roles, and allocate seats",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t({ id: "Enterprise.Members.AddBtn", message: "Add Member" })}</span>
              </button>
            )}
          </div>
        </div>

        {/* 席位配额卡片 */}
        <div className="p-4 bg-background border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="text-sm font-bold text-foreground">
                {currentCount} / {maxSeats}
              </span>{" "}
              {t({ id: "Enterprise.Members.SeatsUsed", message: "seats currently allocated" })}
            </div>
          </div>
          <div className="w-full sm:w-64 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercent >= 90 ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">{usagePercent}%</span>
          </div>
        </div>

        {/* 成员表格卡片 */}
        <div className="bg-background border border-border rounded-2xl shadow-sm overflow-hidden p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">
                {t({ id: "Enterprise.Common.Loading", message: "Loading members..." })}
              </span>
            </div>
          ) : (
            <MemberTable
              members={members}
              currentUserId={user?.id || ""}
              isOwner={isOwner}
              isAdmin={isAdmin}
              onRefresh={loadMembers}
            />
          )}
        </div>
      </div>

      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        canGrantAdmin={isOwner}
        onSuccess={(newMember) => {
          setMembers((prev) => [...prev, newMember]);
        }}
      />
    </div>
  );
}
