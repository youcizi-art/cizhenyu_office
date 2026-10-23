"use client";

import Link from "next/link";
import { useExtracted } from "next-intl";
import { LayoutDashboard, Cloud, Settings, Info, History } from "lucide-react";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  pathname: string;
  className?: string;
}

export function MobileNav({ pathname, className }: MobileNavProps) {
  const t = useExtracted();
  const { isAdmin } = useEnterprise();

  const navItems = [
    {
      id: "dashboard",
      label: t({ id: "Enterprise.Sidebar.Dashboard", message: "Dashboard" }),
      icon: LayoutDashboard,
      href: "/",
    },
    {
      id: "documents",
      label: t({ id: "OnlineDocuments", message: "Online Documents" }),
      icon: Cloud,
      href: "/documents",
    },
    ...(isAdmin
      ? [
          {
            id: "audit-logs",
            label: t({ id: "Enterprise.Header.AuditLogs", message: "Audit Logs" }),
            icon: History,
            href: "/audit-logs",
          },
        ]
      : []),
    {
      id: "settings",
      label: t("Settings"),
      icon: Settings,
      href: "/settings",
    },
  ];

  return (
    <div
      className={cn(
        "flex items-center justify-around bg-card border-t border-border p-2 pb-safe",
        className,
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={cn(
              "flex items-center justify-center p-2 rounded-xl transition-colors min-w-[48px]",
              isActive
                ? "text-primary bg-primary/10"
                : "text-text-secondary hover:text-foreground active:bg-muted"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5",
                isActive ? "text-primary" : "text-text-secondary"
              )}
              strokeWidth={2}
            />
          </Link>
        );
      })}
      <Link
        href="/about"
        title={t("About")}
        aria-label={t("About")}
        className={cn(
          "flex items-center justify-center p-2 rounded-xl transition-colors min-w-[48px]",
          pathname === "/about"
            ? "text-primary bg-primary/10"
            : "text-text-secondary hover:text-foreground active:bg-muted",
        )}
      >
        <Info
          className={cn(
            "w-5 h-5",
            pathname === "/about" ? "text-primary" : "text-text-secondary",
          )}
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}
