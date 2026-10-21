import { DatabaseClient } from "./db";
import { EnterpriseUser } from "../types";
import {
  DocumentAction,
  PermissionScopeType,
  EffectivePermissionsResult,
  ResolvedPermissionDetail,
  getResourceType,
  RESOURCE_TYPE_CAPABILITIES,
} from "./permission-types";

interface RuleRow {
  id: string;
  role_group_id: string;
  scope_type: PermissionScopeType;
  scope_id: string;
  allow_actions: string;
  deny_actions: string;
}

interface TargetDocInfo {
  id: string;
  type: string;
  categoryId: string | null;
  tags: string[];
}

const ALL_ACTIONS: DocumentAction[] = ["view", "edit", "comment", "upload", "download", "share"];

/**
 * 核心四维权限判定引擎
 * 维度优先级 (高 -> 低):
 * 1. document (具体文档级别)
 * 2. category (分类级别，新创建文档自动继承该分类规则)
 * 3. tag (标签级别，新创建文档自动继承该标签规则)
 * 4. file_type (文件类型级别，如 docx/xlsx/md/pdf/image)
 * 
 * 冲突策略：
 * 1. 同一维度内，多角色组冲突策略：Deny 优先 (任意角色组 Deny 则拒绝)
 * 2. 高优先级维度的决策完全遮蔽低优先级维度（如 document 明确配置了，则不再受 category 限制）
 * 3. 角色判定：Owner / Admin 拥有所有客观支持的操作
 * 4. 客观文件类型能力硬约束（例如压缩包或图片不能 edit）
 */
export async function resolveUserEffectivePermissions(
  db: DatabaseClient,
  user: EnterpriseUser,
  doc: TargetDocInfo
): Promise<EffectivePermissionsResult> {
  const resourceType = getResourceType(doc.type);
  const supportedCaps = new Set<DocumentAction>(RESOURCE_TYPE_CAPABILITIES[resourceType]);

  // 1. Owner & Admin 直接放行所有客观支持的操作
  if (user.role === "owner" || user.role === "admin") {
    const actions = ALL_ACTIONS.filter((act) => supportedCaps.has(act));
    const details = {} as Record<DocumentAction, ResolvedPermissionDetail>;
    for (const act of ALL_ACTIONS) {
      if (!supportedCaps.has(act)) {
        details[act] = {
          action: act,
          granted: false,
          sourceScope: "unsupported",
          reason: "unsupported_by_type",
        };
      } else {
        details[act] = {
          action: act,
          granted: true,
          sourceScope: "system_default",
          reason: "allowed",
        };
      }
    }
    return { actions, details, isOwnerOrAdmin: true };
  }

  // 2. 查询该用户所属的所有角色组 ID
  const userGroups = await db.query<{ role_group_id: string }>(
    "SELECT role_group_id FROM user_role_groups WHERE user_id = ?",
    user.id
  );
  const groupIds = userGroups.map((g) => g.role_group_id);

  // 如果没有加入任何自定义角色组，系统角色默认基线：
  // member: view, edit, comment, upload, download, share
  // viewer: view, comment (禁止 download, share, edit)
  if (groupIds.length === 0) {
    const isViewer = user.role === "viewer";
    const baseAllowed: DocumentAction[] = isViewer ? ["view", "comment"] : ALL_ACTIONS;
    const actions = baseAllowed.filter((act) => supportedCaps.has(act));

    const details = {} as Record<DocumentAction, ResolvedPermissionDetail>;
    for (const act of ALL_ACTIONS) {
      if (!supportedCaps.has(act)) {
        details[act] = {
          action: act,
          granted: false,
          sourceScope: "unsupported",
          reason: "unsupported_by_type",
        };
      } else if (baseAllowed.includes(act)) {
        details[act] = {
          action: act,
          granted: true,
          sourceScope: "system_default",
          reason: "allowed",
        };
      } else {
        details[act] = {
          action: act,
          granted: false,
          sourceScope: "system_default",
          reason: "default_deny",
        };
      }
    }
    return { actions, details, isOwnerOrAdmin: false };
  }

  // 3. 批量查询用户所有关联角色组的所有权限规则
  const placeholders = groupIds.map(() => "?").join(",");
  const rules = await db.query<RuleRow>(
    `SELECT * FROM permission_rules WHERE role_group_id IN (${placeholders})`,
    ...groupIds
  );

  // 4. 按优先级逐步判定每个 Action
  const details = {} as Record<DocumentAction, ResolvedPermissionDetail>;
  const finalActions: DocumentAction[] = [];

  for (const act of ALL_ACTIONS) {
    // 首先校验客观类型是否支持
    if (!supportedCaps.has(act)) {
      details[act] = {
        action: act,
        granted: false,
        sourceScope: "unsupported",
        reason: "unsupported_by_type",
      };
      continue;
    }

    // 按四维优先级逐步寻找匹配规则
    const resolved = resolveActionAcrossScopes(act, rules, doc);
    details[act] = resolved;
    if (resolved.granted) {
      finalActions.push(act);
    }
  }

  return {
    actions: finalActions,
    details,
    isOwnerOrAdmin: false,
  };
}

