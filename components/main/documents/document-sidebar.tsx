"use client";

import React from "react";
import {
  Files,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/api";

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
  onDeleteCategory: (category: Category) => void;
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
  onDeleteCategory,
}: DocumentSidebarProps) {
  const t = useExtracted();

  // 递归渲染树节点
  const renderCategoryNode = (node: TreeNode, depth = 0) => {
    const { category, children } = node;
    const isExpanded = !!expandedCats[category.id];
    const isSelected = activeCategoryId === category.id;
    const hasChildren = children.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors",
            isSelected
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground hover:bg-muted/60"
          )}
          style={{ paddingLeft: `${depth * 12 + 10}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => onToggleCatExpand(category.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
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
            <button
              type="button"
              onClick={() => onOpenCreateCategory(category.id)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title={t({ id: "AddSubCategory", message: "Add Sub-Category" })}
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteCategory(category)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title={t({ id: "DeleteCategory", message: "Delete Category" })}
            >
              <X className="w-3 h-3" />
            </button>
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
