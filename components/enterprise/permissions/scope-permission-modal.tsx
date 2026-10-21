"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  RoleGroup,
  PermissionRule,
  fetchRoleGroups,
  fetchRoleGroupRules,
  createPermissionRule,
  deletePermissionRule,
} from "@/lib/enterprise-permissions-api";
import { DocumentAction, PermissionScopeType } from "@/functions/lib/permission-types";
import { Shield, Layers, Tag, FileText, Check, X, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scopeType: PermissionScopeType;
  scopeId: string;
  scopeTitle: string;
}

const ALL_ACTIONS: DocumentAction[] = ["view", "edit", "comment", "upload", "download", "share"];

export function ScopePermissionModal({
  isOpen,
  onClose,
  scopeType,
  scopeId,
  scopeTitle,
}: Props) {
  const t = useExtracted();
  const [loading, setLoading] = useState(true);
  const [roleGroups, setRoleGroups] = useState<RoleGroup[]>([]);
  const [groupRulesMap, setGroupRulesMap] = useState<Record<string, PermissionRule[]>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // 新增/编辑规则
  const [allowActions, setAllowActions] = useState<DocumentAction[]>(["view", "download"]);
  const [denyActions, setDenyActions] = useState<DocumentAction[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await fetchRoleGroups();
      setRoleGroups(groups);
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }

      // 获取各角色组在该 scope 下的规则
      const map: Record<string, PermissionRule[]> = {};
      for (const g of groups) {
        const rules = await fetchRoleGroupRules(g.id);
        map[g.id] = rules.filter(
          (r) => r.scopeType === scopeType && r.scopeId.toLowerCase() === scopeId.toLowerCase()
        );
      }
      setGroupRulesMap(map);
    } catch {
      toast.error("Failed to load permission scopes");
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId, selectedGroupId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const currentRules = (selectedGroupId && groupRulesMap[selectedGroupId]) || [];
  const selectedGroup = roleGroups.find((g) => g.id === selectedGroupId);

  const toggleAllow = (action: DocumentAction) => {
    if (allowActions.includes(action)) {
      setAllowActions(allowActions.filter((a) => a !== action));
    } else {
      setAllowActions([...allowActions, action]);
      setDenyActions(denyActions.filter((a) => a !== action));
    }
  };

  const toggleDeny = (action: DocumentAction) => {
    if (denyActions.includes(action)) {
      setDenyActions(denyActions.filter((a) => a !== action));
    } else {
      setDenyActions([...denyActions, action]);
      setAllowActions(allowActions.filter((a) => a !== action));
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    setSubmitting(true);
    try {
      await createPermissionRule({
        roleGroupId: selectedGroupId,
        scopeType,
        scopeId,
        allowActions,
        denyActions,
      });
      toast.success(t({ id: "Enterprise.RBAC.RuleCreated", message: "Permission rule updated" }));
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update permission rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deletePermissionRule(ruleId);
      toast.success(t({ id: "Enterprise.RBAC.RuleDeleted", message: "Permission rule removed" }));
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove permission rule");
    }
  };

  const getScopeIcon = () => {
    switch (scopeType) {
      case "category":
        return <Layers className="w-5 h-5 text-amber-500" />;
      case "tag":
        return <Tag className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              {getScopeIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                  {scopeType}
                </span>
                <h3 className="text-base font-bold text-foreground truncate max-w-[320px]">
                  {scopeTitle}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.RBAC.ScopeRuleDesc",
                  message: "Set permissions for this dimension. Rules automatically inherit to current & future documents.",
                })}
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

        {loading ? (
          <div className="py-16 flex justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 角色组选择器 */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t({ id: "Enterprise.RBAC.SelectRoleGroup", message: "Select Role Group to Configure" })}
              </label>
              <div className="flex flex-wrap gap-2">
                {roleGroups.map((g) => {
                  const hasRule = (groupRulesMap[g.id] || []).length > 0;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        selectedGroupId === g.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-muted/50 text-foreground border-border/60 hover:bg-muted"
                      }`}
                    >
                      <span>{g.name}</span>
                      {hasRule && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 权限矩阵配置表单 */}
            <form onSubmit={handleSaveRule} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {selectedGroup?.name} &gt; {scopeTitle}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t({ id: "Enterprise.RBAC.ConflictDenyNote", message: "Deny overrides Allow across multiple groups" })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_ACTIONS.map((act) => {
                  const isAllowed = allowActions.includes(act);
                  const isDenied = denyActions.includes(act);

                  return (
                    <div
                      key={act}
                      className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background text-xs"
                    >
                      <span className="font-medium capitalize">{act}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleAllow(act)}
                          className={`h-6 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                            isAllowed
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-emerald-500/20"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          Allow
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDeny(act)}
                          className={`h-6 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                            isDenied
                              ? "bg-rose-500 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-rose-500/20"
                          }`}
                        >
                          <X className="h-3 w-3" />
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{t({ id: "Enterprise.RBAC.SaveScopeRule", message: "Apply Rule to Scope" })}</span>
                </button>
              </div>
            </form>

            {/* 该角色组已有规则列表 */}
            {currentRules.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t({ id: "Enterprise.RBAC.ExistingScopeRules", message: "Existing Active Rules for this Group:" })}
                </span>
                {currentRules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selectedGroup?.name}</span>
                      <div className="flex flex-wrap gap-1">
                        {r.allowActions.map((a) => (
                          <span key={a} className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                            +{a}
                          </span>
                        ))}
                        {r.denyActions.map((d) => (
                          <span key={d} className="text-[10px] text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded font-medium">
                            -{d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                      title={t({ id: "Delete", message: "Delete" })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
