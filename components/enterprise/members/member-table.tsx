"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { EnterpriseUser, updateEnterpriseMember, deleteEnterpriseMember } from "@/lib/enterprise-api";
import { RoleBadge } from "../permissions/permission-badge";
import { Trash2, ShieldAlert, CheckCircle2, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MemberTableProps {
  members: EnterpriseUser[];
  currentUserId: string;
  isOwner: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function MemberTable({
  members,
  currentUserId,
  isOwner,
  isAdmin,
  onRefresh,
}: MemberTableProps) {
  const t = useExtracted();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (
    targetUser: EnterpriseUser,
    newRole: "admin" | "member" | "viewer"
  ) => {
    if (targetUser.id === currentUserId) return;
    setUpdatingId(targetUser.id);
    try {
      const res = await updateEnterpriseMember(targetUser.id, { role: newRole });
      if (res.success) {
        toast.success(
          t({
            id: "Enterprise.Members.RoleUpdated",
            message: "Member role updated successfully",
          })
        );
        onRefresh();
      } else {
        toast.error(res.error || t({ id: "Enterprise.Members.UpdateFailed", message: "Failed to update role" }));
      }
    } catch (e: any) {
      toast.error(e.message || "Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (targetUser: EnterpriseUser) => {
    if (targetUser.id === currentUserId) return;
    const nextStatus = targetUser.status === "active" ? "disabled" : "active";
    setUpdatingId(targetUser.id);
    try {
      const res = await updateEnterpriseMember(targetUser.id, { status: nextStatus });
      if (res.success) {
        toast.success(
          nextStatus === "active"
            ? t({ id: "Enterprise.Members.Activated", message: "Member account enabled" })
            : t({ id: "Enterprise.Members.Disabled", message: "Member account disabled" })
        );
        onRefresh();
      } else {
        toast.error(res.error || "Update status failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (targetUser: EnterpriseUser) => {
    if (targetUser.id === currentUserId) return;
    const confirmMsg = t({
      id: "Enterprise.Members.ConfirmDelete",
      message: "Are you sure you want to remove this member? Their access will be revoked immediately.",
    });
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(targetUser.id);
    try {
      const res = await deleteEnterpriseMember(targetUser.id);
      if (res.success) {
        toast.success(t({ id: "Enterprise.Members.Deleted", message: "Member removed from organization" }));
        onRefresh();
      } else {
        toast.error(res.error || "Failed to remove member");
      }
    } catch (e: any) {
      toast.error(e.message || "Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <th className="py-3 px-4">{t({ id: "Enterprise.Members.ColUser", message: "User" })}</th>
            <th className="py-3 px-4">{t({ id: "Enterprise.Members.ColRole", message: "Role" })}</th>
            <th className="py-3 px-4">{t({ id: "Enterprise.Members.ColStatus", message: "Status" })}</th>
            <th className="py-3 px-4 text-right">{t({ id: "Enterprise.Members.ColActions", message: "Actions" })}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
          {members.map((m) => {
            const isSelf = m.id === currentUserId;
            const isTargetOwner = m.role === "owner";
            const canModify = isAdmin && !isSelf && (!isTargetOwner || isOwner);

            return (
              <tr
                key={m.id}
                className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
              >
                {/* 姓名与邮箱 */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center text-xs">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{m.name}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-normal">
                            {t({ id: "Enterprise.Common.You", message: "You" })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{m.email}</div>
                    </div>
                  </div>
                </td>

                {/* 角色 */}
                <td className="py-3 px-4">
                  {canModify && !isTargetOwner ? (
                    <select
                      value={m.role}
                      disabled={updatingId === m.id}
                      onChange={(e) =>
                        handleRoleChange(m, e.target.value as "admin" | "member" | "viewer")
                      }
                      className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="member">
                        {t({ id: "Enterprise.Role.Member", message: "Member" })}
                      </option>
                      <option value="viewer">
                        {t({ id: "Enterprise.Role.Viewer", message: "Viewer" })}
                      </option>
                      {isOwner && (
                        <option value="admin">
                          {t({ id: "Enterprise.Role.Admin", message: "Admin" })}
                        </option>
                      )}
                    </select>
                  ) : (
                    <RoleBadge role={m.role} size="sm" />
                  )}
                </td>

                {/* 状态 */}
                <td className="py-3 px-4">
                  {m.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t({ id: "Enterprise.Members.Active", message: "Active" })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400 font-medium">
                      <Ban className="w-3.5 h-3.5" />
                      {t({ id: "Enterprise.Members.DisabledStatus", message: "Disabled" })}
                    </span>
                  )}
                </td>

                {/* 操作按键 */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canModify && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(m)}
                          disabled={updatingId === m.id}
                          title={
                            m.status === "active"
                              ? t({ id: "Enterprise.Members.DisableAction", message: "Disable User" })
                              : t({ id: "Enterprise.Members.EnableAction", message: "Enable User" })
                          }
                          className="p-1.5 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={updatingId === m.id}
                          title={t({ id: "Enterprise.Members.DeleteAction", message: "Remove User" })}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {updatingId === m.id && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
