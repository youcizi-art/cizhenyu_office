"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  RoleGroup,
  PermissionRule,
  fetchRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
  fetchRoleGroupRules,
} from "@/lib/enterprise-permissions-api";
import { PermissionRuleBuilder } from "./role-groups/permission-rule-builder";
import { PermissionInspector } from "./role-groups/permission-inspector";
import {
  Shield,
  Plus,
  Users,
  Settings,
  Search,
  Sparkles,
  Loader2,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function PermissionsView() {
  const t = useExtracted();
  const [activeTab, setActiveTab] = useState<"groups" | "inspector">("groups");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rules, setRules] = useState<PermissionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // 创建角色组状态
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // 编辑角色组状态
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRoleGroups();
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroupId((prev) => (prev && data.some((g) => g.id === prev) ? prev : data[0].id));
      } else {
        setSelectedGroupId(null);
      }
    } catch {
      // 容错
    } finally {
      setLoading(false);
    }
  }, []);

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
    loadGroups();
  }, [loadGroups]);

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

  const startEditGroup = (g: RoleGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroupId(g.id);
    setEditGroupName(g.name);
    setEditGroupDesc(g.description || "");
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupId || !editGroupName.trim()) return;
    setUpdating(true);
    try {
      await updateRoleGroup({
        id: editingGroupId,
        name: editGroupName.trim(),
        description: editGroupDesc.trim() || undefined,
      });
      toast.success(t({ id: "Enterprise.RBAC.GroupUpdated", message: "Role group updated successfully" }));
      setEditingGroupId(null);
      await loadGroups();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role group");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGroup = async (g: RoleGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete role group "${g.name}"? All assigned permissions and member bindings will be permanently removed.`
      )
    ) {
      return;
    }

    try {
      await deleteRoleGroup(g.id);
      toast.success(t({ id: "Enterprise.RBAC.GroupDeleted", message: "Role group deleted" }));
      if (selectedGroupId === g.id) {
        setSelectedGroupId(null);
      }
      await loadGroups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role group");
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部 Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{t({ id: "Enterprise.RBAC.PageTitle", message: "Enterprise Permissions & RBAC" })}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                  {t({ id: "Enterprise.Plan.LtdBadge", message: "Enterprise LTD" })}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.RBAC.DialogDesc",
                  message: "Configure 4-dimensional security scopes and preview inheritance trees.",
                })}
              </p>
            </div>
          </div>

          {/* 切换 Tab */}
          <div className="flex rounded-xl bg-muted/80 p-1 text-xs self-start sm:self-auto border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "groups"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{t({ id: "Enterprise.RBAC.TabGroups", message: "Role Groups & Rules" })}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inspector")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === "inspector"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>{t({ id: "Enterprise.RBAC.TabInspector", message: "Inheritance Preview" })}</span>
            </button>
          </div>
        </div>

        {/* 页面主视图 */}
        {activeTab === "inspector" ? (
          <div className="bg-background rounded-2xl border border-border p-6 shadow-sm">
            <PermissionInspector />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* 左侧角色组列表 */}
            <div className="md:col-span-4 bg-background rounded-2xl border border-border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t({ id: "Enterprise.RBAC.RoleGroupsList", message: "Role Groups" })} ({groups.length})
                </span>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t({ id: "Create", message: "New Group" })}</span>
                  </button>
                )}
              </div>

              {/* 创建角色组表单 */}
              {isCreating && (
                <form
                  onSubmit={handleCreateGroup}
                  className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs animate-in fade-in duration-150"
                >
                  <input
                    type="text"
                    required
                    placeholder="Group Name (e.g. Legal, Finance)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                    >
                      {t({ id: "Cancel", message: "Cancel" })}
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-3.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t({ id: "Save", message: "Save" })}
                    </button>
                  </div>
                </form>
              )}

              {/* 编辑角色组弹层/表单 */}
              {editingGroupId && (
                <form
                  onSubmit={handleUpdateGroup}
                  className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 text-xs animate-in fade-in duration-150"
                >
                  <div className="font-semibold text-foreground">Edit Role Group</div>
                  <input
                    type="text"
                    required
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(null)}
                      className="px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                    >
                      {t({ id: "Cancel", message: "Cancel" })}
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex items-center gap-1 px-3.5 py-1 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>{t({ id: "Save", message: "Update" })}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 角色组卡片列表 */}
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No role groups found. Create one to begin.
                  </div>
                ) : (
                  groups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs"
                            : "border-border/70 bg-background hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{g.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* 编辑按钮 */}
                            <button
                              type="button"
                              onClick={(e) => startEditGroup(g, e)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Edit Group"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* 删除按钮 (允许用户删除默认组及所有组) */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGroup(g, e)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete Group"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {g.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{g.description}</p>
                        )}

                        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{g.memberCount} members assigned</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 右侧规则配置区 */}
            <div className="md:col-span-8 bg-background rounded-2xl border border-border p-6 shadow-sm">
              {selectedGroup ? (
                rulesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">
                    {t({ id: "Enterprise.RBAC.SelectGroupTip", message: "Select a role group to manage permissions" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
