"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";
import {
  Search,
  Files,
  FileText,
  Table,
  Presentation,
  Loader2,
  FolderPlus,
  Cloud,
  Share2,
  Download,
  Trash2,
  Edit3,
  FolderInput,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Copy,
  Check,
  Globe,
  Plus,
  Upload,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FileUp,
  X,
  Menu,
  Eye,
  FileEdit,
  FileType2,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDocConfig } from "@/lib/document-types";
import { formatRelativeTime } from "@/utils/recent-files";
import {
  fetchDocumentsAndCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteDocument,
  updateDocumentMeta,
  enableShare,
  disableShare,
  saveNewDocument,
  getDocumentContentBlob,
  DocumentMeta,
  Category,
  DocumentType,
} from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageTitle } from "@/hooks/use-page-title";

interface TreeNode {
  category: Category;
  children: TreeNode[];
}

export function DocumentsView() {
  const router = useRouter();
  const t = useExtracted();
  usePageTitle(t({ id: "DocumentsPageTitle", message: "Documents — CIZHENYU Office" }));
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 桌面端左侧栏折叠状态：默认展开，收起时收缩为小图标侧边栏
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  // 移动端分类抽屉打开状态
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // 记录树节点展开状态（catId -> boolean）
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeType, setActiveType] = useState<string>("All");
  // 当前选中的分类 ID，null 表示查看全部，"__unclassified__" 表示未分类
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // 分类创建/重命名弹窗
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    mode: "create" | "rename";
    parentId: string | null;
    targetCat?: Category;
  }>({ open: false, mode: "create", parentId: null });
  const [catNameInput, setCatNameInput] = useState<string>("");

  // 文档重命名弹窗
  const [renameDocModal, setRenameDocModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
  }>({ open: false, doc: null });
  const [docNameInput, setDocNameInput] = useState<string>("");

  // 移动文档弹窗
  const [moveDocModal, setMoveDocModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
  }>({ open: false, doc: null });

  // 分享外链弹窗
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
    shareUrl: string;
    copied: boolean;
  }>({ open: false, doc: null, shareUrl: "", copied: false });

  // 本地文档上传弹窗
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTargetCatId, setUploadTargetCatId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [convertingDocId, setConvertingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 通用操作确认弹窗 (替代浏览器原生 confirm)
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

  // 加载数据
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

  // 类型选项定义
  const types = [
    { name: t({ id: "All", message: "All" }), icon: Files, key: "All" },
    { name: "Word", icon: FileText, key: "Word" },
    { name: "Excel", icon: Table, key: "Excel" },
    { name: "PowerPoint", icon: Presentation, key: "PowerPoint" },
    { name: "PDF", icon: FileType2, key: "PDF" },
    { name: "Markdown", icon: FileCode2, key: "Markdown" },
  ];

  // 构建分类树形结构
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

  // 递归收集某个分类的所有子分类 ID
  const getSubCategoryIds = (catId: string): string[] => {
    const ids = [catId];
    const children = categories.filter((c) => c.parentId === catId);
    for (const child of children) {
      ids.push(...getSubCategoryIds(child.id));
    }
    return ids;
  };

  // 统计各分类下的文档数量
  const getCategoryDocCount = (catId: string): number => {
    const subIds = getSubCategoryIds(catId);
    return documents.filter((d) => d.categoryId && subIds.includes(d.categoryId)).length;
  };

  const unclassifiedCount = useMemo(() => {
    return documents.filter((d) => !d.categoryId).length;
  }, [documents]);

  // 面包屑路径
  const breadcrumbs = useMemo(() => {
    if (!activeCategoryId || activeCategoryId === "__unclassified__") return [];
    const crumbs: Category[] = [];
    let currentId: string | null = activeCategoryId;
    while (currentId) {
      const found = categories.find((c) => c.id === currentId);
      if (found) {
        crumbs.unshift(found);
        currentId = found.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [activeCategoryId, categories]);

  const defaultUncategorizedText = t({ id: "Uncategorized", message: "Uncategorized" });
  const defaultAllDocsText = t({ id: "AllDocuments", message: "All Documents" });

  // 当前激活分类的展示名称
  const currentCategoryName = useMemo(() => {
    if (!activeCategoryId) return defaultAllDocsText;
    if (activeCategoryId === "__unclassified__") return defaultUncategorizedText;
    const found = categories.find((c) => c.id === activeCategoryId);
    return found ? found.name : defaultUncategorizedText;
  }, [activeCategoryId, categories, defaultAllDocsText, defaultUncategorizedText]);

  // 过滤后的文档列表
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. 搜索词匹配
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      // 2. 文件类型匹配
      let matchesType = true;
      if (activeType === "Word") matchesType = doc.type === "docx";
      if (activeType === "Excel") matchesType = doc.type === "xlsx";
      if (activeType === "PowerPoint") matchesType = doc.type === "pptx";
      if (activeType === "PDF") matchesType = doc.type === "pdf";
      if (activeType === "Markdown") matchesType = doc.type === "md";

      // 3. 分类匹配
      let matchesCategory = true;
      if (activeCategoryId === "__unclassified__") {
        matchesCategory = !doc.categoryId;
      } else if (activeCategoryId) {
        const allowedCatIds = getSubCategoryIds(activeCategoryId);
        matchesCategory = !!(doc.categoryId && allowedCatIds.includes(doc.categoryId));
      }

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [documents, searchQuery, activeType, activeCategoryId, categories]);

  // 切换分类展开/折叠
  const toggleCatExpand = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // 保存分类（创建/重命名）
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catNameInput.trim();
    if (!name) return;

    try {
      if (categoryModal.mode === "create") {
        const newCat = await createCategory(name, categoryModal.parentId);
        setCategories((prev) => [...prev, newCat]);
        if (categoryModal.parentId) {
          setExpandedCats((prev) => ({ ...prev, [categoryModal.parentId!]: true }));
        }
        toast.success(name);
      } else if (categoryModal.mode === "rename" && categoryModal.targetCat) {
        const updated = await updateCategory(categoryModal.targetCat.id, name);
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success(name);
      }
      setCategoryModal({ open: false, mode: "create", parentId: null });
      setCatNameInput("");
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 删除分类
  const handleDeleteCategory = (cat: Category) => {
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
          if (activeCategoryId && deletedIds.includes(activeCategoryId)) {
            setActiveCategoryId(null);
          }
          setConfirmModal((prev) => ({ ...prev, open: false }));
          toast.success("分类已成功删除");
        } catch (err) {
          toast.error(String(err));
        }
      },
    });
  };

  // 重命名文档
  const handleSaveDocName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameDocModal.doc || !docNameInput.trim()) return;

    try {
      const updated = await updateDocumentMeta(renameDocModal.doc.id, {
        name: docNameInput.trim(),
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setRenameDocModal({ open: false, doc: null });
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 移动文档分类
  const handleMoveDoc = async (targetCatId: string | null) => {
    if (!moveDocModal.doc) return;
    try {
      const updated = await updateDocumentMeta(moveDocModal.doc.id, {
        categoryId: targetCatId,
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setMoveDocModal({ open: false, doc: null });
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 删除文档
  const handleDeleteDoc = (doc: DocumentMeta) => {
    setConfirmModal({
      open: true,
      title: t({ id: "DeleteDocumentTitle", message: "Delete Document" }),
      description: `${doc.name}?`,
      confirmText: t({ id: "Delete", message: "Delete" }),
      onConfirm: async () => {
        try {
          await deleteDocument(doc.id);
          setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          setConfirmModal((prev) => ({ ...prev, open: false }));
          toast.success("文档已成功删除");
        } catch (err) {
          toast.error(String(err));
        }
      },
    });
  };

  // 下载文档
  const handleDownloadDoc = (doc: DocumentMeta) => {
    const a = document.createElement("a");
    a.href = `/api/documents/${encodeURIComponent(doc.id)}/content`;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 打开分享弹窗
  const handleOpenShare = (doc: DocumentMeta) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = doc.shareToken
      ? `${origin}/share?token=${doc.shareToken}`
      : "";
    setShareModal({
      open: true,
      doc,
      shareUrl,
      copied: false,
    });
  };

  // 切换公开外链状态
  const handleToggleShare = async () => {
    if (!shareModal.doc) return;
    try {
      const isCurrentlyEnabled = !!shareModal.doc.shareToken;
      if (isCurrentlyEnabled) {
        await disableShare(shareModal.doc.id);
        const updatedDoc = { ...shareModal.doc, shareToken: undefined };
        setDocuments((prev) =>
          prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
        );
        setShareModal((prev) => ({ ...prev, doc: updatedDoc, shareUrl: "" }));
      } else {
        const token = await enableShare(shareModal.doc.id);
        const updatedDoc = { ...shareModal.doc, shareToken: token };
        setDocuments((prev) =>
          prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
        );
        const origin = window.location.origin;
        setShareModal((prev) => ({
          ...prev,
          doc: updatedDoc,
          shareUrl: `${origin}/share?token=${token}`,
        }));
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  // 触发本地文件上传弹窗
  const handleTriggerUpload = (defaultCatId?: string | null) => {
    const catId =
      defaultCatId !== undefined
        ? defaultCatId
        : activeCategoryId === "__unclassified__"
        ? null
        : activeCategoryId;
    setUploadTargetCatId(catId);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  // 确认上传文档
  const handleConfirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const ext = uploadFile.name.split(".").pop()?.toLowerCase();
    let type: DocumentType = "docx";
    if (ext === "xlsx" || ext === "xls" || ext === "csv") type = "xlsx";
    else if (ext === "pptx" || ext === "ppt") type = "pptx";
    else if (ext === "pdf") type = "pdf";
    else if (ext === "md" || ext === "markdown") type = "md";
    else if (ext === "docx" || ext === "doc") type = "docx";
    else return;

    try {
      setIsUploading(true);
      const newDoc = await saveNewDocument({
        file: uploadFile,
        name: uploadFile.name,
        type,
        categoryId: uploadTargetCatId,
      });

      setDocuments((prev) => [newDoc, ...prev]);
      setUploadModalOpen(false);
      setUploadFile(null);
      toast.success(newDoc.name);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsUploading(false);
    }
  };

  // 递归渲染展开状态下的左侧分类树节点
  const renderTreeNode = (node: TreeNode, level = 0, onSelect?: () => void) => {
    const { category, children } = node;
    const isExpanded = expandedCats[category.id] ?? true;
    const isSelected = activeCategoryId === category.id;
    const count = getCategoryDocCount(category.id);
    const hasChildren = children.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          onClick={() => {
            setActiveCategoryId(category.id);
            if (onSelect) onSelect();
          }}
          style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
          className={cn(
            "group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
            isSelected
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleCatExpand(category.id, e)}
                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-muted-foreground shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4.5 shrink-0" />
            )}

            {isExpanded && hasChildren ? (
              <FolderOpen className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-amber-500/80")} />
            ) : (
              <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-amber-500/80")} />
            )}

            <span className="truncate">{category.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground/80 bg-muted"
              )}
            >
              {count}
            </span>

            {/* 分类快捷操作菜单 */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-opacity"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-32 p-1 text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryModal({ open: true, mode: "create", parentId: category.id });
                    setCatNameInput("");
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted rounded text-left cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  {t({ id: "NewSubcategory", message: "New Subcategory" })}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryModal({
                      open: true,
                      mode: "rename",
                      parentId: category.parentId,
                      targetCat: category,
                    });
                    setCatNameInput(category.name);
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted rounded text-left cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  {t({ id: "Rename", message: "Rename" })}
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category);
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded text-left cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  {t({ id: "DeleteCategory", message: "Delete Category" })}
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {children.map((child) => renderTreeNode(child, level + 1, onSelect))}
          </div>
        )}
      </div>
    );
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return defaultUncategorizedText;
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : defaultUncategorizedText;
  };

  // 渲染完整的分类列表内容（用于展开侧栏以及移动端抽屉）
  const renderCategoryListContent = (onSelect?: () => void) => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 头部标题与新建按钮 */}
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            {t({ id: "DocumentCategories", message: "Categories" })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setCategoryModal({
                open: true,
                mode: "create",
                parentId: null,
              });
              setCatNameInput("");
            }}
            title={t({ id: "NewTopCategory", message: "New Top-level Category" })}
            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          {/* 仅在桌面端展开模式下提供侧边栏收起按钮 */}
          <button
            onClick={() => setSidebarOpen(false)}
            title={t({ id: "CollapseCategories", message: "Collapse Categories" })}
            className="hidden md:inline-flex p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 树形菜单项列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {/* 全部文档 */}
        <div
          onClick={() => {
            setActiveCategoryId(null);
            if (onSelect) onSelect();
          }}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
            activeCategoryId === null
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Files className="w-4 h-4" />
            <span>{defaultAllDocsText}</span>
          </div>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeCategoryId === null
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {documents.length}
          </span>
        </div>

        {/* 未分类文档 */}
        <div
          onClick={() => {
            setActiveCategoryId("__unclassified__");
            if (onSelect) onSelect();
          }}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
            activeCategoryId === "__unclassified__"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-slate-400" />
            <span>{defaultUncategorizedText}</span>
          </div>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeCategoryId === "__unclassified__"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {unclassifiedCount}
          </span>
        </div>

        <div className="my-2 border-t border-border/60" />

        {/* 多级分类树节点 */}
        <div className="space-y-0.5">
          {categoryTree.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground/60">
              {t({ id: "NoCategories", message: "No categories yet, click above to create" })}
            </div>
          ) : (
            categoryTree.map((node) => renderTreeNode(node, 0, onSelect))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
      {/* 隐藏的真实文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf,.csv,.md,.markdown"
        className="hidden"
      />

      {/* 主界面：左右分栏布局 */}
      <div className="flex-1 flex overflow-hidden w-full h-full">
        {/* 桌面端：树形分类侧边栏 */}
        <aside
          className={cn(
            "hidden md:flex border-r border-border bg-card/30 flex-col shrink-0 transition-all duration-300 ease-in-out z-10 select-none",
            sidebarOpen ? "w-60" : "w-14 items-center"
          )}
        >
          {sidebarOpen ? (
            renderCategoryListContent()
          ) : (
            /* 收缩状态：小图标垂直工具栏 */
            <div className="w-full flex-1 flex flex-col items-center py-2.5 justify-between">
              <div className="w-full flex flex-col items-center space-y-1.5">
                {/* 顶部：展开按钮 */}
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <PanelLeftOpen className="w-4.5 h-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t({ id: "ExpandCategories", message: "Expand Categories" })}
                  </TooltipContent>
                </Tooltip>

                {/* 新建分类图标 */}
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setCategoryModal({
                          open: true,
                          mode: "create",
                          parentId: null,
                        });
                        setCatNameInput("");
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t({ id: "NewCategory", message: "New Category" })}
                  </TooltipContent>
                </Tooltip>

                <div className="w-6 border-t border-border/60 my-1" />

                {/* 全部文档小图标 */}
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveCategoryId(null)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer relative",
                        activeCategoryId === null
                          ? "bg-primary/10 text-primary font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Files className="w-4 h-4" />
                      {documents.length > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {defaultAllDocsText} ({documents.length})
                  </TooltipContent>
                </Tooltip>

                {/* 未分类小图标 */}
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveCategoryId("__unclassified__")}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer relative",
                        activeCategoryId === "__unclassified__"
                          ? "bg-primary/10 text-primary font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Folder className="w-4 h-4" />
                      {unclassifiedCount > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {defaultUncategorizedText} ({unclassifiedCount})
                  </TooltipContent>
                </Tooltip>

                <div className="w-6 border-t border-border/60 my-1" />

                {/* 分类列表图标快捷切换 */}
                <div className="w-full flex flex-col items-center space-y-1 max-h-[45vh] overflow-y-auto scrollbar-hide">
                  {categories.map((c) => {
                    const count = getCategoryDocCount(c.id);
                    const isSelected = activeCategoryId === c.id;
                    return (
                      <Tooltip key={c.id} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setActiveCategoryId(c.id)}
                            className={cn(
                              "w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer relative",
                              isSelected
                                ? "bg-primary/10 text-primary font-bold shadow-xs"
                                : "text-amber-500/80 hover:bg-muted hover:text-amber-600"
                            )}
                          >
                            <Folder className="w-4 h-4" />
                            {count > 0 && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary/70 rounded-full" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {c.name} ({count})
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* 底部展开按钮 */}
              <div className="w-full flex flex-col items-center pt-2 border-t border-border/40">
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t({ id: "ExpandCategories", message: "Expand Categories" })}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </aside>

        {/* 移动端抽屉（Drawer/Overlay Sheet） */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* 遮罩背景 */}
            <div
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in transition-opacity"
            />
            {/* 抽屉内容容器 */}
            <div className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    {t({ id: "DocumentCategories", message: "Categories" })}
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderCategoryListContent(() => setMobileDrawerOpen(false))}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：主文档展示区域 */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-full">
          {/* 右侧顶部栏 */}
          <div className="p-3 md:p-4 border-b border-border flex items-center justify-between gap-2 md:gap-4 shrink-0 bg-card/20">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {/* 桌面端：展开/收起左侧栏按钮 */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? t({ id: "CollapseCategories", message: "Collapse Categories" }) : t({ id: "ExpandCategories", message: "Expand Categories" })}
                className="hidden md:inline-flex p-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-primary" />
                )}
              </button>

              {/* 移动端：打开分类抽屉按钮 */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-card/60 hover:bg-muted text-foreground rounded-lg transition-colors text-xs font-medium cursor-pointer shrink-0"
              >
                <Menu className="w-3.5 h-3.5 text-primary" />
                <span className="truncate max-w-[90px]">{currentCategoryName}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              {/* 桌面端面包屑导航与当前分类指示 */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span
                  onClick={() => setActiveCategoryId(null)}
                  className={cn(
                    "cursor-pointer hover:text-primary transition-colors",
                    activeCategoryId === null && "text-foreground font-bold"
                  )}
                >
                  {defaultAllDocsText}
                </span>

                {activeCategoryId === "__unclassified__" && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-foreground font-semibold">{defaultUncategorizedText}</span>
                  </>
                )}

                {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <span
                      onClick={() => setActiveCategoryId(crumb.id)}
                      className={cn(
                        "cursor-pointer hover:text-primary transition-colors",
                        activeCategoryId === crumb.id && "text-foreground font-bold"
                      )}
                    >
                      {crumb.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* 右上角操作区：常驻【上传文档】按钮与刷新按钮 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTriggerUpload()}
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t({ id: "UploadDocument", message: "Upload Document" })}</span>
              </button>

              <button
                onClick={loadData}
                disabled={isLoading}
                title={t({ id: "RefreshDocuments", message: "Refresh Documents" })}
                className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* 筛选与搜索工具条 */}
          <div className="p-3 md:p-4 pb-2 space-y-2.5 shrink-0">
            {/* 移动端专属：快捷分类横向滚动药丸 */}
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
              <button
                onClick={() => setActiveCategoryId(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all shrink-0",
                  activeCategoryId === null
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t({ id: "All", message: "All" })} ({documents.length})
              </button>
              <button
                onClick={() => setActiveCategoryId("__unclassified__")}
                className={cn(
                  "px-2.5 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all shrink-0",
                  activeCategoryId === "__unclassified__"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {defaultUncategorizedText} ({unclassifiedCount})
              </button>
              {categories.map((c) => {
                const count = getCategoryDocCount(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategoryId(c.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all shrink-0",
                      activeCategoryId === c.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t({ id: "SearchPlaceholder", message: "Search documents..." })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
                />
              </div>

              {/* 文件类型筛选 Tab */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                {types.map((type) => {
                  const Icon = type.icon;
                  const isActive = activeType === type.key;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setActiveType(type.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 文档卡片展示区 */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 pt-1 pb-28 md:pb-8 custom-scrollbar">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs">{t({ id: "LoadingR2Docs", message: "Loading documents from R2 cloud storage..." })}</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              /* 空状态：支持点击上传本地文档 */
              <div className="py-12 md:py-16 px-4 border-2 border-dashed border-border rounded-2xl bg-card/30 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileUp className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    {searchQuery
                      ? t({ id: "NoMatchingDocs", message: "No matching online documents found" })
                      : t({ id: "NoDocsInCategory", message: "No documents in this category" })}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {searchQuery
                      ? t({ id: "TryAnotherSearch", message: "Please try different keywords or upload a new document to the cloud." })
                      : t({ id: "UploadToCategoryHint", message: "You can upload local Word, Excel, PowerPoint, or PDF documents directly to this category." })}
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerUpload()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {t({ id: "UploadLocalDoc", message: "Upload Local Document" })}
                </button>
              </div>
            ) : (
              /* 文档卡片网格 */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-3.5">
                {filteredDocuments.map((doc) => {
                  const docCfg = getDocConfig(doc.type);
                  return (
                    <div
                      key={doc.id}
                      className="group relative rounded-xl border border-border bg-card p-3 md:p-3.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* 卡片头部 */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                                docCfg.lightBgColor
                              )}
                            >
                              <docCfg.icon className={cn("w-4.5 h-4.5", docCfg.color)} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                {doc.type}
                              </span>
                              <span className="text-[11px] text-primary/80 font-medium truncate block">
                                {getCategoryName(doc.categoryId)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {doc.shareToken && (
                              <span
                                onClick={() => handleOpenShare(doc)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-500/20"
                                title={t({ id: "PublicShareEnabled", message: "Public download sharing is enabled" })}
                              >
                                <Globe className="w-3 h-3" />
                                {t({ id: "Public", message: "Public" })}
                              </span>
                            )}

                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="bottom" align="end" className="w-40 p-1 text-xs">
                                  <button
                                    onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    {t({ id: "PreviewAndAnnotate", message: "Preview & Annotate" })}
                                  </button>
                                <button
                                  onClick={() => handleDownloadDoc(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {t({ id: "DownloadFile", message: "Download File" })}
                                </button>
                                <button
                                  onClick={() => handleOpenShare(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  {t({ id: "ShareLink", message: "Share Link" })}
                                </button>
                                <button
                                  onClick={() => {
                                    setRenameDocModal({ open: true, doc });
                                    setDocNameInput(doc.name);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  {t({ id: "Rename", message: "Rename" })}
                                </button>
                                <button
                                  onClick={() => setMoveDocModal({ open: true, doc })}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                  {t({ id: "MoveCategory", message: "Move Category" })}
                                </button>
                                <div className="my-1 border-t border-border" />
                                <button
                                  onClick={() => handleDeleteDoc(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t({ id: "DeletePermanently", message: "Delete Permanently" })}
                                </button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* 文档名称 */}
                        <h4
                          onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                          className="text-xs font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer mb-2"
                          title={doc.name}
                        >
                          {doc.name}
                        </h4>
                      </div>

                      {/* 卡片底部元信息 */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2.5 border-t border-border/50">
                        <span>{(doc.size / 1024).toFixed(1)} KB</span>
                        <span>{formatRelativeTime(doc.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 弹窗 1：创建/重命名分类 */}
      {categoryModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">
              {categoryModal.mode === "create"
                ? t({ id: "CreateCategoryTitle", message: "New Category" })
                : t({ id: "RenameCategoryTitle", message: "Rename Category" })}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder={t({ id: "CategoryNamePlaceholder", message: "Enter category name..." })}
                value={catNameInput}
                onChange={(e) => setCatNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: "create", parentId: null })}
                  className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {t({ id: "Cancel", message: "Cancel" })}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-sm"
                >
                  {t({ id: "Save", message: "Save" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 2：重命名文档 */}
      {renameDocModal.open && renameDocModal.doc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">
              {t({ id: "RenameDocTitle", message: "Rename Document" })}
            </h3>
            <form onSubmit={handleSaveDocName} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder={t({ id: "DocNamePlaceholder", message: "Enter new document name..." })}
                value={docNameInput}
                onChange={(e) => setDocNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameDocModal({ open: false, doc: null })}
                  className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {t({ id: "Cancel", message: "Cancel" })}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-sm"
                >
                  {t({ id: "Save", message: "Save" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 3：移动文档分类 */}
      {moveDocModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">
              {t({ id: "MoveDocTitle", message: "Move Document to Category" })}
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => handleMoveDoc(null)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between",
                  moveDocModal.doc?.categoryId === null
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{t({ id: "RootDirectory", message: "Uncategorized (Root)" })}</span>
                {moveDocModal.doc?.categoryId === null && <Check className="w-3.5 h-3.5" />}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleMoveDoc(c.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between",
                    moveDocModal.doc?.categoryId === c.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>{c.name}</span>
                  {moveDocModal.doc?.categoryId === c.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setMoveDocModal({ open: false, doc: null })}
                className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {t({ id: "Cancel", message: "Cancel" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 4：公开外链分享 */}
      {shareModal.open && shareModal.doc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  {t({ id: "PublicShareTitle", message: "Public Link Sharing" })}
                </h3>
              </div>
              <button
                onClick={() => setShareModal({ open: false, doc: null, shareUrl: "", copied: false })}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground truncate">
              {t({ id: "DocumentLabel", message: "Document: " })}
              <span className="text-foreground font-semibold">{shareModal.doc.name}</span>
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="pr-2">
                <p className="text-xs font-semibold text-foreground">
                  {t({ id: "DirectDownloadLink", message: "Password-free Download Link" })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t({ id: "DirectDownloadDesc", message: "Anyone with this link can download the document without a password" })}
                </p>
              </div>
              <button
                onClick={handleToggleShare}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
                  shareModal.doc.shareToken
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {shareModal.doc.shareToken
                  ? t({ id: "DisableShare", message: "Disable Sharing" })
                  : t({ id: "EnableShare", message: "Enable Sharing" })}
              </button>
            </div>

            {shareModal.doc.shareToken && shareModal.shareUrl && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t({ id: "ExclusiveShareUrl", message: "Exclusive Sharing Link" })}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareModal.shareUrl}
                    className="flex-1 px-3 py-1.5 text-xs bg-muted border border-border rounded-lg select-all text-foreground"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareModal.shareUrl);
                      setShareModal((prev) => ({ ...prev, copied: true }));
                      toast.success(t({ id: "Copied", message: "Copied" }));
                      setTimeout(() => {
                        setShareModal((prev) => ({ ...prev, copied: false }));
                      }, 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 cursor-pointer shrink-0"
                  >
                    {shareModal.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{shareModal.copied ? t({ id: "Copied", message: "Copied" }) : t({ id: "Copy", message: "Copy" })}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 弹窗 5：上传本地文档到列表 */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  {t({ id: "UploadModalTitle", message: "Upload Document to Cloud" })}
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="space-y-4">
              {/* 文件选取区 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2",
                  uploadFile && "border-primary bg-primary/5"
                )}
              >
                <FileUp className={cn("w-8 h-8", uploadFile ? "text-primary" : "text-muted-foreground")} />
                {uploadFile ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground truncate max-w-xs">{uploadFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(1)} KB ({t({ id: "ClickToReselect", message: "Click to re-select" })})
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      {t({ id: "ClickToSelectDoc", message: "Click to select a local document" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t({ id: "SupportedFormatsHint", message: "Supports .docx, .xlsx, .pptx, .pdf, .md formats" })}
                    </p>
                  </div>
                )}
              </div>

              {/* 归属分类选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {t({ id: "SaveToCategoryLabel", message: "Save to Category:" })}
                </label>
                <select
                  value={uploadTargetCatId || ""}
                  onChange={(e) => setUploadTargetCatId(e.target.value || null)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">{t({ id: "RootDirectory", message: "Uncategorized (Root)" })}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {t({ id: "Cancel", message: "Cancel" })}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? t({ id: "Uploading", message: "Uploading..." }) : t({ id: "ConfirmUpload", message: "Confirm Upload" })}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 6：通用操作确认弹窗 (替代浏览器原生 confirm) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {confirmModal.title}
              </h3>
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {t({ id: "Cancel", message: "Cancel" })}
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 cursor-pointer shadow-sm"
              >
                {confirmModal.confirmText || t({ id: "Confirm", message: "Confirm" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
