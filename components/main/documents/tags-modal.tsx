"use client";

import React, { useState, useEffect } from "react";
import { Tag, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { DocumentMeta } from "@/lib/api";

interface TagsModalProps {
  open: boolean;
  doc: DocumentMeta | null;
  availableTags?: string[];
  onClose: () => void;
  onSaveTags: (tags: string[]) => void | Promise<void>;
}

/**
 * 文档标签管理与编辑弹窗 (支持系统已有标签快捷下拉提示与自主添加新标签)
 */
export function EditTagsModal({
  open,
  doc,
  availableTags = [],
  onClose,
  onSaveTags,
}: TagsModalProps) {
  const t = useExtracted();
  const [tags, setTags] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState<string>("");
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    if (doc) {
      setTags(doc.tags || []);
      setInputVal("");
      setHighlightedIndex(-1);
    }
  }, [doc]);

  if (!open || !doc) return null;

  // 过滤尚未添加的系统已有候选标签
  const trimmedInput = inputVal.trim().replace(/^#/, "").toLowerCase();
  const suggestions = availableTags
    .filter((candidate) => !tags.includes(candidate))
    .filter((candidate) => !trimmedInput || candidate.toLowerCase().includes(trimmedInput));

  const handleSelectSuggestion = (tagToAdd: string) => {
    if (!tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
    }
    setInputVal("");
    setHighlightedIndex(-1);
  };

  const handleAddTag = () => {
    const trimmed = inputVal.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInputVal("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0 && isInputFocused) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
        return;
      }
    }

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

        {/* 添加新标签输入框与下拉建议 */}
        <div className="relative mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                // 延迟关闭以便点击建议项生效
                setTimeout(() => setIsInputFocused(false), 200);
              }}
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

          {/* 下拉建议列表 */}
          {isInputFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-14 top-full mt-1 max-h-36 overflow-y-auto bg-card border border-border rounded-xl shadow-lg z-20 p-1 space-y-0.5 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
                {t({ id: "ExistingTagsSuggestion", message: "Existing tags:" })}
              </div>
              {suggestions.map((suggestion, idx) => (
                <div
                  key={suggestion}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
                    highlightedIndex === idx
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Tag className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="truncate">#{suggestion}</span>
                </div>
              ))}
            </div>
          )}
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
