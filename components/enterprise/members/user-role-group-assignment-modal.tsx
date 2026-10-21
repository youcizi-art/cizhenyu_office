"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  RoleGroup,
  fetchRoleGroups,
  assignUserRoleGroup,
  removeUserRoleGroup,
} from "@/lib/enterprise-permissions-api";
import { Shield, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  onChanged: () => void;
}

export function UserRoleGroupAssignmentModal({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
  onChanged,
}: Props) {
  const t = useExtracted();
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState<RoleGroup[]>([]);
  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set());
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await fetchRoleGroups();
      setAllGroups(groups);

      // 获取用户已分配的角色组
      const res = await fetch(`/api/permissions/user-groups?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.data || []).map((g: any) => g.id));
        setUserGroupIds(ids);
      }
    } catch {
      toast.error("Failed to load user role groups");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleToggle = async (groupId: string) => {
    const isAssigned = userGroupIds.has(groupId);
    setUpdatingGroupId(groupId);
    try {
      if (isAssigned) {
        await removeUserRoleGroup(userId, groupId);
        const next = new Set(userGroupIds);
        next.delete(groupId);
        setUserGroupIds(next);
        toast.success(t({ id: "Enterprise.RBAC.RoleGroupRemoved", message: "Role group unassigned" }));
      } else {
        await assignUserRoleGroup(userId, groupId);
        const next = new Set(userGroupIds);
        next.add(groupId);
        setUserGroupIds(next);
        toast.success(t({ id: "Enterprise.RBAC.RoleGroupAssigned", message: "Role group assigned" }));
      }
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role group assignment");
    } finally {
      setUpdatingGroupId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t({ id: "Enterprise.RBAC.AssignGroupsTitle", message: "Assign Role Groups" })}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                {userName} ({userEmail})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 角色组勾选列表 */}
        <div className="my-4 space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : allGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t({ id: "Enterprise.RBAC.NoGroupsCreated", message: "No custom role groups available. Please create groups first." })}
            </div>
          ) : (
            allGroups.map((g) => {
              const isChecked = userGroupIds.has(g.id);
              const isUpdating = updatingGroupId === g.id;

              return (
                <div
                  key={g.id}
                  onClick={() => !isUpdating && handleToggle(g.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-foreground">{g.name}</span>
                    {g.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{g.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
          >
            {t({ id: "Close", message: "Close" })}
          </button>
        </div>
      </div>
    </div>
  );
}
