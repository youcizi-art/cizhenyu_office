"use client";

import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Share2,
  Copy,
  Check,
  Globe,
  Upload,
  FileUp,
  X,
  Tag,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Category, DocumentMeta } from "@/lib/api";

// 随机生成 4 位字母数字提取密钥
function generatePasscode(): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 分类创建与重命名弹窗
 */
export function CategoryModal({
  open,
  mode,
  catName,
  onChangeCatName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "rename";
  catName: string;
  onChangeCatName: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useExtracted();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FolderPlus className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {mode === "create"
              ? t({ id: "CreateCategoryTitle", message: "New Category" })
              : t({ id: "RenameCategoryTitle", message: "Rename Category" })}
          </h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={catName}
            onChange={(e) => onChangeCatName(e.target.value)}
            placeholder={t({ id: "CategoryNamePlaceholder", message: "Enter category name..." })}
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={!catName.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t({ id: "Save", message: "Save" })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 文档重命名弹窗
 */
export function RenameDocModal({
  open,
  docName,
  onChangeDocName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  docName: string;
  onChangeDocName: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useExtracted();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t({ id: "RenameDocTitle", message: "Rename Document" })}
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={docName}
            onChange={(e) => onChangeDocName(e.target.value)}
            placeholder={t({ id: "DocNamePlaceholder", message: "Enter document name..." })}
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={!docName.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t({ id: "Save", message: "Save" })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 移动文档分类树形节点结构
 */
interface MoveCategoryTreeNode {
  category: Category;
  children: MoveCategoryTreeNode[];
}

/**
 * 移动文档分类弹窗 (树形层级展示 + 选中状态 + 明确确认按钮)
 */
export function MoveDocModal({
  open,
  categories,
  currentCatId,
  onClose,
  onSelectCategory,
}: {
  open: boolean;
  categories: Category[];
  currentCatId: string | null;
  onClose: () => void;
  onSelectCategory: (catId: string | null) => void;
}) {
  const t = useExtracted();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setSelectedCatId(currentCatId);
      // 默认展开所有含有选中分类的路径或根级节点
      const initialExpanded: Record<string, boolean> = {};
      categories.forEach((c) => {
        initialExpanded[c.id] = true;
      });
      setExpandedCats(initialExpanded);
    }
  }, [open, currentCatId, categories]);

  if (!open) return null;

  // 构建分类树并排序
  const categoryTree: MoveCategoryTreeNode[] = (() => {
    const buildNodes = (parentId: string | null): MoveCategoryTreeNode[] => {
      return categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => {
          if (typeof a.order === "number" && typeof b.order === "number") {
            return a.order - b.order;
          }
          if (typeof a.order === "number") return -1;
          if (typeof b.order === "number") return 1;
          return a.createdAt - b.createdAt;
        })
        .map((cat) => ({
          category: cat,
          children: buildNodes(cat.id),
        }));
    };
    return buildNodes(null);
  })();

  const handleToggleExpand = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const renderTreeItem = (node: MoveCategoryTreeNode, depth = 0) => {
    const { category, children } = node;
    const isExpanded = !!expandedCats[category.id];
    const isSelected = selectedCatId === category.id;
    const isCurrent = currentCatId === category.id;
    const hasChildren = children.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          onClick={() => setSelectedCatId(category.id)}
          className={cn(
            "group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors",
            isSelected
              ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
              : "hover:bg-muted/70 text-foreground"
          )}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => handleToggleExpand(category.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">{category.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isCurrent && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {t({ id: "CurrentLocation", message: "Current" })}
              </span>
            )}
            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleConfirm = () => {
    onSelectCategory(selectedCatId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t({ id: "MoveDocTitle", message: "Move Document to Category" })}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t({ id: "SelectTargetCategoryHint", message: "Select target category and click Confirm to move." })}
        </p>

        <div className="max-h-64 overflow-y-auto space-y-0.5 my-3 pr-1 border border-border/60 rounded-xl p-1 bg-background/50">
          {/* 未分类 (根目录) */}
          <div
            onClick={() => setSelectedCatId(null)}
            className={cn(
              "group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors",
              selectedCatId === null
                ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                : "hover:bg-muted/70 text-foreground"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{t({ id: "UnclassifiedCategory", message: "Unclassified (Root)" })}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {currentCatId === null && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                  {t({ id: "CurrentLocation", message: "Current" })}
                </span>
              )}
              {selectedCatId === null && <Check className="w-3.5 h-3.5 text-primary" />}
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {categoryTree.map((node) => renderTreeItem(node))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            {t({ id: "Cancel", message: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
          >
            {t({ id: "ConfirmMove", message: "Confirm Move" })}
          </button>
        </div>
      </div>
    </div>
  );
}

export { EditTagsModal } from "./tags-modal";
export { ShareModal } from "./share-modal";


/**
 * 本地文档上传弹窗
 */
export function UploadModal({
  open,
  categories,
  uploadFile,
  targetCatId,
  isUploading,
  onSelectFile,
  onChangeTargetCat,
  onClose,
  onSubmit,
}: {
  open: boolean;
  categories: Category[];
  uploadFile: File | null;
  targetCatId: string | null;
  isUploading: boolean;
  onSelectFile: (file: File | null) => void;
  onChangeTargetCat: (catId: string | null) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useExtracted();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {t({ id: "UploadModalTitle", message: "Upload File to Cloud" })}
          </h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
              uploadFile
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            {uploadFile ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground truncate">{uploadFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadFile.size / 1024).toFixed(1)} KB · {t({ id: "ClickToReselect", message: "Click to reselect" })}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {t({ id: "ClickToSelectFile", message: "Click to select a file" })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t({
                    id: "AllFormatsSupportedHint",
                    message: "All file types supported (Office, PDF, Markdown, Images, Videos, Audio, etc.)",
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t({ id: "SaveToCategoryLabel", message: "Save to Category:" })}
            </label>
            <select
              value={targetCatId || ""}
              onChange={(e) => onChangeTargetCat(e.target.value || null)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-hidden"
            >
              <option value="">{t({ id: "UnclassifiedCategory", message: "Unclassified (Root)" })}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={!uploadFile || isUploading}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isUploading ? t({ id: "Uploading", message: "Uploading..." }) : t({ id: "ConfirmUpload", message: "Confirm Upload" })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 通用操作确认弹窗
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmText,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = useExtracted();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            {t({ id: "Cancel", message: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
          >
            {confirmText || t({ id: "Confirm", message: "Confirm" })}
          </button>
        </div>
      </div>
    </div>
  );
}
