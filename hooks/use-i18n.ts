"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

export type MessageDescriptor = {
  id: string;
  message?: string;
  defaultMessage?: string;
};

/**
 * 健壮的多语言翻译 Hook
 * 1. 兼容标准字符串 key: t("SaveToCloud")
 * 2. 兼容对象语法: t({ id: "SaveToCloud", message: "Save to Cloud (Ctrl+S)" })
 * 3. 严格保证返回值 100% 为 string，绝不返回 object，彻底杜绝 Minified React error #31
 */
export function useI18n(namespace?: string) {
  const baseT = useTranslations(namespace);

  const t = useCallback(
    (
      keyOrDescriptor: string | MessageDescriptor,
      values?: Record<string, any>,
      formats?: any
    ): string => {
      // 1. 如果是普通字符串 key
      if (typeof keyOrDescriptor === "string") {
        try {
          const res = baseT(keyOrDescriptor, values, formats);
          if (typeof res === "string") return res;
          if (res && typeof res === "object") {
            return (res as any).message || (res as any).id || keyOrDescriptor;
          }
          return String(res ?? keyOrDescriptor);
        } catch {
          return keyOrDescriptor;
        }
      }

      // 2. 如果是对象 descriptor { id, message }
      if (keyOrDescriptor && typeof keyOrDescriptor === "object") {
        const id = keyOrDescriptor.id;
        const fallback =
          typeof keyOrDescriptor.message === "string"
            ? keyOrDescriptor.message
            : typeof keyOrDescriptor.defaultMessage === "string"
            ? keyOrDescriptor.defaultMessage
            : typeof id === "string"
            ? id
            : "";

        if (!id) return fallback;

        try {
          // 先尝试以 id 从多语言字典查找
          const translated = baseT(id, values, formats);
          if (typeof translated === "string") {
            return translated;
          }
          if (translated && typeof translated === "object") {
            return (translated as any).message || (translated as any).id || fallback;
          }
          return fallback;
        } catch {
          return fallback;
        }
      }

      return "";
    },
    [baseT]
  );

  return t;
}

/**
 * 别名导出，保持与现有代码中 useExtracted 语义完全无缝兼容
 */
export const useExtracted = useI18n;
