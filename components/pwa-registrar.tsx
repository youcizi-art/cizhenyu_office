"use client";

import { useEffect } from "react";

/**
 * 客户端全局 Service Worker 注册组件
 */
export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 延迟注册，避免与页面首屏核心资源加载争抢主线程带宽
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.warn("ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
