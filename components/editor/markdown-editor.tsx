"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import { useResolvedLanguage } from "@/store";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { htmlToMarkdown } from "@/utils/editor/markdown-paste";

interface MarkdownEditorProps {
  initialContent: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
}

/**
 * 将系统语言映射到 Vditor 原生支持的语言代码
 * 遵循以英语（en_US）为第一公民和默认兜底的原则
 */
function resolveVditorLang(locale: string): "en_US" | "zh_CN" | "zh_TW" | "ja_JP" | "ko_KR" | "de_DE" | "fr_FR" | "es_ES" | "ru_RU" {
  if (locale.startsWith("zh")) {
    if (locale.includes("TW") || locale.includes("HK") || locale.includes("Hant")) {
      return "zh_TW";
    }
    return "zh_CN";
  }
  if (locale.startsWith("ja")) return "ja_JP";
  if (locale.startsWith("ko")) return "ko_KR";
  if (locale.startsWith("de")) return "de_DE";
  if (locale.startsWith("fr")) return "fr_FR";
  if (locale.startsWith("es")) return "es_ES";
  if (locale.startsWith("ru")) return "ru_RU";
  return "en_US";
}

export function MarkdownEditor({
  initialContent,
  onChange,
  onSave,
}: MarkdownEditorProps) {
  const t = useExtracted();
  const currentLang = useResolvedLanguage();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const isVditorReadyRef = useRef<boolean>(false);
  const lastSavedContentRef = useRef<string>(initialContent || "");

  // 记录最新的回调函数引用，避免 Vditor 重新挂载
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // 初始化与多语言切换
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const isDarkMode = document.documentElement.classList.contains("dark");
    const vditorLang = resolveVditorLang(currentLang);

    // 销毁上一次实例
    if (vditorRef.current) {
      try {
        vditorRef.current.destroy();
      } catch {}
      vditorRef.current = null;
      isVditorReadyRef.current = false;
    }

    const vditorInstance = new Vditor(editorContainerRef.current, {
      cdn: "/vditor",
      value: lastSavedContentRef.current || initialContent || "",
      mode: "wysiwyg", // 默认直接进入所见即所得双向编辑模式
      height: "100%",
      theme: isDarkMode ? "dark" : "classic",
      lang: vditorLang,
      placeholder: t({
        id: "MarkdownPlaceholder",
        message:
          "Write Markdown here... Press Ctrl+S to save, supports standard GFM syntax.",
      }),
      toolbarConfig: {
        pin: true,
      },
      toolbar: [
        "emoji",
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "|",
        "list",
        "ordered-list",
        "check",
        "outdent",
        "indent",
        "|",
        "quote",
        "line",
        "code",
        "inline-code",
        "insert-before",
        "insert-after",
        "|",
        "upload",
        "table",
        "|",
        "undo",
        "redo",
        "|",
        "edit-mode", // 允许用户一键在 wysiwyg (所见即所得)、ir (即时渲染)、sv (分屏双向联动) 间无缝切换
        "both",      // 双栏联动分屏开关
        "outline",   // 文档大纲目录
        "fullscreen",
        "preview",
      ],
      preview: {
        theme: {
          current: isDarkMode ? "dark" : "light",
        },
        hljs: {
          style: isDarkMode ? "vs2015" : "github",
          lineNumber: true,
        },
        markdown: {
          toc: true,
          mark: true,
          footnotes: true,
          autoSpace: true,
        },
        math: {
          engine: "KaTeX",
        },
      },
      cache: {
        enable: false, // 禁用本地 localStorage 缓存，由统一的 R2 云端接管
      },
      after: () => {
        vditorRef.current = vditorInstance;
        isVditorReadyRef.current = true;
      },
      input: (value: string) => {
        lastSavedContentRef.current = value;
        onChangeRef.current?.(value);
      },
      ctrlEnter: () => {
        onSaveRef.current?.();
      },
    });

    return () => {
      try {
        vditorInstance.destroy();
      } catch {}
      vditorRef.current = null;
      isVditorReadyRef.current = false;
    };
  }, [currentLang]);

  // 同步外部 initialContent 变更
  useEffect(() => {
    if (
      isVditorReadyRef.current &&
      vditorRef.current &&
      initialContent !== undefined &&
      initialContent !== lastSavedContentRef.current
    ) {
      lastSavedContentRef.current = initialContent;
      vditorRef.current.setValue(initialContent);
    }
  }, [initialContent]);

  // 全局快捷键保存 (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 粘贴增强拦截（保留 ChatGPT/Gemini 生成的复杂表单与富文本）
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData || !vditorRef.current || !isVditorReadyRef.current) return;

      // 1. 剪贴板中直接包含二进制截图
      const imageItem = Array.from(clipboardData.items).find((item) =>
        item.type.startsWith("image/")
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const base64Url = reader.result as string;
            vditorRef.current?.insertValue(`\n![image](${base64Url})\n`);
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // 2. 剪贴板中包含富文本/表单 HTML
      const rawHtml = clipboardData.getData("text/html");
      if (rawHtml && /<(form|input|select|button|table|h[1-6]|ul|ol|img)/i.test(rawHtml)) {
        e.preventDefault();
        const converted = htmlToMarkdown(rawHtml);
        if (converted) {
          vditorRef.current.insertValue(converted);
          toast.success(
            t({
              id: "HtmlConvertedToMarkdownToast",
              message: "Rich HTML & interactive form converted to Markdown format",
            })
          );
        }
      }
    },
    [t]
  );

  return (
    <div
      onPaste={handlePaste}
      className="w-full h-full relative overflow-hidden bg-background text-foreground vditor-host-wrapper"
    >
      <div ref={editorContainerRef} className="w-full h-full" />
    </div>
  );
}
