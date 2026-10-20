"use client";

import { useMemo } from "react";
import { defineAbility, MongoAbility } from "@casl/ability";
import { EnterpriseUser } from "@/lib/enterprise-api";

export type AppActions = "manage" | "create" | "read" | "update" | "delete" | "comment" | "lock";
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

  return {
    ability,
    can: ability.can.bind(ability),
    cannot: ability.cannot.bind(ability),
    isOwner,
    isAdmin,
    canManageMembers,
    canEditDocument,
    canCommentDocument,
  };
}
