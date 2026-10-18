"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import { Sparkles, Zap, Columns, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedLanguage } from "@/store";
import { useExtracted } from "@/hooks/use-i18n";
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

  const [activeMode, setActiveMode] = useState<"wysiwyg" | "ir" | "sv" | "preview">("wysiwyg");

  // 获取左侧原生的 preview 按钮
  const getNativePreviewBtn = useCallback((): HTMLButtonElement | null => {
    if (!editorContainerRef.current) return null;
    const container = editorContainerRef.current;
    const fromElements = (vditorRef.current as any)?.toolbar?.elements?.["preview"]?.element?.querySelector("button");
    return fromElements || container.querySelector<HTMLButtonElement>('button[data-type="preview"]');
  }, []);

  // 状态同步：检查左侧原生按钮状态，保持右上角快捷方式高亮一致
  const syncActiveModeFromNative = useCallback(() => {
    if (!vditorRef.current) return;
    const previewBtn = getNativePreviewBtn();
    if (previewBtn && previewBtn.classList.contains("vditor-menu--current")) {
      setActiveMode("preview");
      return;
    }
    const currentMode = vditorRef.current.getCurrentMode();
    if (currentMode) {
      setActiveMode(currentMode as "wysiwyg" | "ir" | "sv");
    }
  }, [getNativePreviewBtn]);

  // 右上角图标作为左侧对应原生图标的快捷方式直接触发
  const switchMode = useCallback(
    (targetMode: "wysiwyg" | "ir" | "sv" | "preview") => {
      if (!editorContainerRef.current || !vditorRef.current) return;
      const container = editorContainerRef.current;
      const vditor = vditorRef.current;
      const previewBtn = getNativePreviewBtn();
      const isCurrentlyPreview =
        previewBtn?.classList.contains("vditor-menu--current") || activeMode === "preview";

      if (targetMode === "preview") {
        // 点击右上角预览，直接相当于点击左侧原生 preview 眼睛图标
        if (previewBtn) {
          previewBtn.click();
        } else {
          // 兜底直接切换
          try {
            vditor.setPreviewMode(isCurrentlyPreview ? "editor" : "both");
          } catch {}
        }
        setTimeout(syncActiveModeFromNative, 50);
        return;
      }

      // 若当前处于预览模式，先点击原生 preview 退出预览
      if (isCurrentlyPreview && previewBtn) {
        previewBtn.click();
      }

      // 触发左侧对应模式按钮快捷点击
      const modeBtn = container.querySelector<HTMLButtonElement>(`button[data-mode="${targetMode}"]`);
      if (modeBtn) {
        modeBtn.click();
      }

      if (targetMode === "sv") {
        try {
          vditor.setPreviewMode("both");
        } catch {}
      }

      setTimeout(syncActiveModeFromNative, 50);
    },
    [activeMode, getNativePreviewBtn, syncActiveModeFromNative]
  );


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
        "outline",
        "fullscreen",
        // 保留底层原生控制器用于触发无缝模式切换，但在 CSS 中隐藏原弹出下拉菜单
        "edit-mode",
        "both",
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
        syncActiveModeFromNative();
      },
      input: (value: string) => {
        lastSavedContentRef.current = value;
        onChangeRef.current?.(value);
      },
      ctrlEnter: () => {
        onSaveRef.current?.();
      },
    });

    const el = editorContainerRef.current;
    const handleContainerClick = () => {
      setTimeout(syncActiveModeFromNative, 60);
    };
    el?.addEventListener("click", handleContainerClick);

    return () => {
      el?.removeEventListener("click", handleContainerClick);
      try {
        vditorInstance.destroy();
      } catch {}
      vditorRef.current = null;
      isVditorReadyRef.current = false;
    };
  }, [currentLang, syncActiveModeFromNative]);

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
      {/* 顶部工具栏右侧：以独立图标形式平铺展示 4 种模式切换 (所见即所得、即时渲染、分屏联动、只读预览) */}
      <div className="absolute right-3 top-[6px] z-20 flex items-center bg-muted/80 p-0.5 rounded-lg border border-border/70 shadow-2xs backdrop-blur-xs">
        <button
          type="button"
          onClick={() => switchMode("wysiwyg")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
            activeMode === "wysiwyg"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={t({ id: "ModeWYSIWYG", message: "WYSIWYG" })}
          aria-label={t({ id: "ModeWYSIWYG", message: "WYSIWYG" })}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">{t({ id: "ModeWYSIWYG", message: "WYSIWYG" })}</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode("ir")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
            activeMode === "ir"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={t({ id: "ModeIR", message: "Instant Rendering" })}
          aria-label={t({ id: "ModeIR", message: "Instant Rendering" })}
        >
          <Zap className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden md:inline">{t({ id: "ModeIR", message: "Instant Rendering" })}</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode("sv")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
            activeMode === "sv"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={t({ id: "ModeSplit", message: "Split View" })}
          aria-label={t({ id: "ModeSplit", message: "Split View" })}
        >
          <Columns className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden md:inline">{t({ id: "ModeSplit", message: "Split View" })}</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode("preview")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
            activeMode === "preview"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={t({ id: "ModePreview", message: "Preview" })}
          aria-label={t({ id: "ModePreview", message: "Preview" })}
        >
          <Eye className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden md:inline">{t({ id: "ModePreview", message: "Preview" })}</span>
        </button>
      </div>

      <div ref={editorContainerRef} className="w-full h-full" />
    </div>
  );
}
