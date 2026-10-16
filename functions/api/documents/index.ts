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
 * 获取文档和分类列表 (GET) 或 首次保存新建文档 (POST)
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

  const metadata = await loadMetadata(env);
  return jsonResponse(metadata);
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
