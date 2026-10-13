import type { Metadata } from "next";
import { DocumentsView } from "@/components/main/documents-view";

export const metadata: Metadata = {
  title: "在线文档库 — Cloudflare R2 云端存储 | CIZHENYU Office",
  description: "查看、管理与搜索您的在线 Office 文档，支持多级目录归类与公开外链免密下载分享。",
};

export default function DocumentsPage() {
  return <DocumentsView />;
}
