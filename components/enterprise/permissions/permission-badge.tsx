"use client";

import React from "react";
import { useExtracted } from "next-intl";
import { Crown, Shield, User, Eye, Edit3, MessageSquare } from "lucide-react";

interface RoleBadgeProps {
  role: "owner" | "admin" | "member" | "viewer" | string;
  size?: "sm" | "md";
}

/**
 * 企业组织角色标签
 */
export function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  const t = useExtracted();
  const isSm = size === "sm";

  switch (role) {
    case "owner":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Crown className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Role.Owner", message: "Owner" })}
        </span>
      );
    case "admin":
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Shield className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Role.Admin", message: "Admin" })}
        </span>
      );
    case "member":
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <User className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Role.Member", message: "Member" })}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Eye className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Role.Viewer", message: "Viewer" })}
        </span>
      );
  }
}

interface DocPermissionBadgeProps {
  permission: "owner" | "editor" | "commenter" | "viewer" | string;
  size?: "sm" | "md";
}

/**
 * 文档协作 ACL 权限标签
 */
export function DocPermissionBadge({ permission, size = "md" }: DocPermissionBadgeProps) {
  const t = useExtracted();
  const isSm = size === "sm";

  switch (permission) {
    case "owner":
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Crown className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Permission.Owner", message: "Owner" })}
        </span>
      );
    case "editor":
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Edit3 className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Permission.Editor", message: "Can Edit" })}
        </span>
      );
    case "commenter":
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <MessageSquare className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Permission.Commenter", message: "Can Comment" })}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 ${
            isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Eye className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {t({ id: "Enterprise.Permission.Viewer", message: "Can View" })}
        </span>
      );
  }
}
