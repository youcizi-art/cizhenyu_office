"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  ChevronsUpDown,
  ArrowUp,
  FileQuestion,
} from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { formatRelativeTime } from "@/utils/recent-files";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";

import {
  TocItem,
  TocNode,
  buildTocTree,
  TocTreeNodeItem,
} from "./markdown-toc-tree";

export type { TocItem, TocNode };

interface MarkdownPreviewViewProps {
  content: string;
  docName: string;
  docSize: number;
  updatedAt: number;
  onDownload: () => void;
}

/**
 * 从原始 Markdown 源码文本中同步提取所有章节标题
 * 确保第 0 毫秒首屏直接生成完整目录，绝不因异步渲染延迟导致目录丢失或闪烁
 */
function extractHeadingsFromMarkdown(mdText: string): TocItem[] {
  if (!mdText) return [];
  const lines = mdText.split("\n");
  const items: TocItem[] = [];
  let inCodeBlock = false;
  let index = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("```") || line.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2]
        .replace(/[*`_~\[\]]/g, "")
        .replace(/\(https?:\/\/[^\)]+\)/g, "")
        .trim();
      if (text) {
        items.push({
          id: `heading-item-${index}`,
          text,
          level,
        });
        index++;
      }
    }
  }
  return items;
}

/**
 * 独立的 Markdown 公开只读预览展示组件
 * - 采用双栏布局：左侧正文独立滚动，右侧固定目录栏（Fixed Outline Sidebar）永久固定在视窗右侧
 * - 支持源码同步提取与 DOM 渲染后双重校准，目录绝对稳定可靠
 * - 支持章节目录多层级折叠展开、Scroll Spy 实时跟随高亮与移动端抽屉
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
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const tocNavRef = useRef<HTMLElement>(null);

  const [copied, setCopied] = useState(false);
  // 同步预解析 Markdown，确保首屏直接渲染目录，杜绝异步等待延迟
  const [tocItems, setTocItems] = useState<TocItem[]>(() =>
    extractHeadingsFromMarkdown(content)
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string>(() =>
    tocItems[0]?.id || ""
  );
  const [showMobileToc, setShowMobileToc] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // 严格杜绝全局横向溢出
  useEffect(() => {
    const prevOverflowX = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = prevOverflowX;
    };
  }, []);

  // 将 DOM 标题元素与对应的 ID 进行对齐绑定
  const syncDomHeadingIds = useCallback(() => {
    if (!containerRef.current) return;
    const headingElements = containerRef.current.querySelectorAll<HTMLElement>(
      "h1, h2, h3, h4, h5, h6"
    );

    if (headingElements.length === 0) return;

    const domItems: TocItem[] = [];
    headingElements.forEach((el, index) => {
      const id = `heading-item-${index}`;
      el.setAttribute("id", id);
      const level = parseInt(el.tagName.substring(1), 10) || 1;
      const text = el.textContent?.trim() || `Section ${index + 1}`;
      domItems.push({ id, text, level });
    });

    setTocItems(domItems);
    if (!activeHeadingId && domItems.length > 0) {
      setActiveHeadingId(domItems[0].id);
    }
  }, [activeHeadingId]);

  // 当外部 content 变化时重新同步
  useEffect(() => {
    const parsed = extractHeadingsFromMarkdown(content);
    setTocItems(parsed);
    if (parsed.length > 0) {
      setActiveHeadingId(parsed[0].id);
    }
  }, [content]);

  // 渲染 Vditor preview
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
        after: () => {
          syncDomHeadingIds();
        },
      }).then(() => {
        syncDomHeadingIds();
      });
    } catch {
      if (containerRef.current) {
        containerRef.current.innerText = content;
      }
    }
  }, [content, syncDomHeadingIds]);

  // 树形多层级目录结构
  const tocTree = useMemo(() => buildTocTree(tocItems), [tocItems]);

  // 切换折叠与展开
  const toggleCollapse = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全部折叠 / 全部展开
  const toggleAllCollapse = useCallback(() => {
    if (collapsedIds.size > 0) {
      setCollapsedIds(new Set());
    } else {
      const allParentIds = new Set<string>();
      const collectParents = (nodes: TocNode[]) => {
        for (const node of nodes) {
          if (node.children && node.children.length > 0) {
            allParentIds.add(node.id);
            collectParents(node.children);
          }
        }
      };
      collectParents(tocTree);
      setCollapsedIds(allParentIds);
    }
  }, [collapsedIds.size, tocTree]);

  // 查找某个节点的所有祖先 ID，以支持联动自动展开
  const findAncestors = useCallback(
    (nodes: TocNode[], targetId: string, currentPath: string[] = []): string[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return currentPath;
        }
        if (node.children && node.children.length > 0) {
          const found = findAncestors(node.children, targetId, [...currentPath, node.id]);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // 当正文滚动定位到深层子章节时，自动展开其折叠的祖先分支
  useEffect(() => {
    if (!activeHeadingId || tocTree.length === 0) return;
    const ancestors = findAncestors(tocTree, activeHeadingId);
    if (ancestors && ancestors.length > 0) {
      setCollapsedIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const ancestorId of ancestors) {
          if (next.has(ancestorId)) {
            next.delete(ancestorId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [activeHeadingId, tocTree, findAncestors]);

  // 正文独立滚动监听：Scroll Spy 实时高亮与返回顶部按钮显示
  const handleContentScroll = useCallback(() => {
    const container = contentScrollRef.current;
    if (!container) return;

    setShowBackToTop(container.scrollTop > 300);

    if (tocItems.length === 0) return;
    const containerRect = container.getBoundingClientRect();
    let currentActive = tocItems[0].id;

    for (const item of tocItems) {
      const el = document.getElementById(item.id);
      if (el) {
        const elRect = el.getBoundingClientRect();
        // 当标题进入正文滚动视口上方 120px 范围时标记为当前阅读项
        if (elRect.top - containerRect.top <= 120) {
          currentActive = item.id;
        } else {
          break;
        }
      }
    }
    setActiveHeadingId(currentActive);
  }, [tocItems]);

  // 目录导航项自适应微调滚动位置，保证超长目录中当前高亮项始终在视野内
  useEffect(() => {
    if (!activeHeadingId || !tocNavRef.current) return;
    const navEl = tocNavRef.current;
    const activeBtn = navEl.querySelector<HTMLElement>(`[data-toc-id="${activeHeadingId}"]`);
    if (activeBtn) {
      const btnTop = activeBtn.offsetTop;
      const btnHeight = activeBtn.offsetHeight;
      const navScrollTop = navEl.scrollTop;
      const navHeight = navEl.clientHeight;

      if (btnTop < navScrollTop) {
        navEl.scrollTo({ top: Math.max(0, btnTop - 16), behavior: "smooth" });
      } else if (btnTop + btnHeight > navScrollTop + navHeight) {
        navEl.scrollTo({ top: btnTop + btnHeight - navHeight + 16, behavior: "smooth" });
      }
    }
  }, [activeHeadingId]);

  // 点击目录项平滑滚动至对应标题
  const scrollToHeading = (id: string) => {
    const container = contentScrollRef.current;
    const el = document.getElementById(id);
    if (container && el) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop - 24;
      container.scrollTo({
        top: Math.max(0, relativeTop),
        behavior: "smooth",
      });
      setActiveHeadingId(id);
      setShowMobileToc(false);
    }
  };

  const scrollToTop = () => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      {/* 顶部沉浸式阅读导航栏 */}
      <header className="h-12 border-b border-border/80 bg-background/90 px-4 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold truncate text-foreground max-w-[160px] sm:max-w-xs md:max-w-md" title={docName}>
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

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 移动端目录抽屉按钮 */}
          {tocItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMobileToc((prev) => !prev)}
              className={cn(
                "lg:hidden inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                showMobileToc
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              title={t({ id: "ToggleToc", message: "Toggle Table of Contents" })}
            >
              <ListTree className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                {tocItems.length}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={t({ id: "CopySource", message: "Copy Source" })}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {copied ? t({ id: "Copied", message: "Copied" }) : t({ id: "Copy", message: "Copy" })}
            </span>
          </button>

          <LanguageSwitcher />

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t({ id: "DownloadFile", message: "Download" })}</span>
          </button>
        </div>
      </header>

      {/* 现代双栏主体：左侧正文独立滚动，右侧固定目录栏常驻 */}
      <div className="flex-1 flex flex-row overflow-hidden w-full relative">
        {/* 左侧正文独立滚动区 */}
        <main
          ref={contentScrollRef}
          onScroll={handleContentScroll}
          className="flex-1 h-full overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 scroll-smooth"
        >
          <div className="max-w-4xl mx-auto">
            <div
              ref={containerRef}
              className="vditor-reset markdown-body w-full leading-relaxed text-sm bg-transparent"
            />
          </div>
        </main>

        {/* 右侧固定大纲目录栏 (Fixed Outline Sidebar：始终在右侧固定展示，与预览模式一致) */}
        <aside className="hidden lg:flex flex-col w-72 h-full border-l border-border bg-card/60 backdrop-blur-md shrink-0 select-none">
          <div className="h-10 px-3.5 border-b border-border/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ListTree className="w-3.5 h-3.5 text-primary" />
              <span>{t({ id: "OnThisPage", message: "On this page" })}</span>
            </div>
            {tocItems.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllCollapse}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
                  title={
                    collapsedIds.size > 0
                      ? t({ id: "ExpandAll", message: "Expand all" })
                      : t({ id: "CollapseAll", message: "Collapse all" })
                  }
                >
                  <ChevronsUpDown className="w-3 h-3 text-primary" />
                  <span>
                    {collapsedIds.size > 0
                      ? t({ id: "ExpandAll", message: "Expand" })
                      : t({ id: "CollapseAll", message: "Collapse" })}
                  </span>
                </button>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {tocItems.length}
                </span>
              </div>
            )}
          </div>

          <nav ref={tocNavRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 text-xs">
            {tocItems.length > 0 ? (
              tocTree.map((node) => (
                <TocTreeNodeItem
                  key={node.id}
                  node={node}
                  activeId={activeHeadingId}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={toggleCollapse}
                  onSelect={scrollToHeading}
                />
              ))
            ) : (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileQuestion className="w-6 h-6 text-muted-foreground/60" />
                <span className="text-xs">
                  {t({ id: "NoHeadingsFound", message: "No headings found in document" })}
                </span>
              </div>
            )}
          </nav>
        </aside>
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

      {/* 移动端目录抽屉浮层 */}
      {showMobileToc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in lg:hidden">
          <div className="w-80 max-w-[85vw] h-full bg-card border-l border-border p-4 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
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

            <nav className="flex-1 overflow-y-auto space-y-0.5 text-xs pr-1">
              {tocItems.length > 0 ? (
                tocTree.map((node) => (
                  <TocTreeNodeItem
                    key={node.id}
                    node={node}
                    activeId={activeHeadingId}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={toggleCollapse}
                    onSelect={scrollToHeading}
                  />
                ))
              ) : (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileQuestion className="w-6 h-6 text-muted-foreground/60" />
                  <span className="text-xs">
                    {t({ id: "NoHeadingsFound", message: "No headings found in document" })}
                  </span>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
