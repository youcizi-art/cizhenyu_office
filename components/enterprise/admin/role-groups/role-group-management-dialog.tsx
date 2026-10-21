"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  RoleGroup,
  PermissionRule,
  fetchRoleGroups,
  createRoleGroup,
  fetchRoleGroupRules,
} from "@/lib/enterprise-permissions-api";
import { PermissionRuleBuilder } from "./permission-rule-builder";
import { PermissionInspector } from "./permission-inspector";
import {
  Shield,
  Plus,
  Users,
  Settings,
  X,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleGroupManagementDialog({ isOpen, onClose }: Props) {
  const t = useExtracted();
  const [activeTab, setActiveTab] = useState<"groups" | "inspector">("groups");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rules, setRules] = useState<PermissionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // 创建角色组表单状态
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRoleGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch {
      // 容错
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const loadRules = useCallback(async (groupId: string) => {
    setRulesLoading(true);
    try {
      const data = await fetchRoleGroupRules(groupId);
      setRules(data);
    } catch {
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen, loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      loadRules(selectedGroupId);
    }
  }, [selectedGroupId, loadRules]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const created = await createRoleGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
      });
      toast.success(t({ id: "Enterprise.RBAC.GroupCreated", message: "Role group created" }));
      setIsCreating(false);
      setNewGroupName("");
      setNewGroupDesc("");
      await loadGroups();
      setSelectedGroupId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create role group");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t({ id: "Enterprise.RBAC.DialogTitle", message: "Enterprise RBAC & Permission Matrix" })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t({
                  id: "Enterprise.RBAC.DialogDesc",
                  message: "Configure 4-dimensional security scopes and preview inheritance trees.",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab 切换 */}
            <div className="flex rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === "groups"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span>{t({ id: "Enterprise.RBAC.TabGroups", message: "Role Groups" })}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inspector")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === "inspector"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  <span>{t({ id: "Enterprise.RBAC.TabInspector", message: "Inheritance Preview" })}</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "inspector" ? (
            <PermissionInspector />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* 左侧角色组列表 */}
              <div className="md:col-span-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t({ id: "Enterprise.RBAC.RoleGroupsList", message: "Groups" })}
                  </span>
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title={t({ id: "Create", message: "Create" })}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isCreating && (
                  <form
                    onSubmit={handleCreateGroup}
                    className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Group Name (e.g. Legal, Finance)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Optional description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-2 py-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        {t({ id: "Cancel", message: "Cancel" })}
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-3 py-1 rounded bg-primary text-primary-foreground font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : t({ id: "Save", message: "Save" })}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-1.5">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedGroupId === g.id
                            ? "border-primary bg-primary/10 shadow-xs"
                            : "border-border/60 bg-background/50 hover:bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{g.name}</span>
                          {g.isSystem && (
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              System
                            </span>
                          )}
                        </div>
                        {g.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{g.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{g.memberCount} members</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 右侧规则配置区 */}
              <div className="md:col-span-8 border-t md:border-t-0 md:border-l border-border md:pl-6 pt-4 md:pt-0">
                {selectedGroup ? (
                  rulesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <PermissionRuleBuilder
                      roleGroupId={selectedGroup.id}
                      roleGroupName={selectedGroup.name}
                      rules={rules}
                      onRulesChanged={() => loadRules(selectedGroup.id)}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">{t({ id: "Enterprise.RBAC.SelectGroupTip", message: "Select a role group to manage permissions" })}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
