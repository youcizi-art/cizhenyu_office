"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  fetchDocumentPermissions,
  setDocumentPermission,
  revokeDocumentPermission,
  fetchEnterpriseMembers,
  EnterpriseUser,
  DocPermissionItem,
} from "@/lib/enterprise-api";
import { DocPermissionBadge } from "./permission-badge";
import { Users, UserPlus, X, Trash2, Shield, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface DocPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  currentUserId: string;
}

export function DocPermissionDialog({
  isOpen,
  onClose,
  documentId,
  documentName,
  currentUserId,
}: DocPermissionDialogProps) {
  const t = useExtracted();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<DocPermissionItem[]>([]);
  const [allMembers, setAllMembers] = useState<EnterpriseUser[]>([]);

  // 邀请/授权新成员表单态
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"editor" | "commenter" | "viewer">("editor");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, memberRes] = await Promise.all([
        fetchDocumentPermissions(documentId),
        fetchEnterpriseMembers(),
      ]);

      if (permRes.success) {
        setPermissions(permRes.permissions);
      }
      if (memberRes.success) {
        setAllMembers(memberRes.members);
      }
    } catch {
      toast.error("Failed to load permission details");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadData();
    }
  }, [isOpen, documentId, loadData]);

  if (!isOpen) return null;

  // 过滤尚未获得该文档专属授权的团队成员
  const assignedUserIds = new Set(permissions.map((p) => p.userId));
  const availableMembers = allMembers.filter((m) => !assignedUserIds.has(m.id));

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      const res = await setDocumentPermission(documentId, selectedUserId, selectedRole);
      if (res.success) {
        toast.success(
          t({
            id: "Enterprise.Permissions.GrantSuccess",
            message: "Document access granted",
          })
        );
        setSelectedUserId("");
        loadData();
      } else {
        toast.error(res.error || "Failed to grant access");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    const confirmMsg = t({
      id: "Enterprise.Permissions.ConfirmRevoke",
      message: "Are you sure you want to revoke access for this user?",
    });
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await revokeDocumentPermission(documentId, userId);
      if (res.success) {
        toast.success(
          t({
            id: "Enterprise.Permissions.RevokeSuccess",
            message: "Access revoked",
          })
        );
        setPermissions((prev) => prev.filter((p) => p.userId !== userId));
      } else {
        toast.error(res.error || "Failed to revoke access");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {t({ id: "Enterprise.Permissions.Title", message: "Document Access & Sharing" })}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[280px]">
                {documentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 快速为新成员添加权限 */}
        <form onSubmit={handleGrant} className="my-4 flex items-center gap-2">
          <div className="flex-1">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <option value="">
                {t({ id: "Enterprise.Permissions.SelectUserPlaceholder", message: "Choose a team member..." })}
              </option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          >
            <option value="editor">
              {t({ id: "Enterprise.Permission.Editor", message: "Can Edit" })}
            </option>
            <option value="commenter">
              {t({ id: "Enterprise.Permission.Commenter", message: "Can Comment" })}
            </option>
            <option value="viewer">
              {t({ id: "Enterprise.Permission.Viewer", message: "Can View" })}
            </option>
          </select>

          <button
            type="submit"
            disabled={!selectedUserId || submitting}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            <span>{t({ id: "Enterprise.Permissions.GrantBtn", message: "Grant" })}</span>
          </button>
        </form>

        {/* 成员权限清单 */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="py-8 flex justify-center text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {t({
                id: "Enterprise.Permissions.NoCustomPerms",
                message: "No individual access rules yet. Team default permissions apply.",
              })}
            </div>
          ) : (
            permissions.map((p) => {
              const isSelf = p.userId === currentUserId;
              return (
                <div
                  key={p.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-center text-xs shrink-0">
                      {p.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        <span>{p.userName}</span>
                        {isSelf && (
                          <span className="text-[10px] px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {t({ id: "Enterprise.Common.You", message: "You" })}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {p.userEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <DocPermissionBadge permission={p.permission} size="sm" />
                    {!isSelf && (
                      <button
                        onClick={() => handleRevoke(p.userId)}
                        title={t({ id: "Enterprise.Permissions.RevokeAction", message: "Revoke Access" })}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            {t({ id: "Enterprise.Common.Close", message: "Close" })}
          </button>
        </div>
      </div>
    </div>
  );
}
