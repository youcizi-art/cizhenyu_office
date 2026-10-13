"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  MoreVertical,
  Copy,
  Check,
  Globe,
  Plus,
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
  DocumentMeta,
  Category,
  DocumentType,
} from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DocumentsView() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeType, setActiveType] = useState<string>("All");
  // 当前浏览的分类 ID，null 表示查看全部，"__unclassified__" 表示未分类
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

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

  const [shareModal, setShareModal] = useState<{
    open: boolean;
    doc: DocumentMeta | null;
    shareUrl: string;
    copied: boolean;
  }>({ open: false, doc: null, shareUrl: "", copied: false });

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

  // 计算当前分类的面包屑路径
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

  // 计算当前层级可见的直接子分类
  const currentChildCategories = useMemo(() => {
    if (activeCategoryId === "__unclassified__") return [];
    if (!activeCategoryId) {
      // 根层级分类 (parentId === null)
      return categories.filter((c) => !c.parentId);
    }
    return categories.filter((c) => c.parentId === activeCategoryId);
  }, [activeCategoryId, categories]);

  // 递归收集某个分类的所有子分类 ID (用于分类文档过滤)
  const getSubCategoryIds = (catId: string): string[] => {
    const ids = [catId];
    const children = categories.filter((c) => c.parentId === catId);
    for (const child of children) {
      ids.push(...getSubCategoryIds(child.id));
    }
    return ids;
  };

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

  // 创建或重命名分类操作
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catNameInput.trim();
    if (!name) return;

    try {
      if (categoryModal.mode === "create") {
        const newCat = await createCategory(name, categoryModal.parentId);
        setCategories((prev) => [...prev, newCat]);
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
      toast.success("已移动文档");
      setMoveDocModal({ open: false, doc: null });
    } catch (err) {
      toast.error("移动分类失败: " + String(err));
    }
  };

  // 删除文档
  const handleDeleteDoc = async (doc: DocumentMeta) => {
    if (!confirm(`确定要彻底删除文档「${doc.name}」吗？此操作不可恢复。`)) {
      return;
    }
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("文档已从 R2 彻底删除");
    } catch (err) {
      toast.error("删除失败: " + String(err));
    }
  };

  // 下载文档
  const handleDownloadDoc = (doc: DocumentMeta) => {
    const a = document.createElement("a");
    a.href = `/api/documents/${encodeURIComponent(doc.id)}/content`;
    a.download = doc.name;
    a.click();
  };

  // 开启分享
  const handleOpenShare = async (doc: DocumentMeta) => {
    try {
      let token = doc.shareToken;
      if (!token) {
        token = await enableShare(doc.id);
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, shareToken: token } : d))
        );
      }
      const fullUrl = `${window.location.origin}/share?token=${token}`;
      setShareModal({
        open: true,
        doc,
        shareUrl: fullUrl,
        copied: false,
      });
    } catch (err) {
      toast.error("开启分享失败: " + String(err));
    }
  };

  // 关闭分享
  const handleCloseShare = async (docId: string) => {
    try {
      await disableShare(docId);
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id === docId) {
            const copy = { ...d };
            delete copy.shareToken;
            return copy;
          }
          return d;
        })
      );
      setShareModal({ open: false, doc: null, shareUrl: "", copied: false });
      toast.success("已关闭该文档的公开分享");
    } catch (err) {
      toast.error("关闭分享失败: " + String(err));
    }
  };

  // 复制分享链接
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareModal.shareUrl);
    setShareModal((prev) => ({ ...prev, copied: true }));
    toast.success("分享链接已复制到剪贴板");
    setTimeout(() => {
      setShareModal((prev) => ({ ...prev, copied: false }));
    }, 2000);
  };

  const getCategoryName = (catId: string | null) => {
    if (!catId) return "未分类";
    const found = categories.find((c) => c.id === catId);
    return found ? found.name : "未分类";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 头部区域 */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              在线云文档库
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            连接 Cloudflare R2，支持多级目录归类、在线实时编辑与免密安全外链分享
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategoryModal({
                open: true,
                mode: "create",
                parentId: activeCategoryId === "__unclassified__" ? null : activeCategoryId,
              });
              setCatNameInput("");
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            新建分类
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="刷新文档"
          >
            <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </section>

      {/* 搜索框与类型过滤器 (继承原模板 UI 规范) */}
      <section className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索在线文档名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
          />
        </div>

        {/* 文件类型筛选 Tab */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {types.map((type) => {
            const Icon = type.icon;
            const isActive = activeType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setActiveType(type.key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer",
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
      </section>

      {/* 多级分类导航栏与面包屑 */}
      <section className="p-3 rounded-xl border border-border bg-card/60 space-y-3">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={cn(
              "hover:text-primary transition-colors cursor-pointer font-medium",
              activeCategoryId === null && "text-primary font-bold"
            )}
          >
            全部文档
          </button>

          {activeCategoryId === "__unclassified__" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-foreground font-semibold">未分类</span>
            </>
          )}

          {breadcrumbs.map((cat, idx) => (
            <React.Fragment key={cat.id}>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
              <button
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "hover:text-primary transition-colors cursor-pointer",
                  idx === breadcrumbs.length - 1
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {cat.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* 当前目录下的分类标签胶囊 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 未分类入口 */}
          <button
            onClick={() => setActiveCategoryId("__unclassified__")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border",
              activeCategoryId === "__unclassified__"
                ? "bg-primary/10 border-primary text-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            未分类
          </button>

          {/* 子分类列表 */}
          {currentChildCategories.map((cat) => (
            <div
              key={cat.id}
              className="group/tag inline-flex items-center rounded-full border border-border bg-background transition-all hover:border-primary/40"
            >
              <button
                onClick={() => setActiveCategoryId(cat.id)}
                className="px-3 py-1 text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {cat.name}
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="pr-2 pl-0.5 text-muted-foreground hover:text-foreground cursor-pointer opacity-40 group-hover/tag:opacity-100 transition-opacity">
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-28 p-1">
                  <button
                    onClick={() => {
                      setCategoryModal({
                        open: true,
                        mode: "rename",
                        parentId: cat.parentId,
                        targetCat: cat,
                      });
                      setCatNameInput(cat.name);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    重命名
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          ))}

          {/* 快速在当前层级创建子分类按钮 */}
          <button
            onClick={() => {
              setCategoryModal({
                open: true,
                mode: "create",
                parentId: activeCategoryId === "__unclassified__" ? null : activeCategoryId,
              });
              setCatNameInput("");
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            新建子分类
          </button>
        </div>
      </section>

      {/* 在线文档卡片流 */}
      <section>
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-xs">加载 R2 在线文档中...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-20 border border-dashed border-border rounded-2xl bg-card/40 text-center">
            <Cloud className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
            <h3 className="text-sm font-semibold text-foreground">暂无匹配的在线文档</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "没有找到符合搜索条件的文档，请尝试更换关键词。"
                : "当前分类下暂无文档，可以新建文档或将现有文档归类到这里。"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const docCfg = getDocConfig(doc.type);
              return (
                <div
                  key={doc.id}
                  className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* 卡片顶部：图标、类型、分类、操作菜单 */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                            docCfg.lightBgColor
                          )}
                        >
                          <docCfg.icon className={cn("w-5 h-5", docCfg.color)} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            {doc.type}
                          </span>
                          <span className="text-[11px] text-primary/80 font-medium">
                            {getCategoryName(doc.categoryId)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
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
                          <PopoverContent side="bottom" align="end" className="w-36 p-1">
                            <button
                              onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              在线编辑
                            </button>
                            <button
                              onClick={() => handleDownloadDoc(doc)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              下载文件
                            </button>
                            <button
                              onClick={() => handleOpenShare(doc)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              分享链接
                            </button>
                            <button
                              onClick={() => {
                                setRenameDocModal({ open: true, doc });
                                setDocNameInput(doc.name);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              重命名
                            </button>
                            <button
                              onClick={() => setMoveDocModal({ open: true, doc })}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded cursor-pointer"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                              移动分类
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              彻底删除
                            </button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* 文档名称 */}
                    <h3
                      onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                      className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                      title={doc.name}
                    >
                      {doc.name}
                    </h3>
                  </div>

                  {/* 卡片底部：文件大小、更新时间、快速编辑按钮 */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{formatRelativeTime(doc.updatedAt)}</span>
                    </div>

                    <button
                      onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                      className="text-primary hover:underline font-medium cursor-pointer"
                    >
                      打开
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 创建 / 重命名分类弹窗 */}
      {categoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-foreground mb-1">
              {categoryModal.mode === "create" ? "创建多级分类" : "重命名分类"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {categoryModal.mode === "create"
                ? categoryModal.parentId
                  ? `在「${getCategoryName(categoryModal.parentId)}」下创建子分类`
                  : "在根目录创建一级分类"
                : "请输入新的分类名称"}
            </p>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <input
                type="text"
                value={catNameInput}
                onChange={(e) => setCatNameInput(e.target.value)}
                placeholder="例如：2026工作总结 / 技术规范"
                autoFocus
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: "create", parentId: null })}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重命名文档弹窗 */}
      {renameDocModal.open && renameDocModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-foreground mb-1">重命名文档</h2>
            <p className="text-xs text-muted-foreground mb-4">
              修改云端文档在列表中的显示名称
            </p>
            <form onSubmit={handleSaveDocName} className="space-y-4">
              <input
                type="text"
                value={docNameInput}
                onChange={(e) => setDocNameInput(e.target.value)}
                autoFocus
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameDocModal({ open: false, doc: null })}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 移动文档分类弹窗 (递归树形选择) */}
      {moveDocModal.open && moveDocModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-foreground mb-1">移动文档分类</h2>
            <p className="text-xs text-muted-foreground mb-4">
              选择「{moveDocModal.doc.name}」的目标分类
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-border/60 rounded-lg p-2 mb-4">
              <button
                onClick={() => handleMoveDoc(null)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-md transition-colors cursor-pointer flex items-center justify-between",
                  moveDocModal.doc.categoryId === null
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>未分类 (根目录)</span>
                {moveDocModal.doc.categoryId === null && <Check className="w-3.5 h-3.5" />}
              </button>
              {categories.map((c) => {
                // 计算层级缩进
                let level = 0;
                let cur: Category | undefined = c;
                while (cur?.parentId) {
                  level++;
                  cur = categories.find((parent) => parent.id === cur?.parentId);
                }
                const isSelected = moveDocModal.doc?.categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleMoveDoc(c.id)}
                    style={{ paddingLeft: `${12 + level * 16}px` }}
                    className={cn(
                      "w-full text-left pr-3 py-2 text-xs rounded-md transition-colors cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>📁 {c.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMoveDocModal({ open: false, doc: null })}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享管理弹窗 */}
      {shareModal.open && shareModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-foreground">公开分享链接</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              任何拥有此链接的人均可<strong>免密下载</strong>该文档（不支持在线查看与编辑，确保私密与性能）。
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareModal.shareUrl}
                className="flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden"
              />
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {shareModal.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {shareModal.copied ? "已复制" : "复制"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={() => handleCloseShare(shareModal.doc!.id)}
                className="text-xs text-destructive hover:underline cursor-pointer"
              >
                关闭公开分享
              </button>
              <button
                onClick={() => setShareModal({ open: false, doc: null, shareUrl: "", copied: false })}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
