import type { Metadata } from "next";
import { GoogleAnalytics } from '@next/third-parties/google'
import { getMessages } from "next-intl/server";
import { I18nProvider } from "@/components/i18n-provider";
import { ProgressProvider } from "@/components/progress-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://office.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CIZHENYU Office — 在线 Word, Excel & PowerPoint 编辑器",
    template: "%s",
  },
  description:
    "现代轻量在线 Office 套件。直接在浏览器中查看和编辑 Word、Excel 和 PowerPoint 文档，支持 Cloudflare R2 云端存储与安全分享。",
  keywords: [
    "web office",
    "online office suite",
    "Word online",
    "Excel online",
    "PowerPoint online",
    "DOCX viewer",
    "DOCX editor",
    "XLSX editor",
    "PPTX editor",
    "open docx online",
    "edit excel online",
    "serverless office",
    "privacy first",
    "CIZHENYU",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    siteName: "CIZHENYU Office",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "CIZHENYU Office",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  const preload = () => {
    const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || "";
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme == "dark" || (dark && theme != "light");
    document.documentElement.classList.toggle("dark", isDark);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CIZHENYU Office",
    url: siteUrl,
    description:
      "Open, view, and edit Word, Excel, and PowerPoint documents directly in your browser. No upload, no server — your files stay private.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Edit DOCX, XLSX, PPTX files",
      "No file upload required",
      "Privacy-first — files stay local",
      "Free templates",
      "Browser extension for drag & drop",
    ],
  };

  return (
    <html suppressHydrationWarning>
      <head>
        <script>{`(${preload.toString()})()`}</script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ProgressProvider>
          <I18nProvider initialMessages={messages}>{children}</I18nProvider>
        </ProgressProvider>
      </body>
      <GoogleAnalytics gaId="G-EFLBPT6TS8" />
    </html>
  );
}
