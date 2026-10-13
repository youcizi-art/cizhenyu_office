import type { Metadata } from "next";
import { OpenView } from "@/components/main/open-view";

export const metadata: Metadata = {
  title: "私有在线 Office 编辑器 — Word, Excel, PowerPoint | CIZHENYU",
  description:
    "直接在浏览器中安全高效地打开、查看与编辑 DOCX、XLSX、PPTX 文件，连接 Cloudflare R2 云端存储，支持在线文档管理与分享。",
};

export default function HomePage() {
  return <OpenView />;
}
