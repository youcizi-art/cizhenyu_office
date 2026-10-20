import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * 1. 分类表
 */
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at").notNull(),
  }
);

/**
 * 2. 文档元数据表
 */
export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    categoryId: text("category_id"),
    r2Key: text("r2_key").notNull(),
    size: integer("size").notNull(),
    pinned: integer("pinned").notNull().default(0),
    pinnedAt: integer("pinned_at"),
    tags: text("tags"),
    order: integer("order").default(999999),
    shareToken: text("share_token"),
    sharePassword: text("share_password"),
    shareMode: text("share_mode"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_documents_category").on(table.categoryId),
    index("idx_documents_type").on(table.type),
    index("idx_documents_updated").on(table.updatedAt),
    index("idx_documents_name").on(table.name),
  ]
);

/**
 * 3. 企业组织表
 */
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    maxSeats: integer("max_seats").notNull().default(20),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  }
);

/**
 * 4. 企业用户表
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    salt: text("salt").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
    role: text("role").notNull().default("member"), // 'owner' | 'admin' | 'member' | 'viewer'
    status: text("status").notNull().default("active"), // 'active' | 'disabled' | 'invited'
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_users_org").on(table.orgId),
    uniqueIndex("idx_users_email").on(table.email),
  ]
);

/**
 * 5. 用户会话表 (Session 管理)
 */
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user").on(table.userId),
    uniqueIndex("idx_sessions_token").on(table.tokenHash),
  ]
);

/**
 * 6. 文档细粒度权限表 (ACL)
 */
export const documentPermissions = sqliteTable(
  "document_permissions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    userId: text("user_id").notNull(),
    permission: text("permission").notNull(), // 'owner' | 'editor' | 'commenter' | 'viewer'
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_doc_perm_user").on(table.userId),
    index("idx_doc_perm_doc").on(table.documentId),
  ]
);

/**
 * 7. 文档独占锁表 (TTL 租约机制)
 */
export const documentLocks = sqliteTable(
  "document_locks",
  {
    documentId: text("document_id").primaryKey(),
    lockedByUserId: text("locked_by_user_id").notNull(),
    lockedByUserName: text("locked_by_user_name").notNull(),
    lockedAt: integer("locked_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_doc_locks_expires").on(table.expiresAt),
  ]
);

/**
 * 8. 在线划词批注表 (Comment-Only)
 */
export const documentComments = sqliteTable(
  "document_comments",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userAvatar: text("user_avatar"),
    content: text("content").notNull(),
    quoteText: text("quote_text"),
    positionMeta: text("position_meta"),
    resolved: integer("resolved").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_comments_doc").on(table.documentId, table.resolved),
  ]
);

/**
 * 9. 文档历史版本快照表
 */
export const documentVersions = sqliteTable(
  "document_versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    snapshotR2Key: text("snapshot_r2_key").notNull(),
    size: integer("size").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdByUserName: text("created_by_user_name").notNull(),
    commitMessage: text("commit_message"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_versions_doc").on(table.documentId, table.versionNumber),
  ]
);

/**
 * 10. 合规审计日志表
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    userId: text("user_id"),
    userName: text("user_name"),
    action: text("action").notNull(),
    targetId: text("target_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_audit_org").on(table.orgId, table.createdAt),
  ]
);
