"use client";

import React, { useState } from "react";
import { Cloud, FolderPlus, Check, Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/api";

interface FirstSaveModalProps {
  open: boolean;
  isSaving: boolean;
  inputName: string;
  setInputName: (val: string) => void;
  selectedCatId: string | null;
  setSelectedCatId: (id: string | null) => void;
  categories: Category[];
  onConfirmSave: (e: React.FormEvent) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onClose: () => void;
}

/**
 * 新建文档首次保存归档弹窗
 * 支持选择分类目录与即时创建新分类
 */
export function FirstSaveModal({
  open,
  isSaving,
  inputName,
  setInputName,
  selectedCatId,
  setSelectedCatId,
  categories,
  onConfirmSave,
  onCreateCategory,
  onClose,
}: FirstSaveModalProps) {
  const t = useExtracted();
  const [newCatName, setNewCatName] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  if (!open) return null;

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      setIsCreatingCat(true);
      await onCreateCategory(name);
      setNewCatName("");
      setShowNewCatInput(false);
    } finally {
      setIsCreatingCat(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {t({ id: "SaveToR2OnlineDoc", message: "Save to R2 Cloud Storage" })}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t({
                id: "FirstSaveDesc",
                message:
                  "Choose document name and category. Future Ctrl+S will auto-save silently.",
              })}
            </p>
          </div>
        </div>

        <form onSubmit={onConfirmSave} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t({ id: "DocNameLabel", message: "Document Name" })}
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={t({
                id: "DocNamePlaceholderExample",
                message: "e.g., Annual Business Plan",
              })}
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-foreground">
                {t({ id: "SaveCategoryLabel", message: "Save Category / Folder" })}
              </label>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                {t({ id: "NewCategory", message: "New Category" })}
              </button>
            </div>

            {showNewCatInput && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted/60 border border-border">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={t({
                    id: "CategoryNamePlaceholder",
                    message: "Enter category name...",
                  })}
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
                />
                <button
                  type="button"
                  disabled={isCreatingCat}
                  onClick={handleCreateCategory}
                  className="px-2.5 py-1 bg-primary text-primary-foreground text-xs rounded-md font-medium cursor-pointer disabled:opacity-50"
                >
                  {isCreatingCat ? t({ id: "Saving", message: "Saving..." }) : t({ id: "Save", message: "Save" })}
                </button>
              </div>
            )}

            {/* 递归树形选择目录 */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-background">
              <button
                type="button"
                onClick={() => setSelectedCatId(null)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                  selectedCatId === null
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>📁 {t({ id: "RootDirectory", message: "Uncategorized (Root)" })}</span>
                {selectedCatId === null && <Check className="w-3.5 h-3.5" />}
              </button>

              {categories.map((c) => {
                let level = 0;
                let cur: Category | undefined = c;
                while (cur?.parentId) {
                  level++;
                  cur = categories.find((p) => p.id === cur?.parentId);
                }
                const isSelected = selectedCatId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCatId(c.id)}
                    style={{ paddingLeft: `${12 + level * 16}px` }}
                    className={cn(
                      "w-full text-left pr-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer",
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
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t({ id: "Cancel", message: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-xl shadow-sm hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span>{t({ id: "ConfirmSaveToCloud", message: "Confirm Save to Cloud" })}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
