"use client";

import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TocNode {
  id: string;
  text: string;
  level: number;
  children: TocNode[];
}

/**
 * 将扁平的 HTML 标题列表转换为多叉树层级结构
 */
export function buildTocTree(items: TocItem[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: { node: TocNode; level: number }[] = [];

  for (const item of items) {
    const node: TocNode = {
      id: item.id,
      text: item.text,
      level: item.level,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, level: item.level });
  }

  return root;
}

interface TocTreeNodeItemProps {
  node: TocNode;
  activeId: string;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string, e: React.MouseEvent) => void;
  onSelect: (id: string) => void;
  depth?: number;
}

/**
 * 递归渲染多层级目录节点，支持折叠与展开
 * 严禁硬编码纯中文字符串，遵循 AGENTS.md 规范
 */
export function TocTreeNodeItem({
  node,
  activeId,
  collapsedIds,
  onToggleCollapse,
  onSelect,
  depth = 0,
}: TocTreeNodeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const isActive = activeId === node.id;

  return (
    <div className="flex flex-col">
      <div
        data-toc-id={node.id}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        className={cn(
          "group flex items-center justify-between py-1.5 pr-1.5 rounded-lg transition-all text-xs cursor-pointer select-none",
          isActive
            ? "text-primary font-semibold bg-primary/10 border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        onClick={() => onSelect(node.id)}
        title={node.text}
      >
        <span className="truncate flex-1 pr-1">{node.text}</span>
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => onToggleCollapse(node.id, e)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title={isCollapsed ? "Expand" : "Collapse"}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : null}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="flex flex-col animate-in fade-in duration-150">
          {node.children.map((child) => (
            <TocTreeNodeItem
              key={child.id}
              node={child}
              activeId={activeId}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
