"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Info,
  Settings,
  Cloud,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useExtracted } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { getNewUrl } from "@/utils/editor/utils";
import { getDocConfig } from "@/lib/document-types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  pathname: string;
}

export function Sidebar({ pathname }: SidebarProps) {
  const t = useExtracted();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("office_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("office_sidebar_collapsed", String(next));
    } catch {
      // ignore storage error
    }
  };

  const newDocTypes = [
    {
      type: "docx",
      label: t({ id: "Document", message: "Document" }),
    },
    {
      type: "xlsx",
      label: t({ id: "Spreadsheet", message: "Spreadsheet" }),
    },
    {
      type: "pptx",
      label: t({ id: "Presentation", message: "Presentation" }),
    },
    { type: "pdf", label: t({ id: "PDF", message: "PDF" }) },
    { type: "md", label: "Markdown" },
  ];

  const sidebarItems = [
    { id: "open", label: t("Open"), icon: FolderOpen, href: "/" },
    {
      id: "documents",
      label: t({ id: "OnlineDocuments", message: "Online Documents" }),
      icon: Cloud,
      href: "/documents",
    },
  ];

  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-16" : "w-56",
      )}
    >
      <div className="h-4" />

      {/* New Document Button with Popover */}
      <div className={cn("mb-2 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <Popover>
          {isCollapsed ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    aria-label={t("New")}
                    className="w-10 h-10 mx-auto flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("New")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">
                <Plus className="w-5 h-5" />
                {t("New")}
              </button>
            </PopoverTrigger>
          )}

          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-56 p-2 bg-popover border-border shadow-xl rounded-xl"
          >
            <div className="space-y-1.5">
              {newDocTypes.map(({ type, label }) => {
                const doc = getDocConfig(type);
                const Icon = doc.icon;
                return (
                  <Link
                    key={type}
                    href={getNewUrl(type)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      doc.bgColor,
                      "dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/5",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        doc.color,
                        "dark:text-primary dark:filter dark:brightness-125",
                      )}
                    />
                    <span className="text-sm font-medium text-foreground dark:text-slate-200">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation items */}
      <nav className={cn("flex-1 py-2 space-y-1 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} delayDuration={200}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5",
                        isActive ? "text-primary" : "text-text-secondary",
                      )}
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-sidebar-hover hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isActive ? "text-primary" : "text-text-secondary",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions: Settings, About & Collapse Toggle */}
      <div className={cn("py-3 space-y-1 border-t border-border/40 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        {isCollapsed ? (
          <>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all",
                    pathname === "/settings"
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-foreground hover:bg-sidebar-hover",
                  )}
                >
                  <Settings
                    className={cn(
                      "w-5 h-5",
                      pathname === "/settings" ? "text-primary" : "text-text-secondary",
                    )}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("Settings")}
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Link
                  href="/about"
                  className={cn(
                    "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all",
                    pathname === "/about"
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-foreground hover:bg-sidebar-hover",
                  )}
                >
                  <Info
                    className={cn(
                      "w-5 h-5",
                      pathname === "/about" ? "text-primary" : "text-text-secondary",
                    )}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("About")}
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapsed}
                  className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-text-secondary hover:text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
                  title={t({ id: "ExpandSidebar", message: "Expand Sidebar" })}
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t({ id: "ExpandSidebar", message: "Expand Sidebar" })}
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Link
              href="/settings"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg",
                pathname === "/settings"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-secondary hover:text-foreground hover:bg-sidebar-hover",
              )}
            >
              <Settings
                className={cn(
                  "w-5 h-5 shrink-0",
                  pathname === "/settings" ? "text-primary" : "text-text-secondary",
                )}
              />
              <span className="truncate">{t("Settings")}</span>
            </Link>

            <Link
              href="/about"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg",
                pathname === "/about"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-secondary hover:text-foreground hover:bg-sidebar-hover",
              )}
            >
              <Info
                className={cn(
                  "w-5 h-5 shrink-0",
                  pathname === "/about" ? "text-primary" : "text-text-secondary",
                )}
              />
              <span className="truncate">{t("About")}</span>
            </Link>

            <button
              onClick={toggleCollapsed}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-foreground hover:bg-sidebar-hover rounded-lg transition-colors cursor-pointer"
              title={t({ id: "CollapseSidebar", message: "Collapse Sidebar" })}
            >
              <PanelLeftClose className="w-5 h-5 shrink-0" />
              <span className="truncate">{t({ id: "CollapseSidebar", message: "Collapse Sidebar" })}</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
