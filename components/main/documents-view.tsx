"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
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
  DocumentMeta,
  Category,
  DocumentType,
} from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TreeNode {
  category: Category;
  children: TreeNode[];
}

export function DocumentsView() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 左侧栏折叠状态
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchDocumentsAndCategories();
      setDocuments(res.documents || []);
      setCategories(res.categories || []);
    } catch (err) {
      toast.error("加载文档库失败: " + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 类型选项定义
  const types = [
    { name: "全部", icon: Files, key: "All" },
    { name: "Word", icon: FileText, key: "Word" },
    { name: "Excel", icon: Table, key: "Excel" },
    { name: "PowerPoint", icon: Presentation, key: "PowerPoint" },
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
        toast.success("分类创建成功");
      } else if (categoryModal.mode === "rename" && categoryModal.targetCat) {
        const updated = await updateCategory(categoryModal.targetCat.id, name);
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success("分类已重命名");
      }
      setCategoryModal({ open: false, mode: "create", parentId: null });
      setCatNameInput("");
    } catch (err) {
      toast.error("操作失败: " + String(err));
    }
  };

  // 删除分类
  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`确定要删除分类「${cat.name}」吗？其子分类将被一同删除，所属文档将变为未分类。`)) {
      return;
    }
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
      toast.success("分类已删除");
    } catch (err) {
      toast.error("删除失败: " + String(err));
    }
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
      toast.success("文档重命名成功");
      setRenameDocModal({ open: false, doc: null });
    } catch (err) {
      toast.error("重命名失败: " + String(err));
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
      toast.success("文档移动成功");
      setMoveDocModal({ open: false, doc: null });
    } catch (err) {
      toast.error("移动分类失败: " + String(err));
    }
  };

  // 删除文档
  const handleDeleteDoc = async (doc: DocumentMeta) => {
    if (!confirm(`确定要彻底删除文档「${doc.name}」吗？此操作不可逆。`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("文档已从云端永久删除");
    } catch (err) {
      toast.error("删除文档失败: " + String(err));
    }
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
        toast.success("已关闭外链分享");
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
        toast.success("已开启公开免密外链分享");
      }
    } catch (err) {
      toast.error("修改分享状态失败: " + String(err));
    }
  };

  // 触发本地文件上传弹窗
  const handleTriggerUpload = (defaultCatId?: string | null) => {
    const catId = defaultCatId !== undefined
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
    if (!uploadFile) {
      toast.error("请先选择要上传的文件");
      return;
    }

    const ext = uploadFile.name.split(".").pop()?.toLowerCase();
    let type: DocumentType = "docx";
    if (ext === "xlsx" || ext === "xls" || ext === "csv") type = "xlsx";
    else if (ext === "pptx" || ext === "ppt") type = "pptx";
    else if (ext === "pdf") type = "pdf";
    else if (ext === "docx" || ext === "doc") type = "docx";
    else {
      toast.error("暂不支持的文件格式，请上传 docx、xlsx、pptx 或 pdf");
      return;
    }

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
      toast.success(`文档「${newDoc.name}」上传成功！`);
    } catch (err) {
      toast.error("上传文档失败: " + String(err));
    } finally {
      setIsUploading(false);
    }
  };

  // 递归渲染左侧分类树节点
  const renderTreeNode = (node: TreeNode, level = 0) => {
    const { category, children } = node;
    const isExpanded = expandedCats[category.id] ?? true;
    const isSelected = activeCategoryId === category.id;
    const count = getCategoryDocCount(category.id);
    const hasChildren = children.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          onClick={() => setActiveCategoryId(category.id)}
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
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              isSelected ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground/80 bg-muted"
            )}>
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
                  新建子分类
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryModal({ open: true, mode: "rename", parentId: category.parentId, targetCat: category });
                    setCatNameInput(category.name);
                  }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted rounded text-left cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  重命名
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
                  删除分类
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return "未分类";
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : "未分类";
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* 隐藏的真实文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx,.doc,.xlsx,.xls,.pptx,.ppt,.pdf,.csv"
        className="hidden"
      />

      {/* 主界面：左右分栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：树形分类侧边栏 */}
        <aside
          className={cn(
            "border-r border-border bg-card/40 flex flex-col shrink-0 transition-all duration-200 z-10",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
          )}
        >
          {/* 侧边栏顶部 */}
          <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                文档分类目录
              </span>
            </div>
            <button
              onClick={() => {
                setCategoryModal({
                  open: true,
                  mode: "create",
                  parentId: null,
                });
                setCatNameInput("");
              }}
              title="新建顶级分类"
              className="p-1 hover:bg-primary/10 text-primary rounded-md transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* 树形菜单项列表 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* 全部文档 */}
            <div
              onClick={() => setActiveCategoryId(null)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
                activeCategoryId === null
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4" />
                <span>全部文档</span>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeCategoryId === null ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"
              )}>
                {documents.length}
              </span>
            </div>

            {/* 未分类文档 */}
            <div
              onClick={() => setActiveCategoryId("__unclassified__")}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all",
                activeCategoryId === "__unclassified__"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-400" />
                <span>未分类</span>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                activeCategoryId === "__unclassified__" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"
              )}>
                {unclassifiedCount}
              </span>
            </div>

            <div className="my-2 border-t border-border/60" />

            {/* 多级分类树节点 */}
            <div className="space-y-0.5">
              {categoryTree.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground/60">
                  暂无分类，点击上方新建
                </div>
              ) : (
                categoryTree.map((node) => renderTreeNode(node, 0))
              )}
            </div>
          </div>
        </aside>

        {/* 右侧：主文档展示区域 */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* 右侧顶部栏 */}
          <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-card/20">
            <div className="flex items-center gap-3 min-w-0">
              {/* 展开/收起左侧栏按钮 */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "收起分类栏" : "展开分类栏"}
                className="p-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-primary" />
                )}
              </button>

              {/* 面包屑导航与当前分类指示 */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span
                  onClick={() => setActiveCategoryId(null)}
                  className={cn(
                    "cursor-pointer hover:text-primary transition-colors",
                    activeCategoryId === null && "text-foreground font-bold"
                  )}
                >
                  全部文档
                </span>

                {activeCategoryId === "__unclassified__" && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-foreground font-semibold">未分类</span>
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

            {/* 右上角操作区：常驻【上传文档】按钮 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTriggerUpload()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>上传文档</span>
              </button>

              <button
                onClick={loadData}
                disabled={isLoading}
                title="刷新文档"
                className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* 筛选与搜索工具条 */}
          <div className="p-4 pb-2 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索文档名称..."
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
                          ? "bg-primary text-primary-foreground shadow-xs"
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
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs">正在连接 R2 加载云端文档...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              /* 空状态：支持点击上传本地文档 */
              <div className="py-16 px-4 border-2 border-dashed border-border rounded-2xl bg-card/30 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileUp className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    {searchQuery ? "未找到匹配的在线文档" : "当前分类下暂无文档"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {searchQuery
                      ? "请尝试更换搜索词，或上传新的文档至云端。"
                      : "您可以直接将本地 Word、Excel、PPT 或 PDF 上传至当前分类。"}
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerUpload()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  上传本地文档到列表
                </button>
              </div>
            ) : (
              /* 文档卡片网格 */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredDocuments.map((doc) => {
                  const docCfg = getDocConfig(doc.type);
                  return (
                    <div
                      key={doc.id}
                      className="group relative rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* 卡片头部 */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
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
                                title="已开启公开下载分享"
                              >
                                <Globe className="w-3 h-3" />
                                公开
                              </span>
                            )}

                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="bottom" align="end" className="w-36 p-1 text-xs">
                                <button
                                  onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  在线编辑
                                </button>
                                <button
                                  onClick={() => handleDownloadDoc(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  下载文件
                                </button>
                                <button
                                  onClick={() => handleOpenShare(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  分享链接
                                </button>
                                <button
                                  onClick={() => {
                                    setRenameDocModal({ open: true, doc });
                                    setDocNameInput(doc.name);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  重命名
                                </button>
                                <button
                                  onClick={() => setMoveDocModal({ open: true, doc })}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-muted rounded cursor-pointer"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                  移动分类
                                </button>
                                <div className="my-1 border-t border-border" />
                                <button
                                  onClick={() => handleDeleteDoc(doc)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  彻底删除
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">
              {categoryModal.mode === "create" ? "新建文档分类" : "重命名分类"}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="请输入分类名称..."
                value={catNameInput}
                onChange={(e) => setCatNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: "create", parentId: null })}
                  className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!catNameInput.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 2：重命名文档 */}
      {renameDocModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">重命名文档</h3>
            <form onSubmit={handleSaveDocName} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={docNameInput}
                onChange={(e) => setDocNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameDocModal({ open: false, doc: null })}
                  className="px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!docNameInput.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 弹窗 3：移动文档分类 */}
      {moveDocModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground">移动文档到分类</h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              <button
                onClick={() => handleMoveDoc(null)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between",
                  moveDocModal.doc?.categoryId === null
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>未分类 (根目录)</span>
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
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 4：公开外链分享 */}
      {shareModal.open && shareModal.doc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">公开外链分享</h3>
              </div>
              <button
                onClick={() => setShareModal({ open: false, doc: null, shareUrl: "", copied: false })}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              文档：<span className="text-foreground font-semibold">{shareModal.doc.name}</span>
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div>
                <p className="text-xs font-semibold text-foreground">免密只读下载链接</p>
                <p className="text-[11px] text-muted-foreground">拥有此链接的访客无需密码即可直接下载该文档</p>
              </div>
              <button
                onClick={handleToggleShare}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  shareModal.doc.shareToken
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {shareModal.doc.shareToken ? "关闭外链" : "开启外链"}
              </button>
            </div>

            {shareModal.doc.shareToken && shareModal.shareUrl && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">专属分享链接</label>
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
                      toast.success("链接已成功复制到剪贴板");
                      setTimeout(() => {
                        setShareModal((prev) => ({ ...prev, copied: false }));
                      }, 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 cursor-pointer"
                  >
                    {shareModal.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{shareModal.copied ? "已复制" : "复制"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 弹窗 5：上传本地文档到列表 */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">上传本地文档到云端</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
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
                    <p className="text-[11px] text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB (点击可重新选择)</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">点击选择本地文档</p>
                    <p className="text-[11px] text-muted-foreground">支持 .docx、.xlsx、.pptx、.pdf 格式</p>
                  </div>
                )}
              </div>

              {/* 归属分类选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">保存到分类：</label>
                <select
                  value={uploadTargetCatId || ""}
                  onChange={(e) => setUploadTargetCatId(e.target.value || null)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">未分类 (根目录)</option>
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
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? "正在上传..." : "确认上传"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
