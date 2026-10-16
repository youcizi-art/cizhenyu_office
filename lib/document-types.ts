import {
  FileText,
  Sheet,
  Presentation,
  FileType2,
  FileCode2,
  Image as ImageIcon,
  Video,
  Music,
  File,
  LucideIcon,
} from "lucide-react";
import { DocumentType } from "./api";

export interface DocumentTypeConfig {
  type: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  hoverBorderColor: string;
  lightBgColor: string;
}

export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  docx: {
    type: "docx",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    hoverBgColor: "group-hover:bg-blue-600",
    hoverBorderColor: "hover:border-blue-300 dark:hover:border-blue-700",
    lightBgColor: "bg-blue-100 dark:bg-blue-900/40",
  },
  doc: {
    type: "doc",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    hoverBgColor: "group-hover:bg-blue-600",
    hoverBorderColor: "hover:border-blue-300 dark:hover:border-blue-700",
    lightBgColor: "bg-blue-100 dark:bg-blue-900/40",
  },
  xlsx: {
    type: "xlsx",
    icon: Sheet,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    hoverBgColor: "group-hover:bg-green-600",
    hoverBorderColor: "hover:border-green-300 dark:hover:border-green-700",
    lightBgColor: "bg-green-100 dark:bg-green-900/40",
  },
  xls: {
    type: "xls",
    icon: Sheet,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    hoverBgColor: "group-hover:bg-green-600",
    hoverBorderColor: "hover:border-green-300 dark:hover:border-green-700",
    lightBgColor: "bg-green-100 dark:bg-green-900/40",
  },
  pptx: {
    type: "pptx",
    icon: Presentation,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    hoverBgColor: "group-hover:bg-orange-600",
    hoverBorderColor: "hover:border-orange-300 dark:hover:border-orange-700",
    lightBgColor: "bg-orange-100 dark:bg-orange-900/40",
  },
  ppt: {
    type: "ppt",
    icon: Presentation,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
    hoverBgColor: "group-hover:bg-orange-600",
    hoverBorderColor: "hover:border-orange-300 dark:hover:border-orange-700",
    lightBgColor: "bg-orange-100 dark:bg-orange-900/40",
  },
  pdf: {
    type: "pdf",
    icon: FileType2,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
    hoverBgColor: "group-hover:bg-red-600",
    hoverBorderColor: "hover:border-red-300 dark:hover:border-red-700",
    lightBgColor: "bg-red-100 dark:bg-red-900/40",
  },
  md: {
    type: "md",
    icon: FileCode2,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    hoverBgColor: "group-hover:bg-purple-600",
    hoverBorderColor: "hover:border-purple-300 dark:hover:border-purple-700",
    lightBgColor: "bg-purple-100 dark:bg-purple-900/40",
  },
  markdown: {
    type: "markdown",
    icon: FileCode2,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    hoverBgColor: "group-hover:bg-purple-600",
    hoverBorderColor: "hover:border-purple-300 dark:hover:border-purple-700",
    lightBgColor: "bg-purple-100 dark:bg-purple-900/40",
  },
  image: {
    type: "image",
    icon: ImageIcon,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/50",
    hoverBgColor: "group-hover:bg-sky-600",
    hoverBorderColor: "hover:border-sky-300 dark:hover:border-sky-700",
    lightBgColor: "bg-sky-100 dark:bg-sky-900/40",
  },
  video: {
    type: "video",
    icon: Video,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/50",
    hoverBgColor: "group-hover:bg-rose-600",
    hoverBorderColor: "hover:border-rose-300 dark:hover:border-rose-700",
    lightBgColor: "bg-rose-100 dark:bg-rose-900/40",
  },
  audio: {
    type: "audio",
    icon: Music,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    hoverBgColor: "group-hover:bg-amber-600",
    hoverBorderColor: "hover:border-amber-300 dark:hover:border-amber-700",
    lightBgColor: "bg-amber-100 dark:bg-amber-900/40",
  },
  other: {
    type: "other",
    icon: File,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    hoverBgColor: "group-hover:bg-slate-600",
    hoverBorderColor: "hover:border-slate-300 dark:hover:border-slate-700",
    lightBgColor: "bg-slate-100 dark:bg-slate-800/40",
  },
};

/**
 * 根据文件名智能推断 DocumentType
 */
export function detectFileType(fileName: string): DocumentType {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // 经典图片格式
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "apng", "bmp", "ico"].includes(ext)) {
    return "image";
  }
  // 经典视频格式
  if (["mp4", "webm", "mkv", "mov", "avi"].includes(ext)) {
    return "video";
  }
  // 经典音频格式
  if (["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext)) {
    return "audio";
  }
  // 文档格式
  if (["docx", "doc"].includes(ext)) return "docx";
  if (["xlsx", "xls"].includes(ext)) return "xlsx";
  if (["pptx", "ppt"].includes(ext)) return "pptx";
  if (ext === "pdf") return "pdf";
  if (["md", "markdown"].includes(ext)) return "md";

  return "other";
}

export function getDocConfig(type: string): DocumentTypeConfig {
  const normalizedType = type.toLowerCase().replace(".", "");
  return (
    DOCUMENT_TYPES[normalizedType] || {
      type: "other",
      icon: File,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-50 dark:bg-slate-900/50",
      hoverBgColor: "group-hover:bg-slate-600",
      hoverBorderColor: "hover:border-slate-300 dark:hover:border-slate-700",
      lightBgColor: "bg-slate-100 dark:bg-slate-800/40",
    }
  );
}