/**
 * 按照 4 维优先级解析单个 Action
 */
function resolveActionAcrossScopes(
  act: DocumentAction,
  rules: RuleRow[],
  doc: TargetDocInfo
): ResolvedPermissionDetail {
  // 优先级 1: document
  const docRules = rules.filter((r) => r.scope_type === "document" && r.scope_id === doc.id);
  if (docRules.length > 0) {
    return evaluateGroupRules(act, docRules, "document", doc.id);
  }

  // 优先级 2: category
  if (doc.categoryId) {
    const catRules = rules.filter((r) => r.scope_type === "category" && r.scope_id === doc.categoryId);
    if (catRules.length > 0) {
      return evaluateGroupRules(act, catRules, "category", doc.categoryId);
    }
  }

  // 优先级 3: tag (只要匹配到文档拥有的任何 tag)
  if (doc.tags && doc.tags.length > 0) {
    const tagSet = new Set(doc.tags);
    const tagRules = rules.filter((r) => r.scope_type === "tag" && tagSet.has(r.scope_id));
    if (tagRules.length > 0) {
      return evaluateGroupRules(act, tagRules, "tag", tagRules[0].scope_id);
    }
  }

  // 优先级 4: file_type
  const typeRules = rules.filter((r) => r.scope_type === "file_type" && r.scope_id === doc.type);
  if (typeRules.length > 0) {
    return evaluateGroupRules(act, typeRules, "file_type", doc.type);
  }

  // 无命中规则，默认放行基础只读 (view, comment) 或拒绝
  // 遵循企业最小特权原则：默认未显式配置时允许 view
  const defaultGranted = act === "view";
  return {
    action: act,
    granted: defaultGranted,
    sourceScope: "system_default",
    reason: defaultGranted ? "allowed" : "default_deny",
  };
}

/**
 * 在相同优先级维度下评估多角色组冲突 (Deny 优先原则)
 */
function evaluateGroupRules(
  act: DocumentAction,
  matchingRules: RuleRow[],
  scopeType: PermissionScopeType,
  scopeId: string
): ResolvedPermissionDetail {
  let hasDeny = false;
  let hasAllow = false;
  let denyRuleId: string | undefined;
  let allowRuleId: string | undefined;

  for (const rule of matchingRules) {
    let allows: string[] = [];
    let denies: string[] = [];
    try {
      allows = JSON.parse(rule.allow_actions || "[]");
      denies = JSON.parse(rule.deny_actions || "[]");
    } catch {
      // 容错 JSON 解析
    }

    if (denies.includes(act)) {
      hasDeny = true;
      denyRuleId = rule.id;
      break; // 任意 Deny 优先
    }
    if (allows.includes(act)) {
      hasAllow = true;
      allowRuleId = rule.id;
    }
  }

  if (hasDeny) {
    return {
      action: act,
      granted: false,
      sourceScope: scopeType,
      sourceRuleId: denyRuleId,
      sourceScopeId: scopeId,
      reason: "denied",
    };
  }

  if (hasAllow) {
    return {
      action: act,
      granted: true,
      sourceScope: scopeType,
      sourceRuleId: allowRuleId,
      sourceScopeId: scopeId,
      reason: "allowed",
    };
  }

  // 既无 allow 也无 deny，视为未授权
  return {
    action: act,
    granted: false,
    sourceScope: scopeType,
    sourceScopeId: scopeId,
    reason: "default_deny",
  };
}
