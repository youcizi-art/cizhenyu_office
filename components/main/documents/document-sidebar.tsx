"use client";

import React, { useState } from "react";
import {
  Files,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface TreeNode {
  category: Category;
  children: TreeNode[];
}

interface DocumentSidebarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeCategoryId: string | null;
  onSelectCategory: (catId: string | null) => void;
  documentsCount: number;
  unclassifiedCount: number;
  categoryTree: TreeNode[];
  expandedCats: Record<string, boolean>;
  onToggleCatExpand: (catId: string, e: React.MouseEvent) => void;
  onOpenCreateCategory: (parentId: string | null) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onReorderCategories?: (parentId: string | null, orderedCategoryIds: string[]) => void | Promise<void>;
}

export function DocumentSidebar({
  sidebarOpen,
  onToggleSidebar,
  activeCategoryId,
  onSelectCategory,
  documentsCount,
  unclassifiedCount,
  categoryTree,
  expandedCats,
  onToggleCatExpand,
  onOpenCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories,
}: DocumentSidebarProps) {
  const t = useExtracted();
  // 递归查找指定节点的父级下的所有兄弟节点
  const findSiblings = (tree: TreeNode[], targetId: string, parentId: string | null = null): { parentId: string | null; siblings: TreeNode[] } | null => {
    for (const node of tree) {
      if (node.category.id === targetId) {
        return { parentId, siblings: tree };
      }
      if (node.children && node.children.length > 0) {
        const found = findSiblings(node.children, targetId, node.category.id);
        if (found) return found;
      }
    }
    return null;
  };

  // 上下移动排序单步操作
  const handleMoveStep = (catId: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const group = findSiblings(categoryTree, catId);
    if (!group) return;

    const siblingIds = group.siblings.map((s) => s.category.id);
    const currentIndex = siblingIds.indexOf(catId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblingIds.length) return;

    const newOrderedIds = [...siblingIds];
    const [movedId] = newOrderedIds.splice(currentIndex, 1);
    newOrderedIds.splice(targetIndex, 0, movedId);

    onReorderCategories?.(group.parentId, newOrderedIds);
  };

  // 递归渲染树节点
  const renderCategoryNode = (node: TreeNode, depth = 0) => {
    const { category, children } = node;
    const isExpanded = !!expandedCats[category.id];
    const isSelected = activeCategoryId === category.id;
    const hasChildren = children.length > 0;

    // 获取同级兄弟信息以判断是否能上移或下移
    const group = findSiblings(categoryTree, category.id);
    const siblings = group ? group.siblings : [];
    const currentIndex = siblings.findIndex((s) => s.category.id === category.id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex >= 0 && currentIndex < siblings.length - 1;

    return (
      <div key={category.id} className="select-none relative">
        <div
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "group flex items-center justify-between px-2 py-1.5 rounded-xl text-xs cursor-pointer transition-colors relative",
            isSelected
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-muted/60"
          )}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => onToggleCatExpand(category.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">{category.name}</span>
          </div>

          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title={t({ id: "ManageCategory", message: "Manage Category" })}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-44 p-1.5 bg-popover/95 backdrop-blur-md border-border/80 shadow-xl rounded-xl z-50 text-xs"
                align="end"
                sideOffset={4}
              >
                <div className="space-y-0.5">
                  {/* 上移 */}
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    onClick={(e) => handleMoveStep(category.id, "up", e)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground transition-colors text-left",
                      canMoveUp
                        ? "hover:bg-muted cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-primary" />
                    <span>{t({ id: "MoveUp", message: "Move Up" })}</span>
                  </button>

                  {/* 下移 */}
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    onClick={(e) => handleMoveStep(category.id, "down", e)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground transition-colors text-left",
                      canMoveDown
                        ? "hover:bg-muted cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    <span>{t({ id: "MoveDown", message: "Move Down" })}</span>
                  </button>

                  <div className="h-px bg-border my-1" />

                  {/* 添加子分类 */}
                  <button
                    type="button"
                    onClick={() => onOpenCreateCategory(category.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t({ id: "AddSubCategory", message: "Add Sub-Category" })}</span>
                  </button>

                  {/* 编辑分类名称 */}
                  <button
                    type="button"
                    onClick={() => onEditCategory?.(category)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-left"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t({ id: "EditCategory", message: "Edit Category" })}</span>
                  </button>

                  <div className="h-px bg-border my-1" />

                  {/* 删除分类 */}
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(category)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    <span>{t({ id: "DeleteCategory", message: "Delete Category" })}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card/40 transition-all duration-300 select-none shrink-0",
        sidebarOpen ? "w-64" : "w-14"
      )}
    >
      <div className="h-12 px-3 border-b border-border flex items-center justify-between">
        {sidebarOpen ? (
          <>
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
              <Folder className="w-4 h-4 text-primary" />
              <span>{t({ id: "DocumentCategories", message: "Categories" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenCreateCategory(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t({ id: "NewRootCategory", message: "New Root Category" })}
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t({ id: "CollapseSidebar", message: "Collapse" })}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="mx-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t({ id: "ExpandSidebar", message: "Expand" })}
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      {sidebarOpen ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
              activeCategoryId === null
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-muted/60"
            )}
          >
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-primary" />
              <span>{t({ id: "AllDocuments", message: "All Documents" })}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{documentsCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCategory("__unclassified__")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
              activeCategoryId === "__unclassified__"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-muted/60"
            )}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span>{t({ id: "UnclassifiedCategory", message: "Unclassified" })}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{unclassifiedCount}</span>
          </button>

          <div className="h-px bg-border my-2" />

          <div className="space-y-0.5">
            {categoryTree.map((node) => renderCategoryNode(node))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-3 gap-2">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={cn(
              "p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer",
              activeCategoryId === null ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
            title={t({ id: "AllDocuments", message: "All Documents" })}
          >
            <Files className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectCategory("__unclassified__")}
            className={cn(
              "p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer",
              activeCategoryId === "__unclassified__" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
            title={t({ id: "UnclassifiedCategory", message: "Unclassified" })}
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
