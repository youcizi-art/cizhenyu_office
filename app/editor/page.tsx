"use client";

import React, { useLayoutEffect, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, useResolvedLanguage, useHasHydrated } from "@/store";
import {
  API_JS,
  APP_ROOT,
  getDocumentType,
  PRELOAD_HTML,
} from "@/utils/editor/utils";
import io, { MockSocket } from "@/utils/editor/socket";
import { createFetchProxy } from "@/utils/editor/fetch";
import { createXHRProxy } from "@/utils/editor/xhr";
import { DocEditor } from "@/utils/editor/types";
import { emptyDocx } from "@/utils/editor/empty";
import {
  fetchDocumentsAndCategories,
  getDocumentContentBlob,
  updateDocumentContent,
  saveNewDocument,
  createCategory,
  DocumentMeta,
  Category,
  DocumentType,
} from "@/lib/api";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { Toaster } from "@/components/ui/sonner";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import {
  ArrowLeft,
  Save,
  Download,
  Cloud,
  Check,
  FolderPlus,
  Loader2,
  FileText,
  FileEdit,
  FileCode2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

function EditorWorkspace() {
  const t = useExtracted();
  const router = useRouter();
  const server = useAppStore((state) => state.server);
  const language = useResolvedLanguage();
  const theme = useAppStore((state) => state.theme);
  const hasHydrated = useHasHydrated();
  const isDirty = useRef(false);

  // 云端文档上下文状态
  const [docId, setDocId] = useState<string | null>(null);
  const activeDocIdRef = useRef<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>("未命名文档");
  const [docType, setDocType] = useState<DocumentType>("docx");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Markdown 专有状态
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isMdLoading, setIsMdLoading] = useState<boolean>(false);
  const markdownContentRef = useRef<string>("");

  // 首次保存归类弹窗状态
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [inputName, setInputName] = useState<string>("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState<string>("");
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);
  const pendingBufferRef = useRef<Uint8Array | null>(null);

  // 全局拦截 window.alert 为统一 UI 弹窗 (Sonner Toast)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msg = typeof message === "string" ? message : JSON.stringify(message);
      toast.error(msg, { duration: 4000 });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // 触发保存 (支持 OnlyOffice 与 Markdown 统一体验)
  const handleTriggerSave = async () => {
    if (docType === "md") {
      setIsSaving(true);
      try {
        const text = markdownContentRef.current;
        const encoder = new TextEncoder();
        const buffer = encoder.encode(text);
        const currentDocId = activeDocIdRef.current || docId;

        if (currentDocId) {
          // 已存在云端文档：静默保存覆盖 R2
          await updateDocumentContent(currentDocId, buffer.buffer as ArrayBuffer);
          isDirty.current = false;
          toast.success(t({ id: "SavedToR2Success", message: "Successfully saved to Cloudflare R2" }));
        } else {
          // 新建文档首次保存：弹出归档对话框
          pendingBufferRef.current = buffer;
          setInputName(docTitle.replace(/\.md$/i, "") || t({ id: "UntitledDocument", message: "Untitled Document" }));
          try {
            const meta = await fetchDocumentsAndCategories();
            setCategories(meta.categories || []);
          } catch {}
          setSaveModalOpen(true);
        }
      } catch (err) {
        toast.error(t({ id: "FirstSaveFailed", message: "Save failed: " }) + String(err));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (window.editor?.downloadAs) {
      setIsSaving(true);
      window.editor.downloadAs();
    } else {
      toast.info(t({ id: "EditorStillLoading", message: "Editor is still loading, please wait..." }));
    }
  };

  // 快捷键拦截 (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleTriggerSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [docType, docId, docTitle]);

  // 页面关闭前检查未保存修改 (使用现代 pagehide/beforeunload 规避 unload 废弃警告)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 触发本地文件导出
  const handleTriggerDownload = () => {
    if (docType === "md") {
      const text = markdownContentRef.current;
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docTitle.endsWith(".md") ? docTitle : `${docTitle}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t({ id: "MarkdownDownloaded", message: "Markdown document downloaded to local" }));
      return;
    }

    server.setForceDownloadNext(true);
    if (window.editor?.downloadAs) {
      window.editor.downloadAs();
    }
  };

  useLayoutEffect(() => {
    if (!hasHydrated) return;

    const apiUrl = APP_ROOT + API_JS;
    const searchParams = new URLSearchParams(window.location.search);
    const paramDocId = searchParams.get("docId");
    if (paramDocId) {
      activeDocIdRef.current = paramDocId;
      setDocId(paramDocId);
    }
    const newDoc = searchParams.get("new");
    const paramLang = searchParams.get("lang");
    const paramTheme = searchParams.get("theme");

    const lang = paramLang || language;
    const uiTheme = paramTheme || theme;

    let editor: DocEditor | null = null;

    MockSocket.on("connect", server.handleConnect);
    MockSocket.on("disconnect", server.handleDisconnect);

    // 绑定服务端的保存拦截处理器
    server.setSaveHandler(async ({ buffer, title, fileType }) => {
      setIsSaving(true);
      try {
        const activeDocId =
          activeDocIdRef.current ||
          new URLSearchParams(window.location.search).get("docId");
        if (activeDocId) {
          // 已存在云端文档：静默保存覆盖 R2
          await updateDocumentContent(activeDocId, buffer.buffer as ArrayBuffer);
          isDirty.current = false;
          toast.success("已成功保存到 Cloudflare R2 云端");
          return true;
        } else {
          // 新建文档首次保存：弹出归档对话框
          pendingBufferRef.current = buffer;
          setInputName(title.replace(/\.[^/.]+$/, "") || "新建文档");
          // 加载分类列表
          try {
            const meta = await fetchDocumentsAndCategories();
            setCategories(meta.categories || []);
          } catch {}
          setSaveModalOpen(true);
          return true;
        }
      } catch (err) {
        toast.error("保存到云端失败: " + String(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    });

    const onAppReady = () => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[name="frameEditor"]'
      );
      const win = iframe?.contentWindow as typeof window;
      const iframeDoc = iframe?.contentDocument;
      if (!iframeDoc || !win) {
        throw new Error("Iframe not loaded");
      }

      const xhr = createXHRProxy(win.XMLHttpRequest);
      const fetchProxy = createFetchProxy(win);
      const _Worker = win.Worker;

      xhr.use((request: Request) => server.handleRequest(request));
      fetchProxy.use((request: Request) => server.handleRequest(request));
      Object.assign(win, {
        io: io,
        XMLHttpRequest: xhr,
        fetch: fetchProxy,
        Worker: function (url: string, options?: WorkerOptions) {
          const u = new URL(url, location.origin);
          return new _Worker(
            u.href.replace(u.origin, location.origin),
            options
          );
        },
      });
    };

    const createEditor = () => {
      const doc = server.getDocument();
      const user = server.getUser();
      const documentType = getDocumentType(doc.fileType);

      server.setClient({
        buildVersion: window.DocsAPI!.DocEditor.version(),
      });

      editor = new window.DocsAPI!.DocEditor("placeholder", {
        document: {
          fileType: doc.fileType,
          key: doc.key,
          title: doc.title,
          url: doc.url,
          permissions: {
            edit: doc.fileType !== "pdf",
            chat: false,
            rename: true,
            protect: true,
            review: false,
            print: true,
          },
        },
        documentType: documentType,
        editorConfig: {
          lang: lang,
          coEditing: {
            mode: "fast",
            change: false,
          },
          user: {
            ...user,
          },
          customization: {
            uiTheme: uiTheme,
            features: {
              spellcheck: {
                change: false,
              },
            },
            logo: {
              image: location.origin + "/logo-name_black.svg",
              imageDark: location.origin + "/logo-name_white.svg",
              url: location.origin,
            },
          },
        },
        events: {
          onAppReady: async () => {
            onAppReady();
          },
          onDocumentStateChange: (e: { data: boolean }) => {
            if (e.data) {
              isDirty.current = true;
            }
          },
          onSaveDocument: () => {
            isDirty.current = false;
          },
          onSave: () => {
            isDirty.current = false;
          },
        },
        type: "desktop",
        width: "100%",
        height: "100%",
      });
      Object.assign(window, { editor });
      return editor;
    };

    const loadEditor = () => {
      if (window.DocsAPI && window.DocsAPI.DocEditor) {
        createEditor();
        return;
      }
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${apiUrl}"]`
      );
      if (!script) {
        script = document.createElement("script");
        script.src = apiUrl;
        document.head.appendChild(script);
      }
      script.onload = () => {
        createEditor();
      };
      script.onerror = (e) => {
        console.error("Failed to load DocsAPI script", e);
        toast.error("加载文档内核失败，请刷新重试");
      };
    };

    const init = async () => {
      // 1. 从云端 R2 打开已有在线文档
      if (paramDocId) {
        try {
          setDocId(paramDocId);
          // 获取文档信息
          const metaRes = await fetchDocumentsAndCategories();
          const currentMeta = metaRes.documents.find((d) => d.id === paramDocId);
          const name = currentMeta ? currentMeta.name : "在线文档";
          const type = (currentMeta ? currentMeta.type : "docx") as DocumentType;
          setDocTitle(name);
          setDocType(type);

          // 如果是 Markdown 文档：直接以 UTF-8 文本载入 Markdown 工作台，无需加载庞大的 OnlyOffice
          if (type === "md") {
            setIsMdLoading(true);
            const blob = await getDocumentContentBlob(paramDocId);
            const text = await blob.text();
            setMarkdownContent(text);
            markdownContentRef.current = text;
            setIsMdLoading(false);
            return;
          }

          // 其他 Office 格式：通过 OnlyOffice 内存引擎打开
          const blob = await getDocumentContentBlob(paramDocId);
          const arrayBuffer = await blob.arrayBuffer();
          await server.openBuffer(arrayBuffer, name, type);
        } catch (err) {
          toast.error(t({ id: "LoadDocFailed", message: "Failed to load document: " }) + String(err));
        }
      } else if (newDoc) {
        // 2. 新建文档
        const ft = newDoc as DocumentType;
        setDocType(ft);

        const untitledPrefix = t({ id: "UntitledDocument", message: "Untitled Document" });
        if (ft === "md") {
          const defaultMd = "# Markdown\n\nStart writing your document here...\n\n- Supports GFM syntax\n- Press **Ctrl+S** to save to R2 cloud\n- Supports tables, task lists, and code highlighting\n";
          setDocTitle(`${untitledPrefix}.md`);
          setMarkdownContent(defaultMd);
          markdownContentRef.current = defaultMd;
          return;
        }

        setDocTitle(`${untitledPrefix}.${ft}`);
        server.openNew(ft);
      }

      loadEditor();
    };

    init();

    return () => {
      MockSocket.off("connect", server.handleConnect);
      MockSocket.off("disconnect", server.handleDisconnect);
      editor?.destroyEditor?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // 确认首次保存新建文档
  const handleConfirmFirstSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingBufferRef.current) return;
    const cleanName = inputName.trim();
    if (!cleanName) return;

    const finalDocType = docType;
    const fullFileName = cleanName.endsWith("." + finalDocType)
      ? cleanName
      : `${cleanName}.${finalDocType}`;

    try {
      setIsSaving(true);
      const saveBuffer = pendingBufferRef.current;
      const blob = new Blob([saveBuffer as Uint8Array<ArrayBuffer>]);
      const newDoc = await saveNewDocument({
        file: blob,
        name: fullFileName,
        type: finalDocType,
        categoryId: selectedCatId,
      });

      activeDocIdRef.current = newDoc.id;
      setDocId(newDoc.id);
      setDocTitle(newDoc.name);
      setDocType(finalDocType);
      setSaveModalOpen(false);
      isDirty.current = false;

      // 静默修改当前浏览器 URL 为正式云端文档地址，不触发重刷
      window.history.replaceState(null, "", `/editor?docId=${newDoc.id}`);
      toast.success(t({ id: "SavedToR2Success", message: "Successfully saved to Cloudflare R2" }));
    } catch (err) {
      toast.error(t({ id: "FirstSaveFailed", message: "First save failed: " }) + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // 弹窗中即时新建子分类
  const handleCreateNewCategoryInModal = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      const cat = await createCategory(name, selectedCatId);
      setCategories((prev) => [...prev, cat]);
      setSelectedCatId(cat.id);
      setNewCatName("");
      setShowNewCatInput(false);
      toast.success(t({ id: "CategoryCreated", message: "Category created" }));
    } catch (err) {
      toast.error(t({ id: "CreateCategoryFailed", message: "Failed to create category: " }) + String(err));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
        {/* 顶部极简状态控制栏 */}
        <header className="h-12 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/documents")}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              title={t({ id: "BackToDocuments", message: "Back to Documents" })}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t({ id: "Documents", message: "Documents" })}</span>
            </button>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              {docType === "md" ? (
                <FileCode2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] md:max-w-md">
                {docTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t({ id: "R2Sync", message: "R2 Sync" })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={handleTriggerSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              title={t({ id: "SaveToCloud", message: "Save to Cloud (Ctrl+S)" })}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {isSaving
                  ? t({ id: "Saving", message: "Saving..." })
                  : t({ id: "SaveToCloud", message: "Save to Cloud (Ctrl+S)" })}
              </span>
            </button>

            <button
              onClick={handleTriggerDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border text-xs text-foreground font-medium rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title={t({ id: "DownloadToLocal", message: "Download to Local" })}
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden md:inline">{t({ id: "DownloadToLocal", message: "Download to Local" })}</span>
            </button>
          </div>
        </header>

        {/* 编辑器主体容器：如果为 md 则渲染现代化沉浸式 Markdown 工作台，否则渲染 OnlyOffice */}
        {docType === "md" ? (
          <div className="w-full h-[calc(100vh-48px)] relative overflow-hidden bg-background">
            {isMdLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">{t({ id: "LoadingCloudDoc", message: "Loading document from R2..." })}</span>
              </div>
            ) : (
              <MarkdownEditor
                initialContent={markdownContent}
                onChange={(val) => {
                  markdownContentRef.current = val;
                  isDirty.current = true;
                }}
                onSave={handleTriggerSave}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-48px)] relative overflow-hidden">
            <div id="placeholder" className="w-full h-full">
              <iframe
                className="w-0 h-0 hidden"
                src={APP_ROOT + PRELOAD_HTML}
              />
            </div>
          </div>
        )}

        {/* 首次保存归档选择弹窗 (支持树形选择与现场新建分类) */}
        {saveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {t({ id: "SaveToR2OnlineDoc", message: "Save to R2 Cloud Storage" })}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t({ id: "FirstSaveDesc", message: "Choose document name and category. Future Ctrl+S will auto-save silently." })}
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmFirstSave} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    {t({ id: "DocNameLabel", message: "Document Name" })}
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder={t({ id: "DocNamePlaceholderExample", message: "e.g., Annual Business Plan" })}
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
                        placeholder={t({ id: "CategoryNamePlaceholder", message: "Enter category name..." })}
                        className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewCategoryInModal}
                        className="px-2.5 py-1 bg-primary text-primary-foreground text-xs rounded-md font-medium cursor-pointer"
                      >
                        {t({ id: "Save", message: "Save" })}
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
                    onClick={() => {
                      setSaveModalOpen(false);
                      pendingBufferRef.current = null;
                    }}
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
        )}


        <Toaster position="top-center" richColors />
      </div>
  );
}

export default function EditorPage() {
  return (
    <AuthGuard>
      <EditorWorkspace />
    </AuthGuard>
  );
}
