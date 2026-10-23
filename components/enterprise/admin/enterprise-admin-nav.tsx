"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExtracted } from "next-intl";
import { Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function EnterpriseAdminNav() {
  const t = useExtracted();
  const pathname = usePathname();

  const isPermissions = pathname.startsWith("/permissions");
  const isMembers = pathname.startsWith("/members");

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/80 border border-border/60 self-start text-xs shadow-xs">
      <Link
        href="/permissions"
        className={cn(
          "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all",
          isPermissions
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        )}
      >
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span>{t({ id: "Enterprise.AdminNav.Permissions", message: "Role Groups & Rules" })}</span>
      </Link>

      <Link
        href="/members"
        className={cn(
          "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all",
          isMembers
            ? "bg-background text-foreground shadow-xs font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        )}
      >
        <Users className="w-3.5 h-3.5 text-blue-500" />
        <span>{t({ id: "Enterprise.AdminNav.Members", message: "Team Members & Users" })}</span>
      </Link>
    </div>
  );
}
