import type { Metadata } from "next";
import { AboutView } from "@/components/main/about-view";

export const metadata: Metadata = {
  title: "关于 — CIZHENYU Office",
  description:
    "CIZHENYU Office 是一款现代化、高性能的在线 Office 套件，集成 Cloudflare R2 云端存储与安全外链分享。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AboutPage() {
  return <AboutView />;
}
