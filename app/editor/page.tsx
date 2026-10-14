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
import { convertPdfToDocx } from "@/utils/editor/pdf-converter";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { Toaster } from "@/components/ui/sonner";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

function EditorWorkspace() {
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

  // 首次保存归类弹窗状态
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [inputName, setInputName] = useState<string>("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState<string>("");
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);
  const pendingBufferRef = useRef<Uint8Array | null>(null);

  // PDF 转为 Word (docx) 并打开深度编辑
  const handleConvertToWord = async () => {
    if (isConverting) return;
    const currentDocId = activeDocIdRef.current || docId;
    setIsConverting(true);
    const toastId = toast.loading("正在转换 PDF 为 Word 可编辑文档，请稍候...");
    try {
      let arrayBuffer: ArrayBuffer;
      let targetCategoryId: string | null = null;
      if (currentDocId) {
        const blob = await getDocumentContentBlob(currentDocId);
        arrayBuffer = await blob.arrayBuffer();
        try {
          const metaRes = await fetchDocumentsAndCategories();
          const currentDoc = metaRes.documents.find((d) => d.id === currentDocId);
          if (currentDoc) {
            targetCategoryId = currentDoc.categoryId;
          }
        } catch {}
      } else {
        const doc = server.getDocument();
        const res = await fetch(doc.url);
        arrayBuffer = await res.arrayBuffer();
      }

      const docxBuffer = await convertPdfToDocx(arrayBuffer);
      const baseName = docTitle.replace(/\.pdf$/i, "");
      const newDocName = `${baseName} (Word).docx`;
      const docxBlob = new Blob([docxBuffer.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const newDoc = await saveNewDocument({
        file: docxBlob,
        name: newDocName,
        type: "docx",
        categoryId: targetCategoryId,
      });

      toast.success("转换成功，正在打开 Word 编辑器...", { id: toastId });
      // 替换当前页面地址进入新创建的 docx 编辑器
      router.push(`/editor?docId=${encodeURIComponent(newDoc.id)}`);
      // 稍后刷新页面以加载全新文档
      setTimeout(() => {
        window.location.href = `/editor?docId=${encodeURIComponent(newDoc.id)}`;
      }, 100);
    } catch (err) {
      toast.error("转换失败: " + (err instanceof Error ? err.message : String(err)), { id: toastId });
    } finally {
      setIsConverting(false);
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
  }, []);

  // 页面关闭前检查未保存修改
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

  // 触发保存
  const handleTriggerSave = () => {
    if (window.editor?.downloadAs) {
      setIsSaving(true);
      window.editor.downloadAs();
    } else {
      toast.info("编辑器仍在加载中，请稍候...");
    }
  };

  // 触发本地文件导出
  const handleTriggerDownload = () => {
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

          // 获取文档内容二进制流
          const blob = await getDocumentContentBlob(paramDocId);
          const arrayBuffer = await blob.arrayBuffer();
          await server.openBuffer(arrayBuffer, name, type);
        } catch (err) {
          toast.error("加载云端文档失败: " + String(err));
        }
      } else if (newDoc) {
        // 2. 新建文档
        const ft = newDoc as DocumentType;
        setDocType(ft);
        setDocTitle("未命名文档." + ft);
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

    // 确保有后缀
    const fullFileName = cleanName.endsWith("." + docType)
      ? cleanName
      : `${cleanName}.${docType}`;

    try {
      setIsSaving(true);
      const blob = new Blob([pendingBufferRef.current as Uint8Array<ArrayBuffer>]);
      const newDoc = await saveNewDocument({
        file: blob,
        name: fullFileName,
        type: docType,
        categoryId: selectedCatId,
      });

      activeDocIdRef.current = newDoc.id;
      setDocId(newDoc.id);
      setDocTitle(newDoc.name);
      setSaveModalOpen(false);
      isDirty.current = false;

      // 静默修改当前浏览器 URL 为正式云端文档地址，不触发重刷
      window.history.replaceState(null, "", `/editor?docId=${newDoc.id}`);
      toast.success("已成功归档并保存到 Cloudflare R2");
    } catch (err) {
      toast.error("首次保存失败: " + String(err));
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
      toast.success("分类已创建");
    } catch (err) {
      toast.error("创建分类失败: " + String(err));
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
              title="返回在线文档库"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>文档库</span>
            </button>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] md:max-w-md">
                {docTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                R2 同步
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(docType === "pdf" || docTitle.toLowerCase().endsWith(".pdf")) && (
              <button
                onClick={handleConvertToWord}
                disabled={isConverting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="将此 PDF 转换为 Word 文档进行像 Word 一样的文字编辑与排版"
              >
                {isConverting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileEdit className="w-3.5 h-3.5" />
                )}
                <span>{isConverting ? "转换中..." : "转为 Word 深度编辑"}</span>
              </button>
            )}

            <button
              onClick={handleTriggerSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
              title="保存文档 (Ctrl + S)"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? "保存中..." : "保存到云端 (Ctrl+S)"}</span>
            </button>

            <button
              onClick={handleTriggerDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-border text-xs text-foreground font-medium rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="导出下载到本地磁盘"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden md:inline">下载到本地</span>
            </button>
          </div>
        </header>

        {/* OnlyOffice 编辑器挂载容器 */}
        <div className="w-full h-[calc(100vh-48px)] relative overflow-hidden">
          <div id="placeholder" className="w-full h-full">
            <iframe
              className="w-0 h-0 hidden"
              src={APP_ROOT + PRELOAD_HTML}
            />
          </div>
        </div>

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
                    保存到 R2 在线文档
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    首次保存请指定文档名称与归属目录，后续按 Ctrl+S 将自动静默覆盖
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmFirstSave} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    文档名称
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="例如：2026年度业务规划"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      保存目录 / 分类 (多级)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(!showNewCatInput)}
                      className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      新建分类
                    </button>
                  </div>

                  {showNewCatInput && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted/60 border border-border">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="输入新分类名称..."
                        className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewCategoryInModal}
                        className="px-2.5 py-1 bg-primary text-primary-foreground text-xs rounded-md font-medium cursor-pointer"
                      >
                        创建
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
                      <span>📁 根目录 (未分类)</span>
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
                    取消
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
                    <span>确认保存到云端</span>
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
