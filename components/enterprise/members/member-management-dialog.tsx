"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "../context/enterprise-auth-context";
import { EnterpriseUser, fetchEnterpriseMembers } from "@/lib/enterprise-api";
import { MemberTable } from "./member-table";
import { InviteMemberDialog } from "./invite-member-dialog";
import { Users, UserPlus, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface MemberManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberManagementDialog({ isOpen, onClose }: MemberManagementDialogProps) {
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
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  if (!isOpen) return null;

  const currentCount = members.length;
  const maxSeats = org?.maxSeats || 20;
  const usagePercent = Math.min(100, Math.round((currentCount / maxSeats) * 100));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>{org?.name || t({ id: "Enterprise.Members.WorkspaceTitle", message: "Workspace Members" })}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                    {t({ id: "Enterprise.Plan.LtdBadge", message: "Enterprise LTD" })}
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t({
                    id: "Enterprise.Members.Subtitle",
                    message: "Manage team accounts, assign roles, and allocate seats",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t({ id: "Enterprise.Members.AddBtn", message: "Add Member" })}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 席位配额卡片 */}
          <div className="my-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentCount} / {maxSeats}
                </span>{" "}
                {t({ id: "Enterprise.Members.SeatsUsed", message: "seats currently allocated" })}
              </div>
            </div>
            <div className="w-48 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    usagePercent >= 90 ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-500">{usagePercent}%</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
      </div>

      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        canGrantAdmin={isOwner}
        onSuccess={(newMember) => {
          setMembers((prev) => [...prev, newMember]);
        }}
      />
    </>
  );
}
