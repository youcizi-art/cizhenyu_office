"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";
import {
  Download,
  Copy,
  Check,
  Eye,
  HardDrive,
  Clock,
  FileText,
  ListTree,
  X,
  ChevronRight,
  ArrowUp,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { formatRelativeTime } from "@/utils/recent-files";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface MarkdownPreviewViewProps {
  content: string;
  docName: string;
  docSize: number;
  updatedAt: number;
  onDownload: () => void;
}

/**
 * 独立的 Markdown 公开只读预览展示组件
 * - 抑制横向溢出滚动条
 * - 右侧目录始终固定在视窗右侧跟随阅读进度上下浮动 (Sticky + Auto-center)
 * - 支持移动端目录抽屉、Scroll Spy 实时高亮与回到顶部
 */
export function MarkdownPreviewView({
  content,
  docName,
  docSize,
  updatedAt,
  onDownload,
}: MarkdownPreviewViewProps) {
  const t = useExtracted();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [showMobileToc, setShowMobileToc] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // 严格杜绝全局横向滚动条
  useEffect(() => {
    const prevOverflowX = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = prevOverflowX;
    };
  }, []);

  // 解析与提取标题目录
  const extractHeadings = useCallback(() => {
    if (!containerRef.current) return;
    const headingElements = containerRef.current.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6"
    );
    const items: TocItem[] = [];

    headingElements.forEach((el, index) => {
      let id = el.getAttribute("id");
      if (!id) {
        id = `section-heading-${index}`;
        el.setAttribute("id", id);
      }
      const level = parseInt(el.tagName.substring(1), 10) || 1;
      const text = el.textContent?.trim() || `Section ${index + 1}`;
      items.push({ id, text, level });
    });

    setTocItems(items);
    if (items.length > 0 && !activeHeadingId) {
      setActiveHeadingId(items[0].id);
    }
  }, [activeHeadingId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const isDarkMode = document.documentElement.classList.contains("dark");

    try {
      Vditor.preview(containerRef.current, content || "", {
        cdn: "/vditor",
        mode: isDarkMode ? "dark" : "light",
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
      });

      // 渲染后提取目录
      setTimeout(extractHeadings, 120);
    } catch {
      if (containerRef.current) {
        containerRef.current.innerText = content;
      }
    }
  }, [content, extractHeadings]);

  // 滚动监听：Scroll Spy 实时高亮当前处于视口顶部的章节与控制返回顶部浮标
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);

      if (tocItems.length === 0) return;
      const scrollPos = window.scrollY + 120;
      let currentActive = tocItems[0].id;

      for (const item of tocItems) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPos) {
          currentActive = item.id;
        } else {
          break;
        }
      }
      setActiveHeadingId(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocItems]);

  // 当当前高亮章节改变时，自动将右侧目录中对应的选项平滑滚动至目录可视区域中，保证长文档中高亮项始终在视窗可见
  useEffect(() => {
    if (!activeHeadingId) return;
    const activeBtn = document.querySelector(`[data-toc-id="${activeHeadingId}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeHeadingId]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeadingId(id);
      setShowMobileToc(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t({ id: "CopiedSourceToast", message: "Markdown source copied to clipboard" }));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t({ id: "CopyFailed", message: "Copy failed, please copy manually" }));
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground font-sans">
      {/* 顶部极简沉浸式阅读顶栏 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/80 bg-background/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold truncate text-foreground" title={docName}>
                {docName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <Eye className="w-2.5 h-2.5" />
                {t({ id: "OnlineReading", message: "Online Reading" })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <HardDrive className="w-2.5 h-2.5" />
                {(docSize / 1024).toFixed(1)} KB
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatRelativeTime(updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 目录切换按钮 (适用于所有屏幕，尤其是移动端与小屏) */}
          {tocItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMobileToc((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                showMobileToc
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              title={t({ id: "ToggleToc", message: "Toggle Table of Contents" })}
            >
              <ListTree className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t({ id: "TableOfContents", message: "Table of Contents" })}</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                {tocItems.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={t({ id: "CopySource", message: "Copy Source" })}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {copied ? t({ id: "Copied", message: "Copied" }) : t({ id: "Copy", message: "Copy" })}
            </span>
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t({ id: "DownloadFile", message: "Download" })}</span>
          </button>
        </div>
      </header>

      {/* 主体布局：内容正文与大屏右侧粘性目录大纲 */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex justify-center px-4 py-8 sm:px-8 gap-8 relative">
        {/* Markdown 正文预览容器 */}
        <main className="flex-1 max-w-4xl min-w-0">
          <div
            ref={containerRef}
            className="vditor-reset markdown-body w-full overflow-x-auto leading-relaxed text-sm bg-transparent"
          />
        </main>

        {/* 桌面端大屏吸顶右侧目录 (Sticky TOC: 始终停留在视窗右侧跟随浏览) */}
        {tocItems.length > 0 && (
          <aside className="hidden lg:block w-72 shrink-0 self-start sticky top-20">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/80 bg-card/80 p-4 backdrop-blur-md shadow-xs flex flex-col">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-3 pb-2 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <ListTree className="w-4 h-4 text-primary" />
                  <span>{t({ id: "OnThisPage", message: "On this page" })}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {tocItems.length}
                </span>
              </div>

              <nav className="space-y-1 text-xs overflow-y-auto pr-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    data-toc-id={item.id}
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    style={{ paddingLeft: `${Math.max(0, item.level - 1) * 12 + 8}px` }}
                    className={cn(
                      "w-full text-left py-1.5 pr-2 rounded-lg transition-all truncate block cursor-pointer",
                      activeHeadingId === item.id
                        ? "text-primary font-semibold bg-primary/10 border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>

      {/* 浮动返回顶部按钮 */}
      {showBackToTop && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer hover:scale-105"
            title={t({ id: "BackToTop", message: "Back to top" })}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 移动端/小屏目录抽屉浮层 */}
      {showMobileToc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-80 max-w-[85vw] h-full bg-card border-l border-border p-5 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListTree className="w-4 h-4 text-primary" />
                <span>{t({ id: "TableOfContents", message: "Table of Contents" })}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileToc(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  data-toc-id={item.id}
                  type="button"
                  onClick={() => scrollToHeading(item.id)}
                  style={{ paddingLeft: `${Math.max(0, item.level - 1) * 12 + 8}px` }}
                  className={cn(
                    "w-full flex items-center justify-between py-2 pr-2 rounded-xl transition-all text-left cursor-pointer",
                    activeHeadingId === item.id
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="truncate">{item.text}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
