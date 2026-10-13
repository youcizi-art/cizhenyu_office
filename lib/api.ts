/**
 * 客户端 API 交互封装库
 */

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export type DocumentType = "docx" | "xlsx" | "pptx" | "pdf";

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
}

export interface MetadataResponse {
  categories: Category[];
  documents: DocumentMeta[];
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
      return { authenticated: false, requiresPassword: true };
    }
    return await res.json();
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
      return { success: false, error: data.error || "登录失败" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: "网络请求异常: " + String(err) };
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
 * 获取所有文档与分类
 */
export async function fetchDocumentsAndCategories(): Promise<MetadataResponse> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "获取文档列表失败");
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

  const res = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "保存文档失败");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 更新已有在线文档内容
 */
export async function updateDocumentContent(
  docId: string,
  buffer: ArrayBuffer
): Promise<DocumentMeta> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "更新文档失败");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 获取在线文档二进制内容 (用于编辑器加载)
 */
export async function getDocumentContentBlob(docId: string): Promise<Blob> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/content`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("加载文档实体失败");
  }
  return res.blob();
}

/**
 * 删除文档
 */
export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "删除文档失败");
  }
}

/**
 * 修改文档元数据 (重命名 / 移动分类)
 */
export async function updateDocumentMeta(
  docId: string,
  updates: { name?: string; categoryId?: string | null }
): Promise<DocumentMeta> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/meta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "修改文档信息失败");
  }

  const data = await res.json();
  return data.document;
}

/**
 * 创建新分类
 */
export async function createCategory(
  name: string,
  parentId?: string | null
): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId: parentId || null }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "创建分类失败");
  }

  const data = await res.json();
  return data.category;
}

/**
 * 重命名分类
 */
export async function updateCategory(id: string, name: string): Promise<Category> {
  const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "更新分类失败");
  }

  const data = await res.json();
  return data.category;
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<string[]> {
  const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "删除分类失败");
  }

  const data = await res.json();
  return data.deletedCategoryIds;
}

/**
 * 开启或刷新分享
 */
export async function enableShare(docId: string): Promise<string> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/share`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "开启分享失败");
  }

  const data = await res.json();
  return data.shareToken;
}

/**
 * 关闭分享
 */
export async function disableShare(docId: string): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/share`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "关闭分享失败");
  }
}

/**
 * 公开获取分享文档信息
 */
export async function getShareInfo(token: string): Promise<{
  name: string;
  type: DocumentType;
  size: number;
  updatedAt: number;
}> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/info`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "获取分享信息失败");
  }

  return res.json();
}

/**
 * 获取公开分享下载地址
 */
export function getShareDownloadUrl(token: string): string {
  return `/api/share/${encodeURIComponent(token)}/download`;
}
