/**
 * Cloudflare Pages Functions 类型定义
 */

export interface R2ObjectMetadata {
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  writeHttpMetadata: (headers: Headers) => void;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
  blob: () => Promise<Blob>;
}

export interface R2Bucket {
  get: (key: string) => Promise<R2ObjectBody | null>;
  put: (
    key: string,
    value: ReadableStream | ArrayBuffer | string | Blob,
    options?: {
      httpMetadata?: Record<string, string>;
      customMetadata?: Record<string, string>;
    }
  ) => Promise<R2Object>;
  delete: (key: string | string[]) => Promise<void>;
  list: (options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }) => Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

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
  | "xls"
  | "pptx"
  | "ppt"
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

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MetadataIndex {
  categories: Category[];
  documents: DocumentMeta[];
}

export interface Env {
  DOCUMENTS_BUCKET?: R2Bucket;
  DOCUMENTS?: R2Bucket;
  PASSWORD?: string;
  ACCESS_KEY?: string;
  DB?: any; // Cloudflare D1 数据库绑定支持
}

export interface PagesContext<P extends string = string> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Record<string, unknown>;
}
