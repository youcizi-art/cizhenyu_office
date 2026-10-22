"use client";

import React, { useState, useEffect } from "react";
import { useExtracted } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  FileText,
  Loader2,
  Folder,
  Tag as TagIcon,
} from "lucide-react";
import { DocumentMeta, Category } from "@/lib/api";

interface DocumentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedDocs: DocumentMeta[]) => void;
  initialSelectedIds?: string[];
  multiSelect?: boolean;
  title?: string;
}

export function DocumentSelectorModal({
  isOpen,
  onClose,
  onSelect,
  initialSelectedIds = [],
  multiSelect = true,
  title,
}: DocumentSelectorModalProps) {
  const t = useExtracted();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // 筛选与分页
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 选中状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [selectedMap, setSelectedMap] = useState<Map<string, DocumentMeta>>(new Map());

  // 同步 initialSelectedIds
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialSelectedIds));
    }
  }, [isOpen, initialSelectedIds]);

  // 加载数据
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    if (search.trim()) params.set("search", search.trim());
    if (selectedCatId !== "all") params.set("categoryId", selectedCatId);
    if (selectedTag !== "all") params.set("tag", selectedTag);

    fetch(`/api/documents?${params.toString()}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setDocuments(data.documents || []);
          if (data.categories) setCategories(data.categories);
          if (data.allTags) setTags(data.allTags);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotal(data.pagination.total || 0);
          }
          // 缓存已拉取到的文档对象供回传
          setSelectedMap((prev) => {
            const next = new Map(prev);
            data.documents?.forEach((d: DocumentMeta) => next.set(d.id, d));
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, page, search, selectedCatId, selectedTag]);

  const toggleSelect = (doc: DocumentMeta) => {
    setSelectedMap((prev) => new Map(prev).set(doc.id, doc));
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(doc.id)) next.delete(doc.id);
        else next.add(doc.id);
        return next;
      });
    } else {
      setSelectedIds(new Set([doc.id]));
    }
  };

  const handleConfirm = () => {
    const list: DocumentMeta[] = [];
    selectedIds.forEach((id) => {
      const doc = selectedMap.get(id);
      if (doc) list.push(doc);
      else list.push({ id, name: id, type: "docx", createdAt: 0, updatedAt: 0 } as any);
    });
    onSelect(list);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
            <span>{title || t({ id: "SelectDocuments", message: "Select Documents" })}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {selectedIds.size} {t({ id: "Selected", message: "selected" })}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t({
              id: "SelectDocumentsDesc",
              message: "Search, filter by category or tag, and select documents to assign permissions.",
            })}
          </DialogDescription>
        </DialogHeader>

        {/* 顶部搜索与多维过滤工具栏 */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
          {/* 搜索框 */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t({ id: "SearchDocsPlaceholder", message: "Search document title..." })}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 分类筛选 */}
          <div className="sm:col-span-3">
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="all">{t({ id: "AllCategories", message: "All Categories" })}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 标签筛选 */}
          <div className="sm:col-span-3">
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="all">{t({ id: "AllTags", message: "All Tags" })}</option>
              {tags.map((tg) => (
                <option key={tg} value={tg}>
                  #{tg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 文档列表区 */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[240px] max-h-[360px] p-1 rounded-xl border border-border/80 bg-muted/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">No documents found matching criteria</p>
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleSelect(doc)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/60 bg-background hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-foreground truncate">{doc.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="uppercase font-mono">{doc.type}</span>
                        {doc.categoryId && (
                          <span className="flex items-center gap-0.5">
                            <Folder className="w-2.5 h-2.5" />
                            {categories.find((c) => c.id === doc.categoryId)?.name || "Category"}
                          </span>
                        )}
                        {doc.tags && doc.tags.length > 0 && (
                          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                            <TagIcon className="w-2.5 h-2.5" />
                            {doc.tags.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部分页与操作按键 */}
        <div className="flex items-center justify-between pt-2 border-t border-border/80 text-xs text-muted-foreground">
          <span>
            {total} docs · Page {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <DialogFooter className="mt-2 pt-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer"
          >
            {t({ id: "Cancel", message: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
          >
            {t({ id: "ConfirmSelection", message: "Confirm Selection" })} ({selectedIds.size})
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
