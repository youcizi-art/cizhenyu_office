"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useExtracted } from "@/hooks/use-i18n";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// 模块级单例状态，确保跨页面跳转不丢失 beforeinstallprompt 实例
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const pwaListeners = new Set<() => void>();

function notifyPwaListeners() {
  pwaListeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPwaListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem("pwa_installed", "true");
    } catch {}
    notifyPwaListeners();
  });
}

/**
 * PWA 安装与强制更新状态管理 Hook
 */
export function usePwa() {
  const t = useExtracted();
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const checkInstallStatus = useCallback(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    let hasLocalRecord = false;
    try {
      hasLocalRecord = localStorage.getItem("pwa_installed") === "true";
    } catch {}

    const installed = isStandalone || hasLocalRecord;
    setIsInstalled(installed);
    setCanInstall(!installed && globalDeferredPrompt !== null);
  }, []);

  useEffect(() => {
    checkInstallStatus();

    const handleDisplayModeChange = () => checkInstallStatus();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener?.("change", handleDisplayModeChange);

    const listener = () => checkInstallStatus();
    pwaListeners.add(listener);

    return () => {
      mediaQuery.removeEventListener?.("change", handleDisplayModeChange);
      pwaListeners.delete(listener);
    };
  }, [checkInstallStatus]);

  // 触发安装桌面应用
  const installApp = useCallback(async () => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          try {
            localStorage.setItem("pwa_installed", "true");
          } catch {}
          toast.success(
            t({
              id: "PwaInstallSuccess",
              message: "Application installed to desktop successfully",
            })
          );
        }
        globalDeferredPrompt = null;
        notifyPwaListeners();
      } catch (err) {
        console.error("Install prompt error:", err);
      }
      return;
    }

    // 若浏览器不支持或未触发 beforeinstallprompt 事件，给予友好操作引导
    toast.info(
      t({
        id: "PwaInstallManualHint",
        message:
          "Please click the install icon in your browser address bar or use 'Add to Home Screen' in the browser menu.",
      }),
      { duration: 5000 }
    );
  }, [t]);

  // 执行类似 Ctrl + F5 的全量缓存清理与硬刷新更新
  const updateApp = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    toast.info(
      t({
        id: "UpdatingApp",
        message: "Updating application and performing a hard refresh...",
      })
    );

    try {
      // 1. 清理 CacheStorage 所有静态资源缓存
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }

      // 2. 通知 Service Worker 清理并激活
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update().catch(() => {});
          reg.active?.postMessage({ type: "CLEAR_CACHE" });
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch (e) {
      console.warn("Failed to clear PWA cache during update:", e);
    } finally {
      // 3. 带时间戳强制重新加载，绕过任何浏览器 HTTP 静态强缓存 (模拟 Ctrl + F5)
      setTimeout(() => {
        const targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set("_reload", String(Date.now()));
        window.location.replace(targetUrl.toString());
      }, 350);
    }
  }, [isUpdating, t]);

  return {
    isInstalled,
    canInstall,
    isUpdating,
    installApp,
    updateApp,
  };
}
