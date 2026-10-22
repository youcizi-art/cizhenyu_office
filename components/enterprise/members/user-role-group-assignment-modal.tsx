"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  RoleGroup,
  fetchRoleGroups,
  assignUserRoleGroup,
  removeUserRoleGroup,
} from "@/lib/enterprise-permissions-api";
import {
  fetchDocumentPermissions,
  setDocumentPermission,
  revokeDocumentPermission,
} from "@/lib/enterprise-api";
import {
  Shield,
  Check,
  X,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentSelectorModal } from "@/components/enterprise/permissions/document-selector-modal";
import { DocumentMeta } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  onChanged: () => void;
}

interface UserDocPermItem {
  docId: string;
  docName: string;
  permission: "editor" | "commenter" | "viewer";
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
  const [activeTab, setActiveTab] = useState<"groups" | "docs">("groups");
  const [loading, setLoading] = useState(true);
  
  // 角色组
  const [allGroups, setAllGroups] = useState<RoleGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set());
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  // 单文档独立权限
  const [docPerms, setDocPerms] = useState<UserDocPermItem[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docPermsLoading, setDocPermsLoading] = useState(false);

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

  const loadUserDocPerms = useCallback(async () => {
    setDocPermsLoading(true);
    try {
      const res = await fetch(`/api/permissions/user-documents?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDocPerms(data.permissions || []);
      }
    } catch {
      // 容错
    } finally {
      setDocPermsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadUserDocPerms();
    }
  }, [isOpen, loadData, loadUserDocPerms]);

  if (!isOpen) return null;

  const handleToggleGroup = async (groupId: string) => {
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

  const handleAddDocs = async (docs: DocumentMeta[]) => {
    try {
      for (const d of docs) {
        await setDocumentPermission(d.id, userId, "editor");
      }
      toast.success(t({ id: "Enterprise.RBAC.DocPermsUpdated", message: "Document permissions assigned" }));
      loadUserDocPerms();
    } catch {
      toast.error("Failed to assign document permissions");
    }
  };

  const handleUpdateDocRole = async (docId: string, role: "editor" | "commenter" | "viewer") => {
    try {
      await setDocumentPermission(docId, userId, role);
      setDocPerms((prev) =>
        prev.map((p) => (p.docId === docId ? { ...p, permission: role } : p))
      );
      toast.success(t({ id: "Enterprise.RBAC.DocRoleChanged", message: "Permission updated" }));
    } catch {
      toast.error("Failed to update permission");
    }
  };

  const handleRevokeDoc = async (docId: string) => {
    try {
      await revokeDocumentPermission(docId, userId);
      setDocPerms((prev) => prev.filter((p) => p.docId !== docId));
      toast.success(t({ id: "Enterprise.Permissions.RevokeSuccess", message: "Access revoked" }));
    } catch {
      toast.error("Failed to revoke permission");
    }
  };

  const filteredGroups = allGroups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-background border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t({ id: "Enterprise.RBAC.ManagePermissionsTitle", message: "Manage Member Permissions" })}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
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

        {/* 顶部 Tab 切换 */}
        <div className="flex border-b border-border mt-3 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-all cursor-pointer ${
              activeTab === "groups"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t({ id: "Enterprise.RBAC.RoleGroupsTab", message: "Role Groups" })}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
              {userGroupIds.size}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-all cursor-pointer ${
              activeTab === "docs"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t({ id: "Enterprise.RBAC.SpecificDocsTab", message: "Document Overrides" })}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
              {docPerms.length}
            </span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto py-3">
          {activeTab === "groups" && (
            <div className="space-y-2.5">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t({ id: "Enterprise.Members.SearchGroups", message: "Search role groups..." })}
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              {loading ? (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : allGroups.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {t({ id: "Enterprise.RBAC.NoGroupsCreated", message: "No role groups available." })}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredGroups.map((g) => {
                    const isChecked = userGroupIds.has(g.id);
                    const isUpdating = updatingGroupId === g.id;

                    return (
                      <div
                        key={g.id}
                        onClick={() => !isUpdating && handleToggleGroup(g.id)}
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

                        <div className="flex items-center gap-2 shrink-0">
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
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "docs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t({
                    id: "Enterprise.Members.DocPermsExplicitHint",
                    message: "Individual document permissions take top priority over group roles.",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t({ id: "Enterprise.Members.PickDocsBtn", message: "Assign Documents" })}</span>
                </button>
              </div>

              {docPermsLoading ? (
                <div className="py-12 flex justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : docPerms.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  {t({
                    id: "Enterprise.Members.NoDocOverrides",
                    message: "No specific document permissions assigned yet. User inherits from role groups.",
                  })}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {docPerms.map((dp) => (
                    <div
                      key={dp.docId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate font-medium">{dp.docName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={dp.permission}
                          onChange={(e) =>
                            handleUpdateDocRole(dp.docId, e.target.value as "editor" | "commenter" | "viewer")
                          }
                          className="text-xs bg-background border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary"
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
                          onClick={() => handleRevokeDoc(dp.docId)}
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
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
          >
            {t({ id: "Close", message: "Close" })}
          </button>
        </div>

        <DocumentSelectorModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          multiSelect={true}
          initialSelectedIds={docPerms.map((p) => p.docId)}
          title={t({
            id: "Enterprise.Members.DocSelectorTitle",
            message: "Select Documents to Assign Individual Permissions",
          })}
          onSelect={handleAddDocs}
        />
      </div>
    </div>
  );
}
