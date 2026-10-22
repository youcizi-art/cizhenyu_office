"use client";

import React, { useState, useEffect } from "react";
import { useExtracted } from "next-intl";
import { createEnterpriseMember, EnterpriseUser } from "@/lib/enterprise-api";
import { RoleGroup, fetchRoleGroups } from "@/lib/enterprise-permissions-api";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  Users,
  X,
  Loader2,
  Check,
  Search,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentSelectorModal } from "@/components/enterprise/permissions/document-selector-modal";
import { DocumentMeta } from "@/lib/api";

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: EnterpriseUser) => void;
  canGrantAdmin: boolean;
}

interface CustomDocPerm {
  docId: string;
  docName: string;
  permission: "editor" | "commenter" | "viewer";
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
  const [isAdminGrant, setIsAdminGrant] = useState(false);
  
  // 角色组数据与搜索
  const [availableGroups, setAvailableGroups] = useState<RoleGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupsLoading, setGroupsLoading] = useState(false);
  
  // 单文档独立权限分配（最高优先级）
  const [customDocPerms, setCustomDocPerms] = useState<CustomDocPerm[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroupsLoading(true);
      fetchRoleGroups()
        .then((groups) => {
          setAvailableGroups(groups);
          const defaultGroup =
            groups.find((g) => g.id.includes("editor") || g.name.toLowerCase().includes("editor")) ||
            groups[0];
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

  const handleDocsSelected = (docs: DocumentMeta[]) => {
    setCustomDocPerms((prev) => {
      const existingIds = new Set(prev.map((p) => p.docId));
      const newlyAdded: CustomDocPerm[] = docs
        .filter((d) => !existingIds.has(d.id))
        .map((d) => ({
          docId: d.id,
          docName: d.name,
          permission: "editor",
        }));
      return [...prev, ...newlyAdded];
    });
  };

  const handleUpdateDocPerm = (docId: string, permission: "editor" | "commenter" | "viewer") => {
    setCustomDocPerms((prev) =>
      prev.map((item) => (item.docId === docId ? { ...item, permission } : item))
    );
  };

  const handleRemoveDocPerm = (docId: string) => {
    setCustomDocPerms((prev) => prev.filter((item) => item.docId !== docId));
  };

  const filteredGroups = availableGroups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (selectedGroupIds.length === 0 && !isAdminGrant) {
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
        role: isAdminGrant ? "admin" : "member",
        roleGroupIds: selectedGroupIds,
        docPermissions: customDocPerms.map((p) => ({
          documentId: p.docId,
          permission: p.permission,
        })),
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
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* 顶部标题栏 */}
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
                  message: "Create user account, configure role groups, and assign document-level overrides",
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

        {/* 表单内容区 */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {/* 基本账户信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t({ id: "Enterprise.Members.EmailLabel", message: "Member Email" })}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100"
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t({ id: "Enterprise.Members.InitialPasswordLabel", message: "Initial Password" })}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {canGrantAdmin && (
              <div className="pt-4">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-border/80 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAdminGrant}
                    onChange={(e) => setIsAdminGrant(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t({ id: "Enterprise.Role.GrantSuperAdmin", message: "Grant Organization Administrator" })}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t({ id: "Enterprise.Role.SuperAdminHint", message: "Super admins have full system permissions across all documents." })}
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* 权限角色组分配联动（支持搜索与高容量列表） */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t({ id: "Enterprise.Members.AssignRoleGroups", message: "Assign Role Groups (Permissions)" })}
                {!isAdminGrant && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <span className="text-[11px] text-zinc-400">
                {selectedGroupIds.length} {t({ id: "Selected", message: "selected" })}
              </span>
            </div>

            {/* 角色组快速搜索过滤框 */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t({ id: "Enterprise.Members.SearchGroups", message: "Search role groups..." })}
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                {filteredGroups.map((g) => {
                  const isChecked = selectedGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border ${
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
          </div>

          {/* 单用户独立文档权限覆盖（最高优先级设置） */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {t({
                    id: "Enterprise.Members.DocPermissionsTitle",
                    message: "Individual Document Permission Overrides (Highest Priority)",
                  })}
                </label>
                <p className="text-[11px] text-muted-foreground">
                  {t({
                    id: "Enterprise.Members.DocPermissionsTip",
                    message: "Explicit permissions defined here will override role group defaults for this specific member.",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t({ id: "Enterprise.Members.PickDocsBtn", message: "Assign Specific Documents" })}</span>
              </button>
            </div>

            {customDocPerms.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-border/80 bg-zinc-50/50 dark:bg-zinc-800/30">
                {customDocPerms.map((dp) => (
                  <div
                    key={dp.docId}
                    className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate font-medium">{dp.docName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={dp.permission}
                        onChange={(e) =>
                          handleUpdateDocPerm(dp.docId, e.target.value as "editor" | "commenter" | "viewer")
                        }
                        className="text-xs bg-muted border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary"
                      >
                        <option value="editor">
                          {t({ id: "Enterprise.Permission.Editor", message: "Can Edit" })}
                        </option>
                        <option value="commenter">
                          {t({ id: "Enterprise.Permission.Commenter", message: "Can Comment" })}
                        </option>
                        <option value="viewer">
                          {t({ id: "Enterprise.Permission.Viewer", message: "Can View" })}
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveDocPerm(dp.docId)}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              {t({ id: "Enterprise.Common.Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
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

        {/* 触发分页搜索与分类筛选的多选文档弹窗 */}
        <DocumentSelectorModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          multiSelect={true}
          initialSelectedIds={customDocPerms.map((p) => p.docId)}
          title={t({
            id: "Enterprise.Members.DocSelectorTitle",
            message: "Select Documents to Assign Individual Permissions",
          })}
          onSelect={handleDocsSelected}
        />
      </div>
    </div>
  );
}
