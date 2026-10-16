/**
 * 客户端 API 交互封装库
 */

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export type DocumentType =
  | "docx"
  | "doc"
  | "xlsx"
  | "pptx"
  | "pdf"
  | "md"
  | "image"
  | "video"
  | "audio"
  | "other";

export interface DocumentMeta {
  id: string;
  name: string;
  type: DocumentType;
  categoryId: string | null;
  r2Key: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  shareToken?: string;
  sharePassword?: string;
  shareMode?: "download" | "preview";
  pinned?: boolean;
  pinnedAt?: number;
  tags?: string[];
  order?: number;
}

export interface MetadataResponse {
  categories: Category[];
  documents: DocumentMeta[];
}

/**
 * 处理未授权响应 (401)，触发全局重新登录弹窗
 */
function handleUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
}

/**
 * 校验登录状态
 */
export async function checkAuth(): Promise<{
  authenticated: boolean;
  requiresPassword: boolean;
}> {
  try {
    const res = await fetch("/api/auth/check", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      return { authenticated: false, requiresPassword: true };
    }
    const data = await res.json();
    return data;
  } catch {
    return { authenticated: false, requiresPassword: true };
  }
}

/**
 * 密钥登录
 */
export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Login failed" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: "Network request error: " + String(err) };
  }
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error("Logout error", e);
  }
}

/**
 * 内部 API 请求辅助函数，自动拦截 401 触发未登录弹窗
 */
async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    handleUnauthorized();
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Unauthorized access or session expired. Please log in again.");
  }
  return res;
}

/**
 * 获取所有文档与分类
 */
export async function fetchDocumentsAndCategories(): Promise<MetadataResponse> {
  const res = await fetchWithAuth("/api/documents", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch documents");
  }
  return res.json();
}

/**
 * 首次保存新建文档
 */
export async function saveNewDocument(params: {
  file: Blob;
  name: string;
  type: DocumentType;
  categoryId: string | null;
}): Promise<DocumentMeta> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("name", params.name);
  formData.append("type", params.type);
  if (params.categoryId) {
    formData.append("categoryId", params.categoryId);
  }

  const res = await fetchWithAuth("/api/documents", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save document");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 更新已有在线文档内容
 */
export async function updateDocumentContent(
  docId: string,
  buffer: ArrayBuffer,
  newName?: string
): Promise<DocumentMeta> {
  const query = newName ? `?name=${encodeURIComponent(newName)}` : "";
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}${query}`, {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update document");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 获取在线文档二进制内容 (用于编辑器加载)
 */
export async function getDocumentContentBlob(docId: string): Promise<Blob> {
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}/content`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load document content");
  }
  return res.blob();
}

/**
 * 删除文档
 */
export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete document");
  }
}

/**
 * 修改文档元数据 (重命名 / 移动分类 / 标签 / 置顶 / 排序权重)
 */
export async function updateDocumentMeta(
  docId: string,
  updates: {
    name?: string;
    categoryId?: string | null;
    tags?: string[];
    pinned?: boolean;
    pinnedAt?: number;
    order?: number;
  }
): Promise<DocumentMeta> {
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}/meta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update document metadata");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 批量保存文档排序
 */
export async function reorderDocuments(orderedDocIds: string[]): Promise<void> {
  const res = await fetchWithAuth("/api/documents/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedDocIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save document order");
  }
}

/**
 * 创建新分类
 */
export async function createCategory(
  name: string,
  parentId?: string | null
): Promise<Category> {
  const res = await fetchWithAuth("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId: parentId || null }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create category");
  }

  const data = await res.json();
  return data.category;
}

/**
 * 重命名分类
 */
export async function updateCategory(id: string, name: string): Promise<Category> {
  const res = await fetchWithAuth(`/api/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update category");
  }

  const data = await res.json();
  return data.category;
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<string[]> {
  const res = await fetchWithAuth(`/api/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete category");
  }

  const data = await res.json();
  return data.deletedCategoryIds;
}

/**
 * 开启或刷新分享链接 (支持设置可选提取密钥与展示/下载模式)
 */
export async function enableShare(
  docId: string,
  sharePassword?: string,
  shareMode?: "download" | "preview"
): Promise<{ shareToken: string; sharePassword?: string; shareMode?: "download" | "preview" }> {
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharePassword, shareMode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to enable sharing");
  }

  const data = await res.json();
  return {
    shareToken: data.shareToken,
    sharePassword: data.document?.sharePassword,
    shareMode: data.document?.shareMode,
  };
}

/**
 * 关闭分享
 */
export async function disableShare(docId: string): Promise<void> {
  const res = await fetchWithAuth(`/api/documents/${encodeURIComponent(docId)}/share`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to disable sharing");
  }
}

/**
 * 公开获取分享文档信息 (无需登录，受保护时返回 requiresPassword: true)
 */
export async function getShareInfo(token: string): Promise<{
  name: string;
  type: DocumentType;
  size: number;
  updatedAt: number;
  requiresPassword?: boolean;
  shareMode?: "download" | "preview";
}> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/info`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch share info");
  }

  return res.json();
}

/**
 * 获取公开分享下载或内联预览地址 (支持提取密钥与内联模式)
 */
export function getShareDownloadUrl(token: string, passcode?: string, inline?: boolean): string {
  const base = `/api/share/${encodeURIComponent(token)}/download`;
  const params = new URLSearchParams();
  if (passcode) params.set("key", passcode);
  if (inline) params.set("inline", "true");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * 获取 Markdown 纯文本公开分享内容 (支持提取密钥)
 */
export async function getShareContent(token: string, passcode?: string): Promise<string> {
  const base = `/api/share/${encodeURIComponent(token)}/content`;
  const url = passcode ? `${base}?key=${encodeURIComponent(passcode)}` : base;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch share content");
  }
  return res.text();
}

