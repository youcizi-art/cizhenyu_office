"use client";

import React, { useState, useEffect } from "react";
import { useExtracted } from "next-intl";
import {
  PermissionRule,
  createPermissionRule,
  deletePermissionRule,
} from "@/lib/enterprise-permissions-api";
import { DocumentAction, PermissionScopeType } from "@/functions/lib/permission-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Shield,
  Layers,
  Tag,
  FileText,
  Check,
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  roleGroupId: string;
  roleGroupName: string;
  rules: PermissionRule[];
  onRulesChanged: () => void;
}

const ALL_ACTIONS: DocumentAction[] = ["view", "edit", "comment", "upload", "download", "share"];

const FILE_TYPE_OPTIONS = [
  { value: "docx", label: "Word Document (*.docx, *.doc)" },
  { value: "xlsx", label: "Excel Spreadsheet (*.xlsx, *.xls)" },
  { value: "pptx", label: "PowerPoint (*.pptx, *.ppt)" },
  { value: "pdf", label: "PDF Document (*.pdf)" },
  { value: "md", label: "Markdown Document (*.md)" },
  { value: "image", label: "Media: Image (*.png, *.jpg, *.svg...)" },
  { value: "video", label: "Media: Video (*.mp4, *.webm...)" },
  { value: "audio", label: "Media: Audio (*.mp3, *.wav...)" },
  { value: "other", label: "Generic / Other Archives" },
];

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

  // 动态系统数据状态
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string; type: string }[]>([]);
  const [docSearch, setDocSearch] = useState("");
  const [docPage, setDocPage] = useState(1);
  const [docTotalPages, setDocTotalPages] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);

  // 加载分类、标签与文档列表
  useEffect(() => {
    if (isAdding) {
      setDataLoading(true);
      fetch(`/api/documents?page=${docPage}&pageSize=10&search=${encodeURIComponent(docSearch)}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            if (data.categories) setCategories(data.categories);
            if (data.allTags) setTags(data.allTags);
            if (data.documents) setDocuments(data.documents);
            if (data.pagination) {
              setDocTotalPages(data.pagination.totalPages || 1);
            }
          }
        })
        .catch(() => {})
        .finally(() => setDataLoading(false));
    }
  }, [isAdding, docPage, docSearch]);

  // 切换维度时重置选中的 scopeId
  const handleScopeTypeChange = (newType: PermissionScopeType) => {
    setScopeType(newType);
    setScopeId("");
    if (newType === "file_type" && FILE_TYPE_OPTIONS.length > 0) {
      setScopeId(FILE_TYPE_OPTIONS[0].value);
    }
  };

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
      toast.error(t({ id: "Enterprise.RBAC.ScopeIdRequired", message: "Target Scope value must be selected" }));
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
            onClick={() => {
              setIsAdding(true);
              setScopeType("category");
              setScopeId("");
            }}
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
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dimension Scope 选择 */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t({ id: "Enterprise.RBAC.DimensionScope", message: "Dimension Scope" })}
              </label>
              <Select
                value={scopeType}
                onValueChange={(val) => handleScopeTypeChange(val as PermissionScopeType)}
              >
                <SelectTrigger className="w-full h-9 bg-background">
                  <SelectValue placeholder="Select Dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">
                    {t({ id: "Enterprise.RBAC.ScopeCategory", message: "Category (Inherited by new docs)" })}
                  </SelectItem>
                  <SelectItem value="tag">
                    {t({ id: "Enterprise.RBAC.ScopeTag", message: "Tag (Inherited by tagged docs)" })}
                  </SelectItem>
                  <SelectItem value="file_type">
                    {t({ id: "Enterprise.RBAC.ScopeFileType", message: "File Type (e.g. docx, pdf, md)" })}
                  </SelectItem>
                  <SelectItem value="document">
                    {t({ id: "Enterprise.RBAC.ScopeDocument", message: "Specific Document (Highest Priority)" })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope 具体数据联动选择 */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t({ id: "Enterprise.RBAC.ScopeIdentifier", message: "Target Item (Linked System Data)" })}
                <span className="text-rose-500 ml-1">*</span>
              </label>

              {scopeType === "category" && (
                categories.length === 0 ? (
                  <p className="text-xs text-amber-500 py-2">
                    {t({ id: "Enterprise.RBAC.NoCategories", message: "No categories found in system." })}
                  </p>
                ) : (
                  <Select value={scopeId} onValueChange={setScopeId}>
                    <SelectTrigger className="w-full h-9 bg-background">
                      <SelectValue placeholder="Select a Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}

              {scopeType === "tag" && (
                tags.length === 0 ? (
                  <p className="text-xs text-amber-500 py-2">
                    {t({ id: "Enterprise.RBAC.NoTags", message: "No tags currently assigned to documents." })}
                  </p>
                ) : (
                  <Select value={scopeId} onValueChange={setScopeId}>
                    <SelectTrigger className="w-full h-9 bg-background">
                      <SelectValue placeholder="Select a Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tg) => (
                        <SelectItem key={tg} value={tg}>
                          #{tg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}

              {scopeType === "file_type" && (
                <Select value={scopeId} onValueChange={setScopeId}>
                  <SelectTrigger className="w-full h-9 bg-background">
                    <SelectValue placeholder="Select File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {scopeType === "document" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search document name..."
                      value={docSearch}
                      onChange={(e) => {
                        setDocSearch(e.target.value);
                        setDocPage(1);
                      }}
                      className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-border/80 bg-background/80 p-1">
                    {dataLoading ? (
                      <div className="py-4 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-muted-foreground">
                        No documents found
                      </div>
                    ) : (
                      documents.map((doc) => {
                        const isSelected = scopeId === doc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setScopeId(doc.id)}
                            className={`w-full flex items-center justify-between p-1.5 rounded-md text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <span className="truncate pr-2">{doc.name}</span>
                            <span className="text-[10px] font-mono opacity-70 shrink-0 uppercase">
                              {doc.type}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* 文档翻页控制 */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      Page {docPage} of {docTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={docPage <= 1}
                        onClick={() => setDocPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={docPage >= docTotalPages}
                        onClick={() => setDocPage((p) => Math.min(docTotalPages, p + 1))}
                        className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 权限矩阵打勾 */}
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
