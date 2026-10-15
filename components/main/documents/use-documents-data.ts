"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useExtracted } from "next-intl";
import {
  fetchDocumentsAndCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteDocument,
  updateDocumentMeta,
  reorderDocuments,
  enableShare,
  disableShare,
  saveNewDocument,
  DocumentMeta,
  Category,
} from "@/lib/api";

export function useDocumentsData() {
  const t = useExtracted();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 弹窗状态
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    mode: "create" | "rename";
    parentId: string | null;
    targetCat?: Category;
  }>({ open: false, mode: "create", parentId: null });
  const [catNameInput, setCatNameInput] = useState<string>("");

  const [renameDocModal, setRenameDocModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
  }>({ open: false, doc: null });
  const [docNameInput, setDocNameInput] = useState<string>("");

  const [moveDocModal, setMoveDocModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
  }>({ open: false, doc: null });

  const [editingTagsDoc, setEditingTagsDoc] = useState<DocumentMeta | null>(null);

  const [shareModal, setShareModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
    shareUrl: string;
    copied: boolean;
  }>({ open: false, doc: null, shareUrl: "", copied: false });

  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTargetCatId, setUploadTargetCatId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchDocumentsAndCategories();
      setDocuments(res.documents || []);
      setCategories(res.categories || []);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存分类
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catNameInput.trim();
    if (!name) return;

    try {
      if (categoryModal.mode === "create") {
        const newCat = await createCategory(name, categoryModal.parentId);
        setCategories((prev) => [...prev, newCat]);
        toast.success(name);
      } else if (categoryModal.mode === "rename" && categoryModal.targetCat) {
        const updated = await updateCategory(categoryModal.targetCat.id, name);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success(name);
      }
      setCategoryModal({ open: false, mode: "create", parentId: null });
      setCatNameInput("");
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 删除分类
  const handleDeleteCategory = (cat: Category, onDeleted?: (id: string) => void) => {
    setConfirmModal({
      open: true,
      title: t({ id: "DeleteCategoryTitle", message: "Delete Category" }),
      description: `${cat.name}?`,
      confirmText: t({ id: "Delete", message: "Delete" }),
      onConfirm: async () => {
        try {
          const deletedIds = await deleteCategory(cat.id);
          setCategories((prev) => prev.filter((c) => !deletedIds.includes(c.id)));
          setDocuments((prev) =>
            prev.map((d) =>
              d.categoryId && deletedIds.includes(d.categoryId)
                ? { ...d, categoryId: null }
                : d
            )
          );
          onDeleted?.(cat.id);
          toast.success(t({ id: "DeleteCategorySuccess", message: "Category deleted" }));
        } catch (err) {
          toast.error(String(err));
        }
      },
    });
  };

  // 一键置顶 / 取消置顶 (采用 Optimistic UI 毫秒级瞬间响应)
  const handleTogglePin = async (doc: DocumentMeta) => {
    const nextPinned = !doc.pinned;
    const now = Date.now();
    const optimisticDoc: DocumentMeta = {
      ...doc,
      pinned: nextPinned,
      pinnedAt: nextPinned ? now : undefined,
    };

    // 立即更新前端状态，零延迟响应
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? optimisticDoc : d)));
    toast.success(
      nextPinned
        ? t({ id: "PinSuccess", message: "Document pinned to top" })
        : t({ id: "UnpinSuccess", message: "Document unpinned" })
    );

    try {
      await updateDocumentMeta(doc.id, {
        pinned: nextPinned,
        pinnedAt: nextPinned ? now : undefined,
      });
    } catch (err) {
      // 失败自动回滚
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      toast.error(String(err));
    }
  };

  // 保存标签
  const handleSaveTags = async (tags: string[]) => {
    if (!editingTagsDoc) return;
    try {
      const updated = await updateDocumentMeta(editingTagsDoc.id, { tags });
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingTagsDoc(null);
      toast.success(t({ id: "UpdateTagsSuccess", message: "Tags updated successfully" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 开启外链 (支持提取密钥与展示/下载模式)
  const handleEnableShare = async (passcode?: string, shareMode?: "download" | "preview") => {
    if (!shareModal.doc) return;
    try {
      const res = await enableShare(shareModal.doc.id, passcode, shareMode);
      const updatedDoc: DocumentMeta = {
        ...shareModal.doc,
        shareToken: res.shareToken,
        sharePassword: res.sharePassword,
        shareMode: res.shareMode,
      };
      setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const queryParam =
        res.shareMode === "preview"
          ? `?token=${res.shareToken}&mode=preview`
          : `?token=${res.shareToken}`;
      setShareModal({
        open: true,
        doc: updatedDoc,
        shareUrl: `${origin}/share${queryParam}`,
        copied: false,
      });
      toast.success(t({ id: "ShareEnabled", message: "Share link enabled" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 关闭分享
  const handleDisableShare = async () => {
    if (!shareModal.doc) return;
    try {
      await disableShare(shareModal.doc.id);
      const updatedDoc = {
        ...shareModal.doc,
        shareToken: undefined,
        sharePassword: undefined,
        shareMode: undefined,
      };
      setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
      setShareModal((prev) => ({ ...prev, open: false, doc: null }));
      toast.success(t({ id: "ShareDisabled", message: "Share link disabled" }));
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 复制分享
  const handleCopyShare = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShareModal((prev) => ({ ...prev, copied: true }));
      toast.success(t({ id: "ShareCopySuccess", message: "Share information copied to clipboard" }));
      setTimeout(() => setShareModal((prev) => ({ ...prev, copied: false })), 2500);
    } catch {
      toast.error(t({ id: "CopyFailed", message: "Copy failed, please copy manually" }));
    }
  };

  // 上传本地文档
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      const ext = uploadFile.name.split(".").pop()?.toLowerCase();
      let type: any = "docx";
      if (ext === "xlsx") type = "xlsx";
      if (ext === "pptx") type = "pptx";
      if (ext === "pdf") type = "pdf";
      const newDoc = await saveNewDocument({
        file: uploadFile,
        name: uploadFile.name,
        type,
        categoryId: uploadTargetCatId,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setUploadModalOpen(false);
      setUploadFile(null);
      toast.success(t({ id: "UploadSuccess", message: "Document uploaded successfully" }));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsUploading(false);
    }
  };

  return {
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
  };
}
