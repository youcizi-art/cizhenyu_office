import { DocumentMeta, DocumentType, PagesContext } from "../../types";
import {
  jsonResponse,
  errorResponse,
  verifyAuth,
  loadMetadata,
  saveMetadata,
  generateId,
  getR2Bucket,
  getMimeType,
} from "../../utils";

/**
 * 获取文档和分类列表 (GET) - 支持服务端多维筛选与分页
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket not bound (DOCUMENTS_BUCKET)", 500);
  }

  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const typeFilter = url.searchParams.get("type") || "All";
  const categoryId = url.searchParams.get("categoryId") || null;
  const tag = url.searchParams.get("tag") || null;

  const metadata = await loadMetadata(env);
  const categories = metadata.categories || [];
  const rawDocs = metadata.documents || [];

  // 收集全量已有标签
  const tagSet = new Set<string>();
  rawDocs.forEach((d) => {
    d.tags?.forEach((t) => tagSet.add(t));
  });
  const allTags = Array.from(tagSet);

  // 分类层级关系辅助解析
  const getSubCategoryIds = (catId: string): string[] => {
    const ids = [catId];
    const children = categories.filter((c) => c.parentId === catId);
    for (const child of children) {
      ids.push(...getSubCategoryIds(child.id));
    }
    return ids;
  };

  // 1. 服务端真实多维度过滤
  const filtered = rawDocs.filter((doc) => {
    // 搜索过滤
    if (search && !doc.name.toLowerCase().includes(search)) {
      return false;
    }

    // 类型过滤
    if (typeFilter && typeFilter !== "All") {
      if (typeFilter === "Word" && doc.type !== "docx" && doc.type !== "doc") return false;
      if (typeFilter === "Excel" && doc.type !== "xlsx" && doc.type !== "xls") return false;
      if (typeFilter === "PowerPoint" && doc.type !== "pptx" && doc.type !== "ppt") return false;
      if (typeFilter === "PDF" && doc.type !== "pdf") return false;
      if (typeFilter === "Markdown" && doc.type !== "md") return false;
      if (typeFilter === "Image" && doc.type !== "image") return false;
      if (typeFilter === "Video" && doc.type !== "video") return false;
      if (typeFilter === "Audio" && doc.type !== "audio") return false;
      if (typeFilter === "Other" && doc.type !== "other") return false;
    }

    // 分类过滤
    if (categoryId === "__unclassified__") {
      if (doc.categoryId) return false;
    } else if (categoryId) {
      const allowedCatIds = getSubCategoryIds(categoryId);
      if (!doc.categoryId || !allowedCatIds.includes(doc.categoryId)) return false;
    }

    // 标签过滤
    if (tag) {
      if (!doc.tags || !doc.tags.includes(tag)) return false;
    }

    return true;
  });

  // 2. 服务端真实排序（置顶优先、自定义顺序、最后更新时间）
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      const timeA = a.pinnedAt || a.createdAt;
      const timeB = b.pinnedAt || b.createdAt;
      return timeB - timeA;
    }
    const orderA = typeof a.order === "number" ? a.order : 999999;
    const orderB = typeof b.order === "number" ? b.order : 999999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.updatedAt - a.updatedAt;
  });

  // 3. 服务端分页切片处理
  if (pageParam !== null || pageSizeParam !== null) {
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || "20", 10) || 20));
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedDocs = filtered.slice((page - 1) * pageSize, page * pageSize);

    return jsonResponse({
      categories,
      documents: paginatedDocs,
      allTags,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  }

  // 向后兼容未传分页参数的请求
  return jsonResponse({
    categories,
    documents: filtered,
    allTags,
    pagination: {
      page: 1,
      pageSize: filtered.length,
      total: filtered.length,
      totalPages: 1,
    },
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const isAuth = await verifyAuth(request, env);
  if (!isAuth) {
    return errorResponse("Unauthorized, please log in first", 401);
  }

  const bucket = getR2Bucket(env);
  if (!bucket) {
    return errorResponse("Cloudflare R2 Bucket not bound (DOCUMENTS_BUCKET)", 500);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | Blob | null;
    const name = ((formData.get("name") as string) || "").trim();
    const type = ((formData.get("type") as string) || "docx").toLowerCase() as DocumentType;
    const categoryId = (formData.get("categoryId") as string) || null;

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }
    if (!name) {
      return errorResponse("Document name cannot be empty", 400);
    }

    const docId = generateId();
    const fileExt = name.includes(".") ? name.split(".").pop()!.toLowerCase() : type;
    const r2Key = `files/${docId}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const size = arrayBuffer.byteLength;
    const now = Date.now();
    const contentType = (file as File).type || getMimeType(name);

    // 1. 上传文件二进制到 R2
    await bucket.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        docId,
        fileName: encodeURIComponent(name),
      },
    });

    // 2. 更新元数据索引
    const metadata = await loadMetadata(env);
    const newDoc: DocumentMeta = {
      id: docId,
      name,
      type,
      categoryId: categoryId === "" ? null : categoryId,
      r2Key,
      size,
      createdAt: now,
      updatedAt: now,
    };

    metadata.documents.unshift(newDoc);
    await saveMetadata(env, metadata);

    return jsonResponse({
      success: true,
      document: newDoc,
    });
  } catch (err) {
    return errorResponse("Failed to save document: " + String(err), 500);
  }
}
