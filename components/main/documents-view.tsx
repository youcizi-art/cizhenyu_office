"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";
import {
  Search,
  Files,
  FileText,
  Table,
  Presentation,
  Loader2,
  Upload,
  X,
  FileType2,
  FileCode2,
  Tag,
  Move,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  deleteDocument,
  updateDocumentMeta,
  reorderDocuments,
  DocumentMeta,
} from "@/lib/api";
import { usePageTitle } from "@/hooks/use-page-title";
import { DocumentCard } from "./documents/document-card";
import { DocumentSidebar, TreeNode } from "./documents/document-sidebar";
import {
  CategoryModal,
  RenameDocModal,
  MoveDocModal,
  EditTagsModal,
  ShareModal,
  UploadModal,
  ConfirmModal,
} from "./documents/document-modals";
import { useDocumentDrag } from "./documents/use-document-drag";
import { useDocumentsData } from "./documents/use-documents-data";

export function DocumentsView() {
  const router = useRouter();
  const t = useExtracted();
  usePageTitle(t({ id: "DocumentsPageTitle", message: "Documents — CIZHENYU Office" }));

  // 从自定义 Hook 获取状态与操作函数
  const {
    documents,
    setDocuments,
    categories,
    setCategories,
    isLoading,
    categoryModal,
    setCategoryModal,
    catNameInput,
    setCatNameInput,
    renameDocModal,
    setRenameDocModal,
    docNameInput,
    setDocNameInput,
    moveDocModal,
    setMoveDocModal,
    editingTagsDoc,
    setEditingTagsDoc,
    shareModal,
    setShareModal,
    uploadModalOpen,
    setUploadModalOpen,
    uploadFile,
    setUploadFile,
    uploadTargetCatId,
    setUploadTargetCatId,
    isUploading,
    confirmModal,
    setConfirmModal,
    handleSaveCategory,
    handleDeleteCategory,
    handleTogglePin,
    handleSaveTags,
    handleEnableShare,
    handleDisableShare,
    handleCopyShare,
    handleUploadSubmit,
  } = useDocumentsData();

  // 侧边栏折叠与展开状态
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 文档类型配置
  const types = [
    { name: t({ id: "All", message: "All" }), icon: Files, key: "All" },
    { name: "Word", icon: FileText, key: "Word" },
    { name: "Excel", icon: Table, key: "Excel" },
    { name: "PowerPoint", icon: Presentation, key: "PowerPoint" },
    { name: "PDF", icon: FileType2, key: "PDF" },
    { name: "Markdown", icon: FileCode2, key: "Markdown" },
  ];

  // 收集所有现有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach((d) => {
      d.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [documents]);

  // 构建分类树
  const categoryTree = useMemo(() => {
    const buildNodes = (parentId: string | null): TreeNode[] => {
      return categories
        .filter((c) => c.parentId === parentId)
        .map((cat) => ({
          category: cat,
          children: buildNodes(cat.id),
        }));
    };
    return buildNodes(null);
  }, [categories]);

  const getSubCategoryIds = (catId: string): string[] => {
    const ids = [catId];
    const children = categories.filter((c) => c.parentId === catId);
    for (const child of children) {
      ids.push(...getSubCategoryIds(child.id));
    }
    return ids;
  };

  const unclassifiedCount = useMemo(() => {
    return documents.filter((d) => !d.categoryId).length;
  }, [documents]);

  // 过滤文档
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      let matchesType = true;
      if (activeType === "Word") matchesType = doc.type === "docx";
      if (activeType === "Excel") matchesType = doc.type === "xlsx";
      if (activeType === "PowerPoint") matchesType = doc.type === "pptx";
      if (activeType === "PDF") matchesType = doc.type === "pdf";
      if (activeType === "Markdown") matchesType = doc.type === "md";

      let matchesCategory = true;
      if (activeCategoryId === "__unclassified__") {
        matchesCategory = !doc.categoryId;
      } else if (activeCategoryId) {
        const allowedCatIds = getSubCategoryIds(activeCategoryId);
        matchesCategory = !!(doc.categoryId && allowedCatIds.includes(doc.categoryId));
      }

      let matchesTag = true;
      if (selectedTag) {
        matchesTag = !!(doc.tags && doc.tags.includes(selectedTag));
      }

      return matchesSearch && matchesType && matchesCategory && matchesTag;
    });
  }, [documents, searchQuery, activeType, activeCategoryId, selectedTag, categories]);

  // 置顶优先排序，未置顶按 order 升序 (默认 999999)，最后按 updatedAt 降序兜底
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        const timeA = a.pinnedAt || a.createdAt;
        const timeB = b.pinnedAt || b.createdAt;
        return timeB - timeA;
      }
      const orderA = typeof a.order === "number" ? a.order : 999999;
      const orderB = typeof b.order === "number" ? b.order : 999999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [filteredDocuments]);

  // 长按 300ms 或点击数字角标拖动排序 Hook (参考 tudolist 规范)
  const gridContainerRef = useRef<HTMLDivElement>(null);
  useDocumentDrag(gridContainerRef, {
    enabled: !searchQuery && !selectedTag,
    deps: [isLoading, sortedDocuments.length],
    onReorder: async (newOrderedIds) => {
      try {
        const docMap = new Map(documents.map((d) => [d.id, d]));
        const updatedDocs: DocumentMeta[] = [];
        newOrderedIds.forEach((id, idx) => {
          const d = docMap.get(id);
          if (d) {
            d.order = idx;
            updatedDocs.push(d);
            docMap.delete(id);
          }
        });
        docMap.forEach((d) => updatedDocs.push(d));
        setDocuments(updatedDocs);

        await reorderDocuments(newOrderedIds);
        toast.success(t({ id: "OrderSaved", message: "Document order saved" }));
      } catch {
        toast.error(t({ id: "SaveOrderFailed", message: "Failed to save document order" }));
      }
    },
  });

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden bg-background">
      {/* 桌面端分类树形侧边栏 */}
      <DocumentSidebar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        activeCategoryId={activeCategoryId}
        onSelectCategory={(catId) => {
          setActiveCategoryId(catId);
          setSelectedTag(null);
        }}
        documentsCount={documents.length}
        unclassifiedCount={unclassifiedCount}
        categoryTree={categoryTree}
        expandedCats={expandedCats}
        onToggleCatExpand={(catId, e) => {
          e.stopPropagation();
          setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
        }}
        onOpenCreateCategory={(parentId) => {
          setCategoryModal({ open: true, mode: "create", parentId });
          setCatNameInput("");
        }}
        onDeleteCategory={(cat) =>
          handleDeleteCategory(cat, (id) => {
            if (activeCategoryId === id) setActiveCategoryId(null);
          })
        }
      />

      {/* 主工作区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部搜索与上传栏 */}
        <header className="px-4 py-3 border-b border-border bg-card/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t({ id: "SearchDocumentsPlaceholder", message: "Search documents..." })}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t({ id: "UploadLocalDoc", message: "Upload Document" })}</span>
            </button>
          </div>
        </header>

        {/* 文档类型筛选栏 */}
        <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center gap-1 overflow-x-auto text-xs">
          {types.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => setActiveType(type.key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1",
                activeType === type.key
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <type.icon className="w-3 h-3" />
              <span>{type.name}</span>
            </button>
          ))}
        </div>

        {/* 标签筛选栏 (单独占一行，置于文档类型下方) */}
        {allTags.length > 0 && (
          <div className="px-4 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto text-xs animate-in fade-in">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 font-medium mr-1">
              <Tag className="w-3 h-3 text-sky-500" />
              <span>{t({ id: "FilterByTag", message: "Tags:" })}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer shrink-0",
                selectedTag === null
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {t({ id: "AllTags", message: "All" })}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer shrink-0",
                  selectedTag === tag
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* 提示与拖拽辅助说明条 */}
        <div className="px-4 py-1.5 bg-muted/10 border-b border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Move className="w-3 h-3 text-primary" />
            <span>{t({ id: "DragHint", message: "Hold card for 0.25s to drag and reorder" })}</span>
          </div>
          <span>
            {t("{count} documents", { count: String(sortedDocuments.length) })}
          </span>
        </div>

        {/* 文档卡片网格列表 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">{t({ id: "LoadingR2Docs", message: "Loading cloud documents..." })}</p>
            </div>
          ) : sortedDocuments.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Files className="w-10 h-10 text-muted-foreground/40 mb-1" />
              <p className="text-sm font-semibold text-foreground">
                {t({ id: "NoMatchingDocs", message: "No matching documents found" })}
              </p>
              <p className="text-xs max-w-sm">
                {t({ id: "TryAnotherSearch", message: "Try adjusting your filters, or upload a local document." })}
              </p>
            </div>
          ) : (
            <div
              ref={gridContainerRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {sortedDocuments.map((doc, idx) => (
                <DocumentCard
                  key={doc.id}
                  index={idx}
                  doc={doc}
                  onOpen={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}&type=${doc.type}`)}
                  onDownload={() => {
                    const a = document.createElement("a");
                    a.href = `/api/documents/${encodeURIComponent(doc.id)}/content`;
                    a.download = doc.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  onShare={(targetDoc) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const shareUrl = targetDoc.shareToken ? `${origin}/share?token=${targetDoc.shareToken}` : "";
                    setShareModal({ open: true, doc: targetDoc, shareUrl, copied: false });
                  }}
                  onTogglePin={handleTogglePin}
                  onEditTags={(targetDoc) => setEditingTagsDoc(targetDoc)}
                  onTagClick={(tag) => setSelectedTag(tag)}
                  onRename={(targetDoc) => {
                    setRenameDocModal({ open: true, doc: targetDoc });
                    setDocNameInput(targetDoc.name);
                  }}
                  onMove={(targetDoc) => setMoveDocModal({ open: true, doc: targetDoc })}
                  onDelete={(targetDoc) => {
                    setConfirmModal({
                      open: true,
                      title: t({ id: "DeleteDocumentTitle", message: "Delete Document" }),
                      description: `${targetDoc.name}?`,
                      confirmText: t({ id: "Delete", message: "Delete" }),
                      onConfirm: async () => {
                        try {
                          await deleteDocument(targetDoc.id);
                          setDocuments((prev) => prev.filter((d) => d.id !== targetDoc.id));
                          toast.success(t({ id: "DeleteSuccess", message: "Document deleted" }));
                        } catch (err) {
                          toast.error(String(err));
                        }
                      },
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 弹窗集合 */}
      <CategoryModal
        open={categoryModal.open}
        mode={categoryModal.mode}
        catName={catNameInput}
        onChangeCatName={setCatNameInput}
        onClose={() => setCategoryModal((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSaveCategory}
      />

      <RenameDocModal
        open={renameDocModal.open}
        docName={docNameInput}
        onChangeDocName={setDocNameInput}
        onClose={() => setRenameDocModal({ open: false, doc: null })}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!renameDocModal.doc || !docNameInput.trim()) return;
          try {
            const updated = await updateDocumentMeta(renameDocModal.doc.id, {
              name: docNameInput.trim(),
            });
            setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setRenameDocModal({ open: false, doc: null });
            toast.success(t({ id: "RenameSuccess", message: "Document renamed" }));
          } catch (err) {
            toast.error(String(err));
          }
        }}
      />

      <MoveDocModal
        open={moveDocModal.open}
        categories={categories}
        currentCatId={moveDocModal.doc?.categoryId || null}
        onClose={() => setMoveDocModal({ open: false, doc: null })}
        onSelectCategory={async (targetCatId) => {
          if (!moveDocModal.doc) return;
          try {
            const updated = await updateDocumentMeta(moveDocModal.doc.id, {
              categoryId: targetCatId,
            });
            setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setMoveDocModal({ open: false, doc: null });
            toast.success(t({ id: "MoveSuccess", message: "Document moved" }));
          } catch (err) {
            toast.error(String(err));
          }
        }}
      />

      <EditTagsModal
        open={!!editingTagsDoc}
        doc={editingTagsDoc}
        onClose={() => setEditingTagsDoc(null)}
        onSaveTags={handleSaveTags}
      />

      <ShareModal
        open={shareModal.open}
        doc={shareModal.doc}
        shareUrl={shareModal.shareUrl}
        copied={shareModal.copied}
        onClose={() => setShareModal({ open: false, doc: null, shareUrl: "", copied: false })}
        onEnableShare={handleEnableShare}
        onDisableShare={handleDisableShare}
        onCopy={handleCopyShare}
      />

      <UploadModal
        open={uploadModalOpen}
        categories={categories}
        uploadFile={uploadFile}
        targetCatId={uploadTargetCatId}
        isUploading={isUploading}
        onSelectFile={setUploadFile}
        onChangeTargetCat={setUploadTargetCatId}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadFile(null);
        }}
        onSubmit={handleUploadSubmit}
      />

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
