"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 客户端全局 Service Worker 与 PWA 状态注册组件
 * 严格遵照业务规范：在分享（/share）等对外公开页面全面禁用 PWA 注册与安装提示
 */
export function PwaRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 判断是否处于对外公开分享页面
    const isPublicSharePage = pathname?.startsWith("/share");

    if (isPublicSharePage) {
      // 1. 彻底拦截并阻止浏览器弹出任何原生安装横幅或提示
      const suppressInstall = (e: Event) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      window.addEventListener("beforeinstallprompt", suppressInstall, true);

      // 2. 移除 DOM 中的 manifest link，防止 Chrome/Edge 地址栏显示“安装应用”图标
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.remove();
      }

      return () => {
        window.removeEventListener("beforeinstallprompt", suppressInstall, true);
      };
    }

    // 仅在非公开分享的主站与工作台应用中延迟注册 Service Worker
    if ("serviceWorker" in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.warn("ServiceWorker registration failed:", err);
          });
      };

      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad);
        return () => window.removeEventListener("load", handleLoad);
      }
    }
  }, [pathname]);

  return null;
}
