"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { DepartmentItem } from "@/lib/enterprise-api";
import {
  FolderTree,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

export interface DepartmentNode {
  department: DepartmentItem;
  children: DepartmentNode[];
}

interface DepartmentTreeProps {
  tree: DepartmentNode[];
  activeId: string | null;
  onSelect: (dept: DepartmentItem) => void;
  onAddSub: (parentDept: DepartmentItem) => void;
  onEdit: (dept: DepartmentItem) => void;
  onDelete: (dept: DepartmentItem) => void;
}

export function DepartmentTree({
  tree,
  activeId,
  onSelect,
  onAddSub,
  onEdit,
  onDelete,
}: DepartmentTreeProps) {
  const t = useExtracted();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: DepartmentNode, level = 0) => {
    const isExpanded = expanded[node.department.id] ?? true;
    const isSelected = activeId === node.department.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.department.id} className="space-y-1">
        <div
          onClick={() => onSelect(node.department)}
          style={{ paddingLeft: `${Math.max(8, level * 18 + 8)}px` }}
          className={`group flex items-center justify-between py-2 pr-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
            isSelected
              ? "bg-primary/10 border-primary/30 text-primary font-semibold"
              : "bg-background border-border/70 hover:bg-muted/40 hover:border-border text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.department.id, e)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <Folder className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{node.department.name}</span>
            <span className="text-[10px] text-muted-foreground ml-1 shrink-0 flex items-center gap-0.5">
              <Users className="w-3 h-3 opacity-60" />
              <span>{node.department.memberCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSub(node.department);
              }}
              title={t({ id: "Enterprise.Dept.AddSub", message: "Add Sub-Department" })}
              className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node.department);
              }}
              title={t({ id: "Edit", message: "Edit" })}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.department);
              }}
              title={t({ id: "Delete", message: "Delete" })}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-1.5">{tree.map((node) => renderNode(node, 0))}</div>;
}
