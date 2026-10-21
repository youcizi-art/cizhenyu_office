"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import {
  PermissionRule,
  createPermissionRule,
  deletePermissionRule,
} from "@/lib/enterprise-permissions-api";
import { DocumentAction, PermissionScopeType } from "@/functions/lib/permission-types";
import { Plus, Trash2, Shield, Layers, Tag, FileText, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  roleGroupId: string;
  roleGroupName: string;
  rules: PermissionRule[];
  onRulesChanged: () => void;
}

const ALL_ACTIONS: DocumentAction[] = ["view", "edit", "comment", "upload", "download", "share"];

export function PermissionRuleBuilder({
  roleGroupId,
  roleGroupName,
  rules,
  onRulesChanged,
}: Props) {
  const t = useExtracted();
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [scopeType, setScopeType] = useState<PermissionScopeType>("category");
  const [scopeId, setScopeId] = useState("");
  const [allowActions, setAllowActions] = useState<DocumentAction[]>(["view", "download"]);
  const [denyActions, setDenyActions] = useState<DocumentAction[]>([]);

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

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeId.trim()) {
      toast.error(t({ id: "Enterprise.RBAC.ScopeIdRequired", message: "Target Scope ID / Value is required" }));
      return;
    }
    setSubmitting(true);
    try {
      await createPermissionRule({
        roleGroupId,
        scopeType,
        scopeId: scopeId.trim(),
        allowActions,
        denyActions,
      });
      toast.success(t({ id: "Enterprise.RBAC.RuleCreated", message: "Permission rule added" }));
      setIsAdding(false);
      setScopeId("");
      onRulesChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to add rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deletePermissionRule(ruleId);
      toast.success(t({ id: "Enterprise.RBAC.RuleDeleted", message: "Permission rule removed" }));
      onRulesChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove rule");
    }
  };

  const getScopeIcon = (type: PermissionScopeType) => {
    switch (type) {
      case "document":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      case "category":
        return <Layers className="h-3.5 w-3.5 text-amber-500" />;
      case "tag":
        return <Tag className="h-3.5 w-3.5 text-emerald-500" />;
      case "file_type":
        return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>{roleGroupName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({rules.length} {t({ id: "Enterprise.RBAC.RulesCount", message: "active rules" })})
            </span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t({
              id: "Enterprise.RBAC.RuleBuilderTip",
              message: "Rules apply dynamically to all current and future documents under this scope.",
            })}
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t({ id: "Enterprise.RBAC.AddRule", message: "Add Rule" })}</span>
          </button>
        )}
      </div>

      {/* 新增规则面板 */}
      {isAdding && (
        <form
          onSubmit={handleCreateRule}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t({ id: "Enterprise.RBAC.DimensionScope", message: "Dimension Scope" })}
              </label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value as PermissionScopeType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20"
              >
                <option value="category">
                  {t({ id: "Enterprise.RBAC.ScopeCategory", message: "Category (Inherited by new docs)" })}
                </option>
                <option value="tag">
                  {t({ id: "Enterprise.RBAC.ScopeTag", message: "Tag (Inherited by tagged docs)" })}
                </option>
                <option value="file_type">
                  {t({ id: "Enterprise.RBAC.ScopeFileType", message: "File Type (e.g. docx, pdf, md)" })}
                </option>
                <option value="document">
                  {t({ id: "Enterprise.RBAC.ScopeDocument", message: "Specific Document (Highest Priority)" })}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t({ id: "Enterprise.RBAC.ScopeIdentifier", message: "Scope Identifier / Value" })}
              </label>
              <input
                type="text"
                required
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder={
                  scopeType === "file_type"
                    ? "e.g. docx, pdf, md, image"
                    : scopeType === "tag"
                    ? "e.g. confidential, finance"
                    : "ID or Name"
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* 权限矩阵快速打勾 */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t({ id: "Enterprise.RBAC.ActionsMatrix", message: "Action Permissions (Allow vs Deny)" })}
            </label>
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
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t({ id: "Save", message: "Save Rule" })}</span>
            </button>
          </div>
        </form>
      )}

      {/* 规则列表展示 */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground">
              {t({
                id: "Enterprise.RBAC.NoRulesConfigured",
                message: "No custom rules defined for this role group. Fallback defaults apply.",
              })}
            </p>
          </div>
        ) : (
          rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border/80 bg-background/50 hover:bg-background transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  {getScopeIcon(r.scopeType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-muted">
                      {r.scopeType}
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">{r.scopeId}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {r.allowActions.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                      >
                        <Check className="h-2.5 w-2.5" />
                        {a}
                      </span>
                    ))}
                    {r.denyActions.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded"
                      >
                        <X className="h-2.5 w-2.5" />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRule(r.id)}
                className="self-end sm:self-center p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title={t({ id: "Delete", message: "Delete" })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
