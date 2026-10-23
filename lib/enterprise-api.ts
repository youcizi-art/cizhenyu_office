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
  departmentId?: string | null;
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
  name?: string;
  password?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  departmentId?: string | null;
  roleGroupIds?: string[];
  docPermissions?: { documentId: string; permission: "owner" | "editor" | "commenter" | "viewer" }[];
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
 * 更新成员角色、状态、部门或权限
 */
export async function updateEnterpriseMember(
  userId: string,
  data: {
    role?: "owner" | "admin" | "member" | "viewer";
    status?: "active" | "disabled";
    name?: string;
    departmentId?: string | null;
    roleGroupIds?: string[];
    docPermissions?: { documentId: string; permission: "owner" | "editor" | "commenter" | "viewer" }[];
  }
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

export interface DocumentLockInfo {
  documentId: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
  remainingSeconds: number;
}

export interface LockStatusResult {
  success: boolean;
  isLocked: boolean;
  isLockedByMe?: boolean;
  acquired?: boolean;
  released?: boolean;
  refreshed?: boolean;
  error?: string;
  message?: string;
  lock?: DocumentLockInfo | null;
}

/**
 * 查询文档独占写锁状态
 */
export async function getDocumentLockStatus(docId: string): Promise<LockStatusResult> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${encodeURIComponent(docId)}/lock`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

/**
 * 申请文档独占锁
 */
export async function acquireDocumentLock(docId: string, docName?: string): Promise<LockStatusResult> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${encodeURIComponent(docId)}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "acquire", docName }),
  });
  return res.json();
}

/**
 * 续租心跳
 */
export async function heartbeatDocumentLock(docId: string): Promise<LockStatusResult> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${encodeURIComponent(docId)}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "heartbeat" }),
  });
  return res.json();
}

/**
 * 主动释放文档锁
 */
export async function releaseDocumentLock(docId: string, docName?: string): Promise<LockStatusResult> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${encodeURIComponent(docId)}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "unlock", docName }),
  });
  return res.json();
}

/**
 * 管理员强制接管锁
 */
export async function takeoverDocumentLock(docId: string, docName?: string): Promise<LockStatusResult> {
  const res = await fetch(`${API_BASE}/api/enterprise/documents/${encodeURIComponent(docId)}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "takeover", docName }),
  });
  return res.json();
}

export interface AuditLogItem {
  id: string;
  orgId: string;
  userId: string | null;
  userName: string;
  action: string;
  targetId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: number;
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 分页查询合规审计日志
 */
export async function fetchAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  search?: string;
}): Promise<{
  success: boolean;
  logs: AuditLogItem[];
  pagination: AuditLogPagination;
  error?: string;
}> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.action) query.set("action", params.action);
  if (params.search) query.set("search", params.search);

  const res = await fetch(`${API_BASE}/api/enterprise/audit-logs?${query.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

/**
 * 删除单条审计日志
 */
export async function deleteAuditLog(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/audit-logs?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

/**
 * 清理历史审计日志
 */
export async function pruneAuditLogs(days: number): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/audit-logs?days=${encodeURIComponent(String(days))}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

/**
 * 部门管理数据模型与接口
 */
export interface DepartmentItem {
  id: string;
  orgId: string;
  name: string;
  parentId: string | null;
  order: number;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
}

export async function fetchDepartments(): Promise<{ success: boolean; departments: DepartmentItem[]; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/departments`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}

export async function createDepartment(params: {
  name: string;
  parentId?: string | null;
}): Promise<{ success: boolean; department?: DepartmentItem; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function updateDepartment(
  id: string,
  params: { name?: string; parentId?: string | null; order?: number }
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/departments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function deleteDepartment(id: string): Promise<{ success: boolean; deletedIds?: string[]; error?: string }> {
  const res = await fetch(`${API_BASE}/api/enterprise/departments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

