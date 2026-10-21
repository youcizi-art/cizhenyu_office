/**
 * 企业权限客户端 API 接口库
 */

import { DocumentAction, PermissionScopeType } from "@/functions/lib/permission-types";

export interface RoleGroup {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface PermissionRule {
  id: string;
  roleGroupId: string;
  scopeType: PermissionScopeType;
  scopeId: string;
  allowActions: DocumentAction[];
  denyActions: DocumentAction[];
  createdAt: number;
  updatedAt: number;
}

export interface ResolvedPermissionDetail {
  action: DocumentAction;
  granted: boolean;
  sourceScope: PermissionScopeType | "system_default" | "unsupported";
  sourceRuleId?: string;
  sourceScopeId?: string;
  reason: "allowed" | "denied" | "unsupported_by_type" | "default_deny";
}

export interface ResolvePermissionResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  document: {
    id: string;
    type: string;
    categoryId: string | null;
    tags: string[];
  };
  result: {
    actions: DocumentAction[];
    details: Record<DocumentAction, ResolvedPermissionDetail>;
    isOwnerOrAdmin: boolean;
  };
}

export async function fetchRoleGroups(): Promise<RoleGroup[]> {
  const res = await fetch("/api/permissions/role-groups", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch role groups");
  const data = await res.json();
  return data.data || [];
}

export async function createRoleGroup(payload: { name: string; description?: string }): Promise<RoleGroup> {
  const res = await fetch("/api/permissions/role-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create role group");
  }
  const data = await res.json();
  return data.data;
}

export async function fetchRoleGroupRules(roleGroupId: string): Promise<PermissionRule[]> {
  const res = await fetch(`/api/permissions/rules?roleGroupId=${encodeURIComponent(roleGroupId)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch rules");
  const data = await res.json();
  return data.data || [];
}

export async function createPermissionRule(payload: {
  roleGroupId: string;
  scopeType: PermissionScopeType;
  scopeId: string;
  allowActions: DocumentAction[];
  denyActions: DocumentAction[];
}): Promise<PermissionRule> {
  const res = await fetch("/api/permissions/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create rule");
  }
  const data = await res.json();
  return data.data;
}

export async function deletePermissionRule(ruleId: string): Promise<void> {
  const res = await fetch(`/api/permissions/rules?id=${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete rule");
  }
}

export async function resolveDocumentPermissions(payload: {
  documentId: string;
  simulatedUserId?: string;
}): Promise<ResolvePermissionResponse> {
  const res = await fetch("/api/permissions/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to resolve permissions");
  }
  return res.json();
}

export async function assignUserRoleGroup(userId: string, roleGroupId: string): Promise<void> {
  const res = await fetch("/api/permissions/user-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, roleGroupId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to assign role group");
  }
}

export async function removeUserRoleGroup(userId: string, roleGroupId: string): Promise<void> {
  const res = await fetch(
    `/api/permissions/user-groups?userId=${encodeURIComponent(userId)}&roleGroupId=${encodeURIComponent(roleGroupId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to remove role group");
  }
}
