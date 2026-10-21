"use client";

import React, { useState, useEffect } from "react";
import { useExtracted } from "next-intl";
import { createEnterpriseMember, EnterpriseUser } from "@/lib/enterprise-api";
import { RoleGroup, fetchRoleGroups } from "@/lib/enterprise-permissions-api";
import { UserPlus, Mail, Lock, User, Shield, Users, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: EnterpriseUser) => void;
  canGrantAdmin: boolean;
}

export function InviteMemberDialog({
  isOpen,
  onClose,
  onSuccess,
  canGrantAdmin,
}: InviteMemberDialogProps) {
  const t = useExtracted();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [availableGroups, setAvailableGroups] = useState<RoleGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroupsLoading(true);
      fetchRoleGroups()
        .then((groups) => {
          setAvailableGroups(groups);
          // 默认选中第一个或编辑器角色组，确保用户创建时具备权限
          const defaultGroup = groups.find((g) => g.id.includes("editor") || g.name.toLowerCase().includes("editor")) || groups[0];
          if (defaultGroup) {
            setSelectedGroupIds([defaultGroup.id]);
          }
        })
        .catch(() => {})
        .finally(() => setGroupsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (selectedGroupIds.length === 0) {
      toast.error(
        t({
          id: "Enterprise.Members.RoleGroupRequired",
          message: "Please select at least one Role Group for this member to grant permissions.",
        })
      );
      return;
    }

    setLoading(true);
    try {
      const res = await createEnterpriseMember({
        email,
        name: name || undefined,
        password,
        role,
        roleGroupIds: selectedGroupIds,
      });

      if (res.success && res.member) {
        toast.success(
          t({
            id: "Enterprise.Members.AddSuccess",
            message: "Member added successfully",
          })
        );
        onSuccess(res.member);
        onClose();
      } else {
        toast.error(
          res.error ||
            t({
              id: "Enterprise.Members.AddFailed",
              message: "Failed to add member",
            })
        );
      }
    } catch (e: any) {
      toast.error(
        e.message ||
          t({
            id: "Enterprise.Members.AddError",
            message: "Network error occurred",
          })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {t({ id: "Enterprise.Members.InviteTitle", message: "Add Team Member" })}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t({
                  id: "Enterprise.Members.InviteSubtitle",
                  message: "Create an account for your organization member",
                })}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 flex-1 overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Members.EmailLabel", message: "Member Email" })}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Members.NameLabel", message: "Display Name (Optional)" })}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice Smith"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Members.InitialPasswordLabel", message: "Initial Password" })}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Members.RoleLabel", message: "System Administrative Role" })}
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "member" | "viewer")}
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              >
                <option value="member">
                  {t({ id: "Enterprise.Role.MemberDesc", message: "Member (Can create & edit documents)" })}
                </option>
                <option value="viewer">
                  {t({ id: "Enterprise.Role.ViewerDesc", message: "Viewer (Read & comment only)" })}
                </option>
                {canGrantAdmin && (
                  <option value="admin">
                    {t({ id: "Enterprise.Role.AdminDesc", message: "Administrator (Manage members & documents)" })}
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* 权限角色组分配联动 */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t({ id: "Enterprise.Members.AssignRoleGroups", message: "Assign Role Groups (Permissions)" })}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                {selectedGroupIds.length} {t({ id: "Selected", message: "selected" })}
              </span>
            </div>

            {groupsLoading ? (
              <div className="py-4 flex justify-center items-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : availableGroups.length === 0 ? (
              <p className="text-xs text-amber-500">
                {t({ id: "Enterprise.Members.NoGroupsAvailable", message: "No role groups found. Please create one in Permissions page first." })}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                {availableGroups.map((g) => {
                  const isChecked = selectedGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border ${
                        isChecked
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500/40 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Users className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <div className="truncate">
                          <span className="text-xs font-medium">{g.name}</span>
                          {g.description && (
                            <span className="text-[10px] text-zinc-400 ml-1.5 truncate">
                              ({g.description})
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {t({
                id: "Enterprise.Members.RoleGroupTip",
                message: "Role groups determine document, category, tag and action permissions.",
              })}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              {t({ id: "Enterprise.Common.Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t({ id: "Enterprise.Common.Saving", message: "Adding..." })}</span>
                </>
              ) : (
                <span>{t({ id: "Enterprise.Members.ConfirmAdd", message: "Add Member" })}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
