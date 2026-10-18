"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "@/hooks/use-i18n";
import {
  Files,
  FileText,
  Table,
  Presentation,
  Loader2,
  FileType2,
  FileCode2,
  Image as ImageIcon,
  Video,
  Music,
  File as FileGeneric,
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
import { MediaPreviewModal } from "./documents/media-preview-modal";
import { FileDetailsModal } from "./documents/file-details-modal";
import { PaginationBar } from "./documents/pagination-bar";
import { DocumentsToolbar } from "./documents/documents-toolbar";
import { useDocumentDrag } from "./documents/use-document-drag";
import { useDocumentsData } from "./documents/use-documents-data";

export function DocumentsView() {
  const router = useRouter();
  const t = useExtracted();
  usePageTitle(t({ id: "DocumentsPageTitle", message: "Documents — CIZHENYU Office" }));

  // 弹窗状态
  const [previewMediaDoc, setPreviewMediaDoc] = useState<DocumentMeta | null>(null);
  const [fileDetailsDoc, setFileDetailsDoc] = useState<DocumentMeta | null>(null);

  // 侧边栏折叠与展开状态
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // 筛选与服务端分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeType, setActiveType] = useState<string>("All");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 构造服务端查询参数
  const queryParams = useMemo(
    () => ({
      page: currentPage,
      pageSize,
      search: searchQuery,
      type: activeType,
      categoryId: activeCategoryId,
      tag: selectedTag,
    }),
    [currentPage, pageSize, searchQuery, activeType, activeCategoryId, selectedTag]
  );

  // 从自定义 Hook 获取服务端过滤与分页数据
  const {
    documents,
    setDocuments,
    categories,
    setCategories,
    allTags: serverTags,
    pagination,
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
    loadData,
    handleSaveCategory,
    handleDeleteCategory,
    handleTogglePin,
    handleSaveTags,
    handleEnableShare,
    handleDisableShare,
    handleCopyShare,
    handleUploadSubmit,
  } = useDocumentsData(queryParams);

  // 文档类型配置
  const types = [
    { name: t({ id: "All", message: "All" }), icon: Files, key: "All" },
    { name: "Word", icon: FileText, key: "Word" },
    { name: "Excel", icon: Table, key: "Excel" },
    { name: "PowerPoint", icon: Presentation, key: "PowerPoint" },
    { name: "PDF", icon: FileType2, key: "PDF" },
    { name: "Markdown", icon: FileCode2, key: "Markdown" },
    { name: t({ id: "TypeImage", message: "Image" }), icon: ImageIcon, key: "Image" },
    { name: t({ id: "TypeVideo", message: "Video" }), icon: Video, key: "Video" },
    { name: t({ id: "TypeAudio", message: "Audio" }), icon: Music, key: "Audio" },
    { name: t({ id: "TypeOther", message: "Other" }), icon: FileGeneric, key: "Other" },
  ];

  // 汇总所有可用标签
  const displayTags = useMemo(() => {
    if (serverTags && serverTags.length > 0) return serverTags;
    const tagSet = new Set<string>();
    documents.forEach((d) => d.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [serverTags, documents]);

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

  const unclassifiedCount = useMemo(() => {
    return documents.filter((d) => !d.categoryId).length;
  }, [documents]);

  // 容器滚动引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // 长按 300ms 或点击数字角标拖动排序 Hook
  useDocumentDrag(gridContainerRef, {
    enabled: !searchQuery && !selectedTag,
    deps: [isLoading, documents.length],
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

  // 处理卡片点击打开
  const handleOpenCard = (targetDoc: DocumentMeta) => {
    if (
      targetDoc.type === "image" ||
      targetDoc.type === "video" ||
      targetDoc.type === "audio"
    ) {
      setPreviewMediaDoc(targetDoc);
    } else if (targetDoc.type === "other") {
      // 其它文件打开详情弹窗，杜绝直接下载
      setFileDetailsDoc(targetDoc);
    } else {
      router.push(`/editor?docId=${encodeURIComponent(targetDoc.id)}&type=${targetDoc.type}`);
    }
  };

  const handleDownloadDoc = (targetDoc: DocumentMeta) => {
    const a = document.createElement("a");
    a.href = `/api/documents/${encodeURIComponent(targetDoc.id)}/content`;
    a.download = targetDoc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenShare = (targetDoc: DocumentMeta) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = targetDoc.shareToken ? `${origin}/share?token=${targetDoc.shareToken}` : "";
    setShareModal({ open: true, doc: targetDoc, shareUrl, copied: false });
  };

  const handleDeleteDoc = (targetDoc: DocumentMeta) => {
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
          loadData();
        } catch (err) {
          toast.error(String(err));
        }
      },
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* 桌面端分类树形侧边栏 */}
      <DocumentSidebar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        activeCategoryId={activeCategoryId}
        onSelectCategory={(catId) => {
          setActiveCategoryId(catId);
          setSelectedTag(null);
          setCurrentPage(1);
        }}
        documentsCount={pagination.total || documents.length}
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
        {/* 顶部自适应工具栏与类型标签 */}
        <DocumentsToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          activeType={activeType}
          onTypeChange={(typeKey) => {
            setActiveType(typeKey);
            setCurrentPage(1);
          }}
          types={types}
          displayTags={displayTags}
          selectedTag={selectedTag}
          onTagChange={(tag) => {
            setSelectedTag(tag);
            setCurrentPage(1);
          }}
          onOpenUpload={() => setUploadModalOpen(true)}
          totalCount={pagination.total || documents.length}
        />

        {/* 文档卡片网格列表 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">{t({ id: "LoadingR2Docs", message: "Loading cloud documents..." })}</p>
            </div>
          ) : documents.length === 0 ? (
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
              {documents.map((doc, idx) => (
                <DocumentCard
                  key={doc.id}
                  index={(currentPage - 1) * pageSize + idx}
                  doc={doc}
                  onOpen={handleOpenCard}
                  onDownload={handleDownloadDoc}
                  onShare={handleOpenShare}
                  onTogglePin={handleTogglePin}
                  onEditTags={(targetDoc) => setEditingTagsDoc(targetDoc)}
                  onTagClick={(tag) => {
                    setSelectedTag(tag);
                    setCurrentPage(1);
                  }}
                  onRename={(targetDoc) => {
                    setRenameDocModal({ open: true, doc: targetDoc });
                    setDocNameInput(targetDoc.name);
                  }}
                  onMove={(targetDoc) => setMoveDocModal({ open: true, doc: targetDoc })}
                  onDelete={handleDeleteDoc}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部服务端分页控制器 */}
        <PaginationBar
          currentPage={currentPage}
          pageSize={pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(p) => {
            setCurrentPage(p);
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
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

      <MediaPreviewModal
        doc={previewMediaDoc}
        onClose={() => setPreviewMediaDoc(null)}
      />

      <FileDetailsModal
        doc={fileDetailsDoc}
        categories={categories}
        onClose={() => setFileDetailsDoc(null)}
        onDownload={handleDownloadDoc}
        onShare={handleOpenShare}
        onEditTags={(targetDoc) => setEditingTagsDoc(targetDoc)}
        onMove={(targetDoc) => setMoveDocModal({ open: true, doc: targetDoc })}
        onRename={(targetDoc) => {
          setRenameDocModal({ open: true, doc: targetDoc });
          setDocNameInput(targetDoc.name);
        }}
        onDelete={handleDeleteDoc}
      />
    </div>
  );
}
