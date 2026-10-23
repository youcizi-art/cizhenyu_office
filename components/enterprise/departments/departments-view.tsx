"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import {
  DepartmentItem,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  EnterpriseUser,
  fetchEnterpriseMembers,
} from "@/lib/enterprise-api";
import { EnterpriseAdminNav } from "@/components/enterprise/admin/enterprise-admin-nav";
import { DepartmentTree, DepartmentNode } from "./department-tree";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FolderTree,
  Plus,
  Loader2,
  Folder,
  Users,
  Search,
  Building,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export function DepartmentsView() {
  const t = useExtracted();
  const { isAdmin, isOwner } = useEnterprise();

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [members, setMembers] = useState<EnterpriseUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);

  // 创建/编辑部门弹窗状态
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetParent, setTargetParent] = useState<DepartmentItem | null>(null);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 删除确认
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, memRes] = await Promise.all([
        fetchDepartments(),
        fetchEnterpriseMembers(),
      ]);
      if (deptRes.success) {
        setDepartments(deptRes.departments || []);
      }
      if (memRes.success) {
        setMembers(memRes.members || []);
      }
    } catch {
      toast.error("Failed to load departments data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 构建多级部门树
  const departmentTree = useMemo(() => {
    const nodeMap = new Map<string, DepartmentNode>();
    departments.forEach((d) => {
      nodeMap.set(d.id, { department: d, children: [] });
    });

    const rootNodes: DepartmentNode[] = [];
    departments.forEach((d) => {
      const node = nodeMap.get(d.id)!;
      if (d.parentId && nodeMap.has(d.parentId)) {
        nodeMap.get(d.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [departments]);

  // 当前选中部门下的直属成员
  const selectedDeptMembers = useMemo(() => {
    if (!selectedDept) return [];
    return members.filter((m) => m.departmentId === selectedDept.id);
  }, [members, selectedDept]);

  const handleOpenCreateRoot = () => {
    setModalMode("create");
    setTargetParent(null);
    setEditingDept(null);
    setDeptName("");
    setModalOpen(true);
  };

  const handleOpenAddSub = (parent: DepartmentItem) => {
    setModalMode("create");
    setTargetParent(parent);
    setEditingDept(null);
    setDeptName("");
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setModalMode("edit");
    setEditingDept(dept);
    setDeptName(dept.name);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await createDepartment({
          name: deptName.trim(),
          parentId: targetParent ? targetParent.id : null,
        });
        if (res.success && res.department) {
          toast.success(t({ id: "Enterprise.Dept.CreatedSuccess", message: "Department created successfully" }));
          setModalOpen(false);
          await loadData();
          setSelectedDept(res.department);
        } else {
          toast.error(res.error || "Failed to create department");
        }
      } else if (modalMode === "edit" && editingDept) {
        const res = await updateDepartment(editingDept.id, {
          name: deptName.trim(),
        });
        if (res.success) {
          toast.success(t({ id: "Enterprise.Dept.UpdatedSuccess", message: "Department updated successfully" }));
          setModalOpen(false);
          await loadData();
          if (selectedDept?.id === editingDept.id) {
            setSelectedDept({ ...editingDept, name: deptName.trim() });
          }
        } else {
          toast.error(res.error || "Failed to update department");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDept) return;
    try {
      const res = await deleteDepartment(deletingDept.id);
      if (res.success) {
        toast.success(t({ id: "Enterprise.Dept.DeletedSuccess", message: "Department deleted successfully" }));
        setDeletingDept(null);
        if (selectedDept?.id === deletingDept.id) {
          setSelectedDept(null);
        }
        await loadData();
      } else {
        toast.error(res.error || "Failed to delete department");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <EnterpriseAdminNav />

        {/* 顶部标题栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{t({ id: "Enterprise.Dept.PageTitle", message: "Department Management" })}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.Dept.PageSubtitle",
                  message: "Organize organizational hierarchy with multi-level departments and assign team members seamlessly.",
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateRoot}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t({ id: "Enterprise.Dept.CreateBtn", message: "Add Department" })}</span>
          </button>
        </div>

        {/* 主体两栏布局：左侧树状结构，右侧部门详情与下属人员 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 左侧部门树 */}
          <div className="md:col-span-5 bg-background rounded-2xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {t({ id: "Enterprise.Dept.HierarchyTree", message: "Organization Tree" })}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {departments.length} {t({ id: "Departments", message: "departments" })}
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : departments.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <Folder className="w-8 h-8 opacity-40 mx-auto" />
                <p>{t({ id: "Enterprise.Dept.NoDepartments", message: "No departments configured yet." })}</p>
                <button
                  type="button"
                  onClick={handleOpenCreateRoot}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  {t({ id: "Enterprise.Dept.CreateFirst", message: "Create your first department" })}
                </button>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                <DepartmentTree
                  tree={departmentTree}
                  activeId={selectedDept?.id || null}
                  onSelect={(d) => setSelectedDept(d)}
                  onAddSub={handleOpenAddSub}
                  onEdit={handleOpenEdit}
                  onDelete={(d) => setDeletingDept(d)}
                />
              </div>
            )}
          </div>

          {/* 右侧部门详情与成员列表 */}
          <div className="md:col-span-7 bg-background rounded-2xl border border-border p-5 shadow-xs space-y-5">
            {selectedDept ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{selectedDept.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedDeptMembers.length} {t({ id: "Members", message: "assigned members" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddSub(selectedDept)}
                      className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground cursor-pointer"
                    >
                      {t({ id: "Enterprise.Dept.AddSub", message: "Add Sub-Department" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(selectedDept)}
                      className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground cursor-pointer"
                    >
                      {t({ id: "Edit", message: "Edit" })}
                    </button>
                  </div>
                </div>

                {/* 部门下属成员卡片列表 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t({ id: "Enterprise.Dept.StaffList", message: "Department Staff" })}</span>
                  </h4>

                  {selectedDeptMembers.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                      <p>{t({ id: "Enterprise.Dept.NoMembersInDept", message: "No members currently assigned to this department." })}</p>
                      <p className="text-[11px] mt-1 text-muted-foreground">
                        {t({
                          id: "Enterprise.Dept.AssignHint",
                          message: "You can assign members to this department from the 'Team Members & Users' tab.",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {selectedDeptMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/20 text-xs"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <div className="font-semibold text-foreground truncate">{m.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-xs text-muted-foreground space-y-2">
                <Building className="w-10 h-10 opacity-30 mx-auto" />
                <p className="font-medium text-foreground">
                  {t({ id: "Enterprise.Dept.SelectDeptPrompt", message: "Select a department from the left tree to inspect details" })}
                </p>
                <p className="text-[11px] max-w-sm mx-auto">
                  {t({
                    id: "Enterprise.Dept.SelectDesc",
                    message: "View department staff, add sub-levels, or modify department structures.",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建 / 编辑部门对话框 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {modalMode === "create"
                    ? targetParent
                      ? `${t({ id: "Enterprise.Dept.AddSub", message: "Add Sub-Department" })} (${targetParent.name})`
                      : t({ id: "Enterprise.Dept.CreateRoot", message: "Add Root Department" })
                    : t({ id: "Enterprise.Dept.EditDept", message: "Edit Department" })}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {t({ id: "Enterprise.Dept.NameLabel", message: "Department Name" })}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Engineering, Sales, Marketing"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium cursor-pointer"
                >
                  {t({ id: "Cancel", message: "Cancel" })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t({ id: "Save", message: "Save" })}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除部门确认弹窗 */}
      <ConfirmDialog
        isOpen={Boolean(deletingDept)}
        onClose={() => setDeletingDept(null)}
        title={t({ id: "Enterprise.Dept.DeleteTitle", message: "Delete Department" })}
        description={
          deletingDept
            ? `${t({
                id: "Enterprise.Dept.DeleteConfirmDesc",
                message: "Are you sure you want to delete this department? All sub-departments will also be removed, and members will be unassigned.",
              })} (${deletingDept.name})`
            : ""
        }
        confirmText={t({ id: "Delete", message: "Delete" })}
        destructive
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
