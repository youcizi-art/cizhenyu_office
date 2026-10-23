"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { EnterpriseUser, updateEnterpriseMember } from "@/lib/enterprise-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditMemberDialogProps {
  isOpen: boolean;
  user: EnterpriseUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMemberDialog({
  isOpen,
  user,
  onClose,
  onSuccess,
}: EditMemberDialogProps) {
  const t = useExtracted();
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "member");
  const [status, setStatus] = useState(user?.status || "active");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await updateEnterpriseMember(user.id, {
        name: name.trim(),
        role: role as any,
        status: status as any,
      });

      if (res.success) {
        toast.success(t({ id: "Enterprise.Members.UpdateSuccess", message: "Member updated successfully" }));
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to update member");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t({ id: "Enterprise.Members.EditMemberTitle", message: "Edit Team Member" })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t({ id: "Enterprise.Members.Email", message: "Email Address" })}
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full h-9 px-3 rounded-lg border border-border bg-muted/60 text-muted-foreground text-xs opacity-70 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t({ id: "Enterprise.Members.Name", message: "Display Name" })}
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Wang"
              required
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {t({ id: "Enterprise.Members.Role", message: "Role" })}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                disabled={user.role === "owner"}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-primary"
              >
                <option value="member">Member</option>
                <option value="admin">Administrator</option>
                {user.role === "owner" && <option value="owner">Owner</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {t({ id: "Enterprise.Members.Status", message: "Status" })}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                disabled={user.role === "owner"}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t({ id: "Save", message: "Save Changes" })}</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
