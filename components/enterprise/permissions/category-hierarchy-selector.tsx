"use client";

import React, { useMemo } from "react";
import { Folder, FolderTree } from "lucide-react";
import { Category } from "@/lib/api";

interface CategoryHierarchySelectorProps {
  categories?: Category[];
  value: string;
  onChange: (catId: string, category?: Category) => void;
  placeholder?: string;
  className?: string;
}

interface TreeCategoryOption {
  id: string;
  name: string;
  depth: number;
  raw: Category;
}

export function CategoryHierarchySelector({
  categories: propCategories,
  value,
  onChange,
  placeholder = "Select Category",
  className = "",
}: CategoryHierarchySelectorProps) {
  const [fetchedCategories, setFetchedCategories] = React.useState<Category[]>([]);

  React.useEffect(() => {
    if (!propCategories) {
      fetch("/api/documents?page=1&pageSize=1", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.categories) {
            setFetchedCategories(data.categories);
          }
        })
        .catch(() => {});
    }
  }, [propCategories]);

  const categories = propCategories || fetchedCategories;
  // 递归将带有 parentId 的分类构建为树状缩进列表
  const flattenedTree = useMemo(() => {
    const result: TreeCategoryOption[] = [];

    const traverse = (parentId: string | null, depth: number) => {
      const children = categories.filter((c) => c.parentId === parentId);
      for (const child of children) {
        result.push({
          id: child.id,
          name: child.name,
          depth,
          raw: child,
        });
        traverse(child.id, depth + 1);
      }
    };

    traverse(null, 0);

    // 容错：有些分类可能孤立未挂载到顶层
    const visited = new Set(result.map((r) => r.id));
    for (const c of categories) {
      if (!visited.has(c.id)) {
        result.push({ id: c.id, name: c.name, depth: 0, raw: c });
      }
    }

    return result;
  }, [categories]);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => {
          const selectedId = e.target.value;
          const matched = flattenedTree.find((item) => item.id === selectedId);
          onChange(selectedId, matched ? matched.raw : undefined);
        }}
        className="w-full appearance-none rounded-xl border border-border bg-background py-2 pl-3 pr-8 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {flattenedTree.map((item) => {
          // 通过 Unicode 树枝或点阵展示真实的层级缩进
          const prefix = item.depth === 0 ? "📁 " : `${"\u00A0\u00A0".repeat(item.depth)}└─ 📄 `;
          return (
            <option key={item.id} value={item.id} className="py-1">
              {prefix}
              {item.name}
            </option>
          );
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
        <FolderTree className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
