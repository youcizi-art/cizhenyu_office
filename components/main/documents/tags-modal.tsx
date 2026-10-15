"use client";

import React, { useState, useEffect } from "react";
import { Tag, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { DocumentMeta } from "@/lib/api";

interface TagsModalProps {
  open: boolean;
  doc: DocumentMeta | null;
  onClose: () => void;
  onSaveTags: (tags: string[]) => void | Promise<void>;
}

/**
 * 文档标签管理与编辑弹窗
 */
export function EditTagsModal({
  open,
  doc,
  onClose,
  onSaveTags,
}: TagsModalProps) {
  const t = useExtracted();
  const [tags, setTags] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState<string>("");

  useEffect(() => {
    if (doc) {
      setTags(doc.tags || []);
      setInputVal("");
    }
  }, [doc]);

  if (!open || !doc) return null;

  const handleAddTag = () => {
    const trimmed = inputVal.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
            <Tag className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {t({ id: "EditTagsTitle", message: "Manage Document Tags" })}
          </h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {t({ id: "EditTagsDesc", message: "Add keywords or tags to quickly filter documents." })}
        </p>

        {/* 现有标签 */}
        <div className="flex flex-wrap gap-1.5 min-h-12 p-2.5 rounded-xl border border-border bg-muted/20 mb-3">
          {tags.length === 0 ? (
            <span className="text-xs text-muted-foreground self-center">
              {t({ id: "NoTagsYet", message: "No tags added yet" })}
            </span>
          ) : (
            tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-card border border-border font-medium text-foreground shadow-2xs"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* 添加新标签输入框 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t({ id: "TagPlaceholder", message: "Enter tag and press Enter..." })}
            className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {t({ id: "AddTag", message: "Add" })}
          </button>
        </div>

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
            onClick={() => onSaveTags(tags)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {t({ id: "Save", message: "Save" })}
          </button>
        </div>
      </div>
    </div>
  );
}
