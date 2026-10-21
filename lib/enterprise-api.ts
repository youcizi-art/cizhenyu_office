/**
 * 企业版前端 API 交互模块
 */

export interface EnterpriseUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  avatar: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "disabled" | "invited";
  createdAt: number;
}

export interface EnterpriseOrg {
  id: string;
  name: string;
  logoUrl: string | null;
  maxSeats: number;
}

export interface EnterpriseAuthStatus {
  authenticated: boolean;
  enterpriseConfigured: boolean;
  isInitialized?: boolean;
  user?: EnterpriseUser;
  org?: EnterpriseOrg;
  error?: string;
}

export interface DocPermissionItem {
  id: string;
  userId: string;
  permission: "owner" | "editor" | "commenter" | "viewer";
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userRole: string;
  createdAt: number;
}

const API_BASE = "";

/**
 * 校验当前企业登录态
 */
export async function checkEnterpriseAuth(): Promise<EnterpriseAuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
    credentials: "include",
  });
  if (!res.ok) {
    return { authenticated: false, enterpriseConfigured: false };
  }
  return res.json();
}

/**
 * 企业登录或初始化超级管理员
 */
export async function enterpriseLogin(params: {
  email: string;
  password: string;
  name?: string;
  orgName?: string;
}): Promise<{ success: boolean; user?: EnterpriseUser; org?: EnterpriseOrg; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

/**
 * 企业登出
 */
export async function enterpriseLogout(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

/**
 * 获取组织全部成员
 */
export async function fetchEnterpriseMembers(): Promise<{
  success: boolean;
  members: EnterpriseUser[];
  org: EnterpriseOrg;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/enterprise/members`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

/**
 * 添加 / 邀请新成员
 */
export async function createEnterpriseMember(params: {
  email: string;
  password: string;
  name?: string;
  role: "admin" | "member" | "viewer";
}): Promise<{ success: boolean; member?: EnterpriseUser; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

/**
 * 更新成员角色或状态
 */
export async function updateEnterpriseMember(
  userId: string,
  data: { role?: "owner" | "admin" | "member" | "viewer"; status?: "active" | "disabled"; name?: string }
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/members/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 移除成员
 */
export async function deleteEnterpriseMember(userId: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

/**
 * 查询文档 ACL 权限列表
 */
export async function fetchDocumentPermissions(documentId: string): Promise<{
  success: boolean;
  currentUserPermission: "owner" | "editor" | "commenter" | "viewer" | null;
  permissions: DocPermissionItem[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${documentId}/permissions`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

/**
 * 授予或调整文档权限
 */
export async function setDocumentPermission(
  documentId: string,
  userId: string,
  permission: "owner" | "editor" | "commenter" | "viewer"
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${documentId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, permission }),
  });
  return res.json();
}

/**
 * 撤销文档权限
 */
export async function revokeDocumentPermission(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${API_BASE}/api/enterprise/documents/${documentId}/permissions?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  return res.json();
}

export interface EnterpriseInvitation {
  id: string;
  code: string;
  role: "admin" | "member" | "viewer";
  maxUses: number;
  usedCount: number;
  expiresAt: number;
  createdAt: number;
}

/**
 * 凭邀请码激活入职
 */
export async function acceptEnterpriseInvitation(params: {
  code: string;
  email: string;
  name?: string;
  password: string;
}): Promise<{ success: boolean; user?: EnterpriseUser; organization?: EnterpriseOrg; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/invite-accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

/**
 * 获取组织所有有效邀请码
 */
export async function fetchEnterpriseInvitations(): Promise<{
  invitations: EnterpriseInvitation[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/enterprise/invitations`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

/**
 * 创建新邀请码
 */
export async function createEnterpriseInvitation(params: {
  role: "admin" | "member" | "viewer";
  maxUses: number;
  validDays: number;
}): Promise<{ success: boolean; invitation?: EnterpriseInvitation; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

/**
 * 作废邀请码
 */
export async function deleteEnterpriseInvitation(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/invitations?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

export interface EnterpriseDashboardData {
  organization: {
    id: string;
    name: string;
    maxSeats: number;
    currentMembers: number;
    activeMembers: number;
  };
  stats: {
    documentsCount: number;
    sharedCount: number;
    activeLocksCount: number;
  };
  recentActivities: Array<{
    id: string;
    userName: string;
    action: string;
    targetId: string | null;
    details: Record<string, unknown> | null;
    createdAt: number;
  }>;
}

/**
 * 获取企业工作台仪表盘聚合指标
 */
export async function fetchEnterpriseDashboard(): Promise<EnterpriseDashboardData | null> {
  const res = await fetch(`${API_BASE}/api/enterprise/dashboard`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}
