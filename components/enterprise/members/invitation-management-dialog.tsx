"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  fetchEnterpriseInvitations,
  createEnterpriseInvitation,
  deleteEnterpriseInvitation,
  EnterpriseInvitation,
} from "@/lib/enterprise-api";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Clock,
  Check,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/recent-files";

interface InvitationManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvitationManagementDialog({
  isOpen,
  onClose,
}: InvitationManagementDialogProps) {
  const t = useExtracted();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<EnterpriseInvitation[]>([]);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 表单状态
  const [newRole, setNewRole] = useState<"admin" | "member" | "viewer">("member");
  const [maxUses, setMaxUses] = useState(1);
  const [validDays, setValidDays] = useState(7);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEnterpriseInvitations();
      if (res.invitations) {
        setInvitations(res.invitations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, loadInvitations]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createEnterpriseInvitation({
        role: newRole,
        maxUses,
        validDays,
      });
      if (res.success && res.invitation) {
        setInvitations((prev) => [res.invitation!, ...prev]);
        toast.success(
          t({ id: "Enterprise.Invite.Created", message: "Invitation code created successfully" })
        );
      } else {
        toast.error(res.error || "Failed to create invitation");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteEnterpriseInvitation(id);
      if (res.success) {
        setInvitations((prev) => prev.filter((item) => item.id !== id));
        toast.success(
          t({ id: "Enterprise.Invite.Revoked", message: "Invitation code revoked" })
        );
      }
    } catch {
      toast.error("Failed to revoke invitation");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(t({ id: "Enterprise.Invite.Copied", message: "Code copied to clipboard" }));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t({ id: "Enterprise.Invite.DialogTitle", message: "Security Invitation Codes" })}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.Invite.DialogDesc",
                  message: "Generate controlled one-time or multi-use invitation credentials for new staff.",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4">
          {/* 生成新邀请码卡片 */}
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3"
          >
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>{t({ id: "Enterprise.Invite.GenerateNew", message: "Generate New Invitation" })}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t({ id: "Enterprise.Invite.Role", message: "Assigned Role" })}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="member">
                    {t({ id: "Enterprise.Role.Member", message: "Member (Standard)" })}
                  </option>
                  <option value="admin">
                    {t({ id: "Enterprise.Role.Admin", message: "Admin (Manager)" })}
                  </option>
                  <option value="viewer">
                    {t({ id: "Enterprise.Role.Viewer", message: "Viewer (Restricted - No Download)" })}
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t({ id: "Enterprise.Invite.MaxUses", message: "Usage Limit" })}
                </label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value={1}>{t({ id: "Enterprise.Invite.Once", message: "1 Time (Single User)" })}</option>
                  <option value={5}>5 {t({ id: "Enterprise.Invite.Times", message: "Times" })}</option>
                  <option value={20}>20 {t({ id: "Enterprise.Invite.Times", message: "Times (Batch)" })}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {t({ id: "Enterprise.Invite.Validity", message: "Validity Period" })}
                </label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value={3}>3 {t({ id: "Days", message: "Days" })}</option>
                  <option value={7}>7 {t({ id: "Days", message: "Days" })}</option>
                  <option value={30}>30 {t({ id: "Days", message: "Days" })}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{t({ id: "Enterprise.Invite.CreateBtn", message: "Create Code" })}</span>
              </button>
            </div>
          </form>

          {/* 已有邀请码列表 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t({ id: "Enterprise.Invite.ActiveCodes", message: "Active Credentials" })} ({invitations.length})
            </h4>

            {loading ? (
              <div className="py-8 flex justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                {t({ id: "Enterprise.Invite.NoCodes", message: "No active invitation codes. Generate one above." })}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {invitations.map((inv) => {
                  const isExpired = inv.expiresAt < Date.now();
                  const isExhausted = inv.usedCount >= inv.maxUses;
                  const isInactive = isExpired || isExhausted;

                  return (
                    <div
                      key={inv.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isInactive
                          ? "border-border/50 bg-slate-100/50 dark:bg-white/5 opacity-60"
                          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm font-bold tracking-wider text-foreground">
                          {inv.code}
                        </div>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                          {inv.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {inv.usedCount} / {inv.maxUses} {t({ id: "Used", message: "used" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isExpired
                            ? t({ id: "Expired", message: "Expired" })
                            : `${t({ id: "Expires", message: "Expires in" })} ${formatRelativeTime(inv.expiresAt)}`}
                        </span>

                        {!isInactive && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(inv.code)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCode === inv.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Revoke Code"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
