"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Columns,
  Eye,
  Edit3,
  Copy,
  Check,
  Undo2,
  Redo2,
  Minus,
  Sparkles,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useExtracted } from "next-intl";
import { htmlToMarkdown } from "@/utils/editor/markdown-paste";
import { sanitizeAndEnhanceHtml } from "@/utils/editor/markdown-sanitize";

interface MarkdownEditorProps {
  initialContent: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export function MarkdownEditor({
  initialContent,
  onChange,
  onSave,
}: MarkdownEditorProps) {
  const t = useExtracted();
  const [content, setContent] = useState<string>(initialContent || "");
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">("split");
  const [copied, setCopied] = useState<boolean>(false);
  const [syncScroll, setSyncScroll] = useState<boolean>(true);

  // 历史栈记录 (支持 Undo / Redo)
  const historyRef = useRef<string[]>([initialContent || ""]);
  const historyIndexRef = useRef<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollingSourceRef = useRef<"editor" | "preview" | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 同步 initialContent 更新
  useEffect(() => {
    setContent(initialContent || "");
    historyRef.current = [initialContent || ""];
    historyIndexRef.current = 0;
  }, [initialContent]);

  // 更新内容并记录历史
  const updateContentWithHistory = useCallback((newVal: string) => {
    setContent(newVal);
    onChange?.(newVal);

    // 截断重做分支，压入新状态
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (newHistory[newHistory.length - 1] !== newVal) {
      newHistory.push(newVal);
      // 限制历史栈深度
      if (newHistory.length > 50) newHistory.shift();
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
    }
  }, [onChange]);

  // 撤销 (Undo)
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current];
      setContent(prev);
      onChange?.(prev);
    }
  }, [onChange]);

  // 重做 (Redo)
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current];
      setContent(next);
      onChange?.(next);
    }
  }, [onChange]);

  // 快捷键拦截 (Ctrl+S / Ctrl+Z / Ctrl+Y / Tab / 粗体 / 斜体)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSave?.();
      return;
    }

    if (isCtrl && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else {
        e.preventDefault();
        handleUndo();
      }
      return;
    }

    if (isCtrl && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (isCtrl && e.key.toLowerCase() === "b") {
      e.preventDefault();
      insertSyntax("**", "**", "加粗文字");
      return;
    }

    if (isCtrl && e.key.toLowerCase() === "i") {
      e.preventDefault();
      insertSyntax("*", "*", "斜体文字");
      return;
    }

    // Tab 缩进支持 (2个空格)
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = content.substring(0, start) + "  " + content.substring(end);
      updateContentWithHistory(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // 剪贴板粘贴智能处理器 (针对 ChatGPT / Gemini / Claude 等富文本、表单与图片原样还原)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. 优先检查是否存在图片文件（如直接复制截图）
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
          insertSyntax("![image](", `)`, base64Url);
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // 2. 检查是否有 HTML 富文本 (包含表单控件、结构化表格、排版标签)
    const rawHtml = clipboardData.getData("text/html");
    const plainText = clipboardData.getData("text/plain");

    if (rawHtml && rawHtml.trim()) {
      // 智能识别是否为 AI 界面或富网页输出（包含特定标签或复杂格式）
      const hasRichContent = /<(form|input|select|button|table|h[1-6]|ul|ol|blockquote|img)/i.test(
        rawHtml
      );
      if (hasRichContent) {
        e.preventDefault();
        const convertedMd = htmlToMarkdown(rawHtml);
        if (convertedMd) {
          const textarea = textareaRef.current;
          if (!textarea) return;

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent =
            content.substring(0, start) + convertedMd + content.substring(end);
          updateContentWithHistory(newContent);

          setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd =
              start + convertedMd.length;
          }, 0);

          toast.success(
            t({
              id: "HtmlConvertedToMarkdownToast",
              message: "Rich HTML & interactive form converted to Markdown format",
            })
          );
          return;
        }
      }
    }

    // 普通文本自然流入原生粘贴流程
  };

  // 工具栏语法插入辅助函数
  const insertSyntax = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;

    const replacement = `${before}${selected}${after}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);

    updateContentWithHistory(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  // 两栏精准百分比联动双向滚动 (参考 markdown.com.cn 同步滚动机制)
  const handleEditorScroll = () => {
    if (!syncScroll || viewMode !== "split") return;
    if (scrollingSourceRef.current === "preview") return;

    scrollingSourceRef.current = "editor";
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const maxTextareaScroll = textarea.scrollHeight - textarea.clientHeight;
    if (maxTextareaScroll > 0) {
      const percentage = textarea.scrollTop / maxTextareaScroll;
      const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;
      preview.scrollTop = percentage * maxPreviewScroll;
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollingSourceRef.current = null;
    }, 120);
  };

  const handlePreviewScroll = () => {
    if (!syncScroll || viewMode !== "split") return;
    if (scrollingSourceRef.current === "editor") return;

    scrollingSourceRef.current = "preview";
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;
    if (maxPreviewScroll > 0) {
      const percentage = preview.scrollTop / maxPreviewScroll;
      const maxTextareaScroll = textarea.scrollHeight - textarea.clientHeight;
      textarea.scrollTop = percentage * maxTextareaScroll;
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollingSourceRef.current = null;
    }, 120);
  };

  // 字符统计与统计信息
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const lines = content ? content.split("\n").length : 1;
    return { words, chars, lines };
  }, [content]);

  // 高保真 Markdown -> HTML 解析转换引擎 (GFM、脚注、高亮标记、警告框、表格等)
  const renderedHtml = useMemo(() => {
    if (!content) {
      return "<div class='text-muted-foreground/60 italic p-8 text-center'>暂无内容，在左侧开始您的 Markdown 创作...</div>";
    }

    let html = content;

    // 0. 保护安全的内嵌交互标签（表单、输入框、按钮等），避免被基础实体转义抹杀
    const safeHtmlBlocks: string[] = [];
    const safeHtmlPattern =
      /<(form|input|select|option|button|textarea|label|fieldset|legend|div|span|p|img|br|hr)(?:\s+[^>]*?)?>[\s\S]*?<\/\1>|<(input|img|br|hr)(?:\s+[^>]*?)?\/?>/gi;

    html = html.replace(safeHtmlPattern, (match) => {
      safeHtmlBlocks.push(match);
      return `__SAFE_HTML_PLACEHOLDER_${safeHtmlBlocks.length - 1}__`;
    });

    // 基础 HTML 实体转义防 XSS
    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    html = html.replace(/[&<>"']/g, (m) => escapeMap[m]);

    // 1. 代码块与语法高亮标签 (```lang ... ```)
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="my-3.5 p-4 rounded-xl bg-zinc-950 text-zinc-100 overflow-x-auto text-xs font-mono leading-relaxed border border-zinc-800 shadow-md"><div class="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80"><span class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">${lang || "code"}</span><span class="text-[10px] text-zinc-500">ReadOnly</span></div><code>${code.trim()}</code></pre>`;
    });

    // 2. 行内代码 (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-muted text-primary text-[11px] font-mono font-medium border border-border/40">$1</code>');

    // 3. 标题 (# ~ ######) 并支持锚点
    html = html.replace(/^###### (.*$)/gim, '<h6 class="text-xs font-bold text-foreground mt-4 mb-1.5 tracking-tight">$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="text-sm font-bold text-foreground mt-4 mb-2 tracking-tight">$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold text-foreground mt-5 mb-2 tracking-tight">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-foreground mt-6 mb-2 border-b border-border/40 pb-1 tracking-tight">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-foreground mt-7 mb-3 border-b border-border/60 pb-1.5 tracking-tight">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-foreground mt-7 mb-4 border-b border-border pb-2 tracking-tight">$1</h1>');

    // 4. 任务清单 (- [ ] / - [x])
    html = html.replace(/^\s*-\s*\[ \]\s+(.*$)/gim, '<li class="flex items-center gap-2 list-none my-1.5 text-xs text-foreground"><input type="checkbox" disabled class="rounded border-border text-primary cursor-not-allowed" /> <span>$1</span></li>');
    html = html.replace(/^\s*-\s*\[x\]\s+(.*$)/gim, '<li class="flex items-center gap-2 list-none my-1.5 text-xs text-muted-foreground line-through"><input type="checkbox" checked disabled class="rounded border-border text-primary cursor-not-allowed" /> <span>$1</span></li>');

    // 5. 粗体、斜体、删除线、高亮标记 (==text==)
    html = html.replace(/==([^=]+)==/g, '<mark class="bg-amber-300 dark:bg-amber-900/60 text-foreground px-1 py-0.5 rounded">$1</mark>');
    html = html.replace(/~~([^~]+)~~/g, '<del class="line-through text-muted-foreground">$1</del>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-foreground/90">$1</em>');

    // 6. 引用块与提示信息块 (> [!NOTE] / > ...)
    html = html.replace(/^\> \[!NOTE\]\s*(.*$)/gim, '<div class="my-3 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs text-blue-900 dark:text-blue-300"><div class="font-bold mb-1 flex items-center gap-1.5">📌 提示</div><div>$1</div></div>');
    html = html.replace(/^\> \[!WARNING\]\s*(.*$)/gim, '<div class="my-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-300"><div class="font-bold mb-1 flex items-center gap-1.5">⚠️ 警告</div><div>$1</div></div>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary bg-muted/40 px-3.5 py-2 my-2.5 rounded-r-lg text-xs text-muted-foreground italic leading-relaxed">$1</blockquote>');

    // 7. 分割线 (--- / ***)
    html = html.replace(/^(\-{3,}|\*{3,})$/gim, '<hr class="my-6 border-border" />');

    // 8. 链接与图片
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-4 rounded-xl max-w-full border border-border shadow-sm mx-auto" />');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium inline-flex items-center gap-0.5">$1</a>');

    // 9. Markdown 表格高质感渲染
    html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
      const lines = match.trim().split("\n").map((l) => l.trim());
      if (lines.length < 2) return match;
      const headers = lines[0].split("|").slice(1, -1).map((h) => h.trim());
      const bodyLines = lines.slice(2);

      let tableHtml = '<div class="my-4 overflow-x-auto rounded-xl border border-border shadow-xs"><table class="w-full text-xs text-left border-collapse">';
      tableHtml += '<thead class="bg-muted text-muted-foreground border-b border-border"><tr>';
      headers.forEach((h) => {
        tableHtml += `<th class="px-3.5 py-2.5 font-bold uppercase tracking-wider">${h}</th>`;
      });
      tableHtml += "</tr></thead><tbody>";

      bodyLines.forEach((rowLine) => {
        const cells = rowLine.split("|").slice(1, -1).map((c) => c.trim());
        tableHtml += '<tr class="border-b border-border/50 hover:bg-muted/30 transition-colors">';
        cells.forEach((cell) => {
          tableHtml += `<td class="px-3.5 py-2 text-foreground/90">${cell}</td>`;
        });
        tableHtml += "</tr>";
      });

      tableHtml += "</tbody></table></div>";
      return tableHtml;
    });

    // 10. 段落换行
    html = html.replace(/\n\n+/g, "</p><p class='my-3 leading-relaxed text-xs text-foreground/90'>");
    html = `<p class='my-3 leading-relaxed text-xs text-foreground/90'>${html}</p>`;

    // 11. 还原受保护的安全 HTML 表单/交互标签，并进行最终安全净化与交互样式增强
    if (safeHtmlBlocks.length > 0) {
      safeHtmlBlocks.forEach((block, idx) => {
        html = html.replace(`__SAFE_HTML_PLACEHOLDER_${idx}__`, block);
      });
      html = sanitizeAndEnhanceHtml(html);
    }

    return html;
  }, [content]);

  // 复制纯 Markdown 源码
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(t({ id: "CopiedSourceToast", message: "Markdown source copied to clipboard" }));
    setTimeout(() => setCopied(false), 2000);
  };

  // 复制渲染后的格式化 HTML
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml);
    toast.success(t({ id: "CopiedHtmlToast", message: "Rendered HTML copied to clipboard" }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* 增强型排版工具栏 */}
      <div className="h-11 px-3.5 border-b border-border bg-card/75 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide py-1">
          {/* 撤销 / 重做 */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndexRef.current <= 0}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

          {/* 常用行内样式 */}
          <button
            type="button"
            onClick={() => insertSyntax("**", "**", "Bold Text")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("*", "*", "Italic Text")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("~~", "~~", "Strikethrough")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("==", "==", "Highlight")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Highlight Text"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </button>

          <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

          {/* 标题 */}
          <button
            type="button"
            onClick={() => insertSyntax("# ", "", "Heading 1")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("## ", "", "Heading 2")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("### ", "", "Heading 3")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

          {/* 列表与待办 */}
          <button
            type="button"
            onClick={() => insertSyntax("- ", "", "List item")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("1. ", "", "Ordered item")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("- [ ] ", "", "Task")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Task List"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-border/80 mx-1 shrink-0" />

          {/* 结构性元素 */}
          <button
            type="button"
            onClick={() => insertSyntax("> ", "", "Quote text")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("```typescript\n", "\n```", "// Write code")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("[Link Title](", ")", "https://example.com")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Insert Link"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("![Image Alt](", ")", "https://example.com/image.png")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Insert Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              insertSyntax(
                "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n"
              )
            }
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("\n---\n")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 右侧控制：同步滚动开关、复制、视图切换模式 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 同步滚动开关 */}
          {viewMode === "split" && (
            <button
              type="button"
              onClick={() => {
                const next = !syncScroll;
                setSyncScroll(next);
                toast.info(
                  next
                    ? t({ id: "SyncScrollEnabledToast", message: "Dual-pane synchronized scrolling enabled" })
                    : t({ id: "SyncScrollDisabledToast", message: "Dual-pane synchronized scrolling disabled" })
                );
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                syncScroll
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Synchronize dual-pane scrolling"
            >
              <RotateCcw className={cn("w-3 h-3", syncScroll && "rotate-180 transition-transform")} />
              <span className="hidden lg:inline">
                {syncScroll
                  ? t({ id: "SyncScrollOn", message: "Sync Scroll: On" })
                  : t({ id: "SyncScrollOff", message: "Sync Scroll: Off" })}
              </span>
            </button>
          )}

          <div className="h-3.5 w-px bg-border/80 mx-0.5" />

          {/* 复制菜单 */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={t({ id: "CopySource", message: "Copy Source" })}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {copied ? t({ id: "Copied", message: "Copied" }) : t({ id: "CopySource", message: "Copy Source" })}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyHtml}
            className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={t({ id: "CopyHtml", message: "Copy HTML" })}
          >
            <span>{t({ id: "CopyHtml", message: "Copy HTML" })}</span>
          </button>

          <div className="h-3.5 w-px bg-border/80 mx-0.5" />

          {/* 视图模式切换 */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                viewMode === "edit"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t({ id: "ModeEdit", message: "Edit" })}
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden md:inline">{t({ id: "ModeEdit", message: "Edit" })}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                viewMode === "split"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t({ id: "ModeSplit", message: "Split" })}
            >
              <Columns className="w-3 h-3" />
              <span className="hidden md:inline">{t({ id: "ModeSplit", message: "Split" })}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={t({ id: "ModePreview", message: "Preview" })}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden md:inline">{t({ id: "ModePreview", message: "Preview" })}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 核心工作区：支持双向百分比联动平滑滚动 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：源代码编辑区 */}
        {(viewMode === "split" || viewMode === "edit") && (
          <div
            className={cn(
              "h-full flex flex-col overflow-hidden bg-card/20 transition-all",
              viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"
            )}
          >
            <div className="h-6 px-4 border-b border-border/50 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground select-none shrink-0">
              <span className="font-semibold uppercase tracking-wider">Markdown Editor</span>
              <span>
                {t("{lines} lines · {words} words · {chars} chars", {
                  lines: String(stats.lines),
                  words: String(stats.words),
                  chars: String(stats.chars),
                })}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => updateContentWithHistory(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onScroll={handleEditorScroll}
              placeholder={t({
                id: "MarkdownPlaceholder",
                message: "Write Markdown here... Press Ctrl+S to save, supports standard GFM syntax.",
              })}
              className="flex-1 w-full p-5 text-xs md:text-sm font-mono leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-hidden selection:bg-primary/20 overflow-y-auto"
              spellCheck={false}
            />
          </div>
        )}

        {/* 右侧：实时渲染预览区 */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            ref={previewRef}
            onScroll={handlePreviewScroll}
            className={cn(
              "h-full overflow-y-auto bg-background transition-all",
              viewMode === "split" ? "w-1/2" : "w-full"
            )}
          >
            <div className="h-6 px-4 border-b border-border/50 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground select-none sticky top-0 backdrop-blur-xs z-10">
              <span className="font-semibold uppercase tracking-wider">
                {t({ id: "LivePreviewTitle", message: "Live Preview" })}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {t({ id: "GfmStandard", message: "GFM Compliant" })}
              </span>
            </div>
            <div className="p-6 md:p-8 max-w-3xl mx-auto">
              <div
                className="markdown-body prose prose-sm dark:prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 底部状态微型信息栏 */}
      <footer className="h-5 px-3 border-t border-border bg-card/40 flex items-center justify-between text-[10px] text-muted-foreground select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>Markdown (GFM)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>
            {t("{lines} lines, {chars} characters", {
              lines: String(stats.lines),
              chars: String(stats.chars),
            })}
          </span>
        </div>
      </footer>
    </div>
  );
}
