"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Clock, Cloud, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";
import { FilePickerCard } from "@/components/file-picker-card";
import { DocumentIcon } from "@/components/document-icon";
import { getDocConfig } from "@/lib/document-types";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAppStore } from "@/store";
import { fetchDocumentsAndCategories, DocumentMeta, Category } from "@/lib/api";
import {
  getRecentFiles,
  openRecentFile,
  removeRecentFile,
  addRecentFile,
  formatRelativeTime,
  type RecentFileRecord,
} from "@/utils/recent-files";

export function OpenView() {
  const t = useExtracted();
  usePageTitle("私有在线 Office 工作台 | CIZHENYU");

  const [onlineDocs, setOnlineDocs] = useState<DocumentMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(true);

  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  const router = useRouter();
  const server = useAppStore((state) => state.server);

  useEffect(() => {
    loadOnlineDocs();
    loadLocalRecentFiles();
  }, []);

  const loadOnlineDocs = async () => {
    try {
      setIsOnlineLoading(true);
      const res = await fetchDocumentsAndCategories();
      setCategories(res.categories || []);
      // 按最后修改时间倒序排列
      const sorted = (res.documents || []).sort((a, b) => b.updatedAt - a.updatedAt);
      setOnlineDocs(sorted.slice(0, 8));
    } catch (err) {
      console.warn("加载在线文档失败:", err);
    } finally {
      setIsOnlineLoading(false);
    }
  };

  const loadLocalRecentFiles = async () => {
    try {
      setIsLocalLoading(true);
      const files = await getRecentFiles();
      setRecentFiles(files);
    } catch (error) {
      console.error("Failed to load local recent files:", error);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleRecentLocalFileClick = async (record: RecentFileRecord) => {
    try {
      const file = await openRecentFile(record);
      if (file) {
        await handleFileSelectWithHandle(file, record.handle);
      } else {
        await loadLocalRecentFiles();
      }
    } catch (error) {
      console.error("Failed to open recent local file:", error);
      await loadLocalRecentFiles();
    }
  };

  const handleRemoveLocalRecentFile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeRecentFile(id);
      await loadLocalRecentFiles();
    } catch (error) {
      console.error("Failed to remove recent local file:", error);
    }
  };

  const handleFileSelectWithHandle = async (
    file: File,
    handle?: FileSystemFileHandle,
  ) => {
    if (handle) {
      try {
        await addRecentFile(handle);
        await loadLocalRecentFiles();
      } catch (error) {
        console.error("Failed to add to recent files:", error);
      }
    }
    await server.open(file);
    router.push("/editor");
  };

  const getCategoryName = (catId: string | null) => {
    if (!catId) return "未分类";
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "未分类";
  };

  const newDocTypes = [
    { type: "docx", label: t({ id: "Document", message: "Document" }) },
    { type: "xlsx", label: t({ id: "Spreadsheet", message: "Spreadsheet" }) },
    { type: "pptx", label: t({ id: "Presentation", message: "Presentation" }) },
    { type: "pdf", label: t({ id: "PDF", message: "PDF" }) },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* File Picker Card for uploading files */}
      <section>
        <FilePickerCard onFileSelectWithHandle={handleFileSelectWithHandle} />
      </section>

      {/* Quick Start Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            快速新建文档
          </h2>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-nowrap items-stretch gap-3 mb-4">
          {newDocTypes.map(({ type, label }) => {
            const doc = getDocConfig(type);
            return (
              <Link
                key={type}
                href={`/editor?new=${type}`}
                className={cn(
                  "flex-1 p-4 rounded-xl border transition-all duration-300 group flex flex-col justify-between",
                  "bg-card hover:shadow-md",
                  doc.hoverBorderColor,
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-300",
                      doc.lightBgColor,
                    )}
                  >
                    <doc.icon className={cn("w-6 h-6", doc.color)} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    {type}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {label}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    创建空白 {label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 最近编辑的在线云端文档模块 (替换原模板板块) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">最近编辑的在线文档</h2>
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
              R2 云端同步
            </span>
          </div>
          <Link
            href="/documents"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1 group"
          >
            查看所有在线文档
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isOnlineLoading ? (
          <div className="bg-card/50 border border-border rounded-xl p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">正在连接 R2 存储同步文档...</p>
            </div>
          </div>
        ) : onlineDocs.length === 0 ? (
          <div className="bg-card/50 border border-dashed border-border rounded-xl p-8 text-center">
            <Cloud className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">云端暂无在线文档</p>
            <p className="text-xs text-muted-foreground mb-4">
              新建文档编辑并按 Ctrl+S，将自动保存到 Cloudflare R2 存储桶中
            </p>
            <Link
              href="/editor?new=docx"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-all"
            >
              新建 Word 文档
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {onlineDocs.map((doc) => {
              const docCfg = getDocConfig(doc.type);
              return (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/editor?docId=${encodeURIComponent(doc.id)}`)}
                  className="group relative flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        docCfg.lightBgColor,
                      )}
                    >
                      <docCfg.icon className={cn("w-5 h-5", docCfg.color)} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate max-w-[100px]">
                      {getCategoryName(doc.categoryId)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                      {doc.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                      <span>{formatRelativeTime(doc.updatedAt)}</span>
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 本地历史打开文件记录 */}
      {recentFiles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              本地临时打开记录
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden divide-y divide-border">
            {recentFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleRecentLocalFileClick(file)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-sidebar-hover transition-colors group cursor-pointer"
                title="重新打开此本地文件"
              >
                <div className="flex items-center gap-3">
                  <DocumentIcon type={file.type} size="sm" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-foreground">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(file.updatedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveLocalRecentFile(e, file.path)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-border/50 rounded"
                  title="移除记录"
                >
                  <span className="text-xs text-muted-foreground hover:text-foreground">×</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
