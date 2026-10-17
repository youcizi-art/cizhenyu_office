"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { useEffect, useState, ReactNode } from "react";
import { useResolvedLanguage } from "@/store";
import { Locale } from "@ziziyi/utils";
import { getTimeZone } from "@/i18n/config";

// Cache for loaded messages
const messagesCache: Partial<Record<Locale, AbstractIntlMessages>> = {};
let cachedEnMessages: AbstractIntlMessages | null = null;

async function getEnMessages(): Promise<AbstractIntlMessages> {
  if (cachedEnMessages) return cachedEnMessages;
  try {
    const en = (await import("@/messages/en.json")).default;
    cachedEnMessages = en;
    return en;
  } catch {
    return {};
  }
}

// Load messages for a locale (with seamless fallback to English for any missing keys)
async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
  if (messagesCache[locale]) {
    return messagesCache[locale]!;
  }

  const enMessages = await getEnMessages();
  if (locale === Locale.EN) {
    messagesCache[locale] = enMessages;
    return enMessages;
  }

  try {
    const currentMessages = (await import(`@/messages/${locale}.json`)).default;
    // 关键：将当前语言与英文默认字典浅层合并，确保任何未翻译或新哈希 key 都能完美回退到英文，绝不报 MISSING_MESSAGE
    const merged = { ...enMessages, ...currentMessages };
    messagesCache[locale] = merged;
    return merged;
  } catch {
    console.warn(`Messages for locale "${locale}" not found, falling back to English`);
    messagesCache[locale] = enMessages;
    return enMessages;
  }
}

interface I18nProviderProps {
  children: ReactNode;
  initialMessages: AbstractIntlMessages;
}

/**
 * Client-side i18n provider that switches language based on store setting.
 * Dynamically loads message files when language changes.
 */
export function I18nProvider({ children, initialMessages }: I18nProviderProps) {
  const locale = useResolvedLanguage();
  const [messages, setMessages] =
    useState<AbstractIntlMessages>(initialMessages);
  const [currentLocale, setCurrentLocale] = useState<Locale>(Locale.EN);

  useEffect(() => {
    // Load messages when locale changes
    loadMessages(locale).then((loadedMessages) => {
      setMessages(loadedMessages);
      setCurrentLocale(locale);
    });
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={currentLocale}
      messages={messages}
      timeZone={getTimeZone(currentLocale)}
      onError={(error) => {
        // 忽略 MISSING_MESSAGE 噪音，生产环境自动使用 key/fallback 渲染
        if (error.code !== "MISSING_MESSAGE") {
          console.error(error);
        }
      }}
      getMessageFallback={({ key }) => key}
    >
      {children}
    </NextIntlClientProvider>
  );
}
