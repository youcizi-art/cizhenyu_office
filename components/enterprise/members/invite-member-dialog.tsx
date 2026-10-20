"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { createEnterpriseMember, EnterpriseUser } from "@/lib/enterprise-api";
import { UserPlus, Mail, Lock, User, Shield, X, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const res = await createEnterpriseMember({
        email,
        name: name || undefined,
        password,
        role,
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
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              {t({ id: "Enterprise.Members.RoleLabel", message: "Assigned Role" })}
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
