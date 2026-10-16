"use client";

import React, { useState } from "react";
import { Globe, Check } from "lucide-react";
import { useAppStore, useResolvedLanguage } from "@/store";
import { LocaleName, Language } from "@ziziyi/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// 常见支持的语言列表，优先展示主流语种
const SUPPORTED_LANGS: { code: Language; label: string }[] = [
  { code: "en" as Language, label: "English" },
  { code: "zh-CN" as Language, label: "简体中文" },
  { code: "zh-TW" as Language, label: "繁體中文" },
  { code: "ja" as Language, label: "日本語" },
  { code: "ko" as Language, label: "한국어" },
  { code: "es" as Language, label: "Español" },
  { code: "de" as Language, label: "Deutsch" },
  { code: "fr" as Language, label: "Français" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const currentLocale = useResolvedLanguage();
  const { setState } = useAppStore();
  const [open, setOpen] = useState(false);

  const handleSelect = (langCode: Language) => {
    setState({ language: langCode });
    setOpen(false);
  };

  const currentLabel =
    SUPPORTED_LANGS.find((l) => l.code === currentLocale)?.label ||
    LocaleName[currentLocale as keyof typeof LocaleName] ||
    "English";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer backdrop-blur-xs shadow-2xs",
            className
          )}
          aria-label="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">{currentLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1 rounded-xl text-xs space-y-0.5">
        {SUPPORTED_LANGS.map((lang) => {
          const isSelected = currentLocale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                isSelected
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <span>{lang.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
