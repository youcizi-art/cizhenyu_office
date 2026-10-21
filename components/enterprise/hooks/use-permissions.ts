"use client";

import { useMemo } from "react";
import { defineAbility, MongoAbility } from "@casl/ability";
import { EnterpriseUser } from "@/lib/enterprise-api";

export type AppActions =
  | "manage"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "comment"
  | "lock"
  | "download"
  | "share";

export type AppSubjects = "Document" | "Member" | "Organization" | "AuditLog" | "all";
export type AppAbility = MongoAbility<[AppActions, AppSubjects]>;

/**
 * 根据企业用户角色构建 CASL Ability 规则引擎
 */
export function buildAbilityForUser(user: EnterpriseUser | null): AppAbility {
  return defineAbility<AppAbility>((can, cannot) => {
    if (!user) {
      cannot("manage", "all");
      return;
    }

    if (user.role === "owner") {
      can("manage", "all");
      return;
    }

    if (user.role === "admin") {
      can("manage", "all");
      cannot("delete", "Organization");
      return;
    }

    if (user.role === "member") {
      can("create", "Document");
      can("read", "Document");
      can("update", "Document");
      can("comment", "Document");
      can("lock", "Document");
      can("download", "Document");
      can("share", "Document");
      can("read", "Member");
      cannot("manage", "Organization");
      cannot("delete", "Member");
      return;
    }

    if (user.role === "viewer") {
      can("read", "Document");
      can("comment", "Document");
      cannot("update", "Document");
      cannot("delete", "Document");
      cannot("create", "Document");
      cannot("lock", "Document");
      cannot("download", "Document"); // 防泄密核心：访客禁止下载原文件
      cannot("share", "Document"); // 访客禁止对外分享
      can("read", "Member");
      return;
    }
  });
}

/**
 * 权限判定自定义 Hook
 */
export function usePermissions(user: EnterpriseUser | null) {
  const ability = useMemo(() => buildAbilityForUser(user), [user]);

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin" || isOwner;
  const canManageMembers = isAdmin;

  const canEditDocument = (docPermission?: string | null) => {
    if (isAdmin) return true;
    return docPermission === "owner" || docPermission === "editor";
  };

  const canCommentDocument = (docPermission?: string | null) => {
    if (isAdmin) return true;
    return docPermission === "owner" || docPermission === "editor" || docPermission === "commenter";
  };

  const canDownloadDocument = () => {
    return ability.can("download", "Document");
  };

  const canShareDocument = () => {
    return ability.can("share", "Document");
  };

  return {
    ability,
    can: ability.can.bind(ability),
    cannot: ability.cannot.bind(ability),
    isOwner,
    isAdmin,
    canManageMembers,
    canEditDocument,
    canCommentDocument,
    canDownloadDocument,
    canShareDocument,
  };
}
