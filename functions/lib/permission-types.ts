/**
 * 企业级四维权限模型与能力定义
 * 遵守 AGENTS.md 规范：严格类型化、KISS、职责单一
 */

export type DocumentAction = "view" | "edit" | "comment" | "upload" | "download" | "share";

export type PermissionScopeType = "document" | "category" | "tag" | "file_type";

export type SystemResourceType = "office" | "media" | "generic";

/**
 * 各种资源类型的天然能力矩阵约束
 * Office 文档 (docx, xlsx, pptx, pdf, md): 全部 6 种动作
 * 媒体资源 (image, video, audio): 仅 view, download, share, upload (不支持在线 edit, comment)
 * 通用/其他文件 (zip, exe 等): 仅 download, share, upload (不可在线 view, edit, comment)
 */
export const RESOURCE_TYPE_CAPABILITIES: Record<SystemResourceType, DocumentAction[]> = {
  office: ["view", "edit", "comment", "upload", "download", "share"],
  media: ["view", "upload", "download", "share"],
  generic: ["upload", "download", "share"],
};

export function getResourceType(fileType: string): SystemResourceType {
  const ext = (fileType || "").toLowerCase().replace(/^\./, "");
  if (["docx", "doc", "xlsx", "xls", "pptx", "ppt", "pdf", "md"].includes(ext)) {
    return "office";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "webm", "mp3", "wav", "image", "video", "audio"].includes(ext)) {
    return "media";
  }
  return "generic";
}

/**
 * 过滤出该文件类型客观支持的合法操作集合
 */
export function sanitizeSupportedActions(fileType: string, actions: DocumentAction[]): DocumentAction[] {
  const resourceType = getResourceType(fileType);
  const allowedCaps = new Set(RESOURCE_TYPE_CAPABILITIES[resourceType]);
  return actions.filter((act) => allowedCaps.has(act));
}

export interface RoleGroupItem {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PermissionRuleItem {
  id: string;
  orgId: string;
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

export interface EffectivePermissionsResult {
  actions: DocumentAction[];
  details: Record<DocumentAction, ResolvedPermissionDetail>;
  isOwnerOrAdmin: boolean;
}
