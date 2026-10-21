-- CIZHENYU Office - Cloudflare D1 Database Schema
-- Run this schema with: npx wrangler d1 execute office-d1 --file=./d1/schema.sql

-- 1. 分类表
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at INTEGER NOT NULL
);

-- 2. 文档元数据表
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category_id TEXT,
  r2_key TEXT NOT NULL,
  size INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  pinned_at INTEGER,
  tags TEXT, -- JSON 数组存储字符串: '["work", "contract"]'
  "order" INTEGER DEFAULT 999999,
  share_token TEXT,
  share_password TEXT,
  share_mode TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 3. 企业组织表
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  max_seats INTEGER NOT NULL DEFAULT 20,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 4. 企业用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- owner | admin | member | viewer
  status TEXT NOT NULL DEFAULT 'active', -- active | disabled | invited
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 5. 企业用户会话表 (Session 管理与多端控制)
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. 文档细粒度权限表 (ACL)
CREATE TABLE IF NOT EXISTS document_permissions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL, -- owner | editor | commenter | viewer
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(document_id, user_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. 文档独占锁表 (TTL 租约机制)
CREATE TABLE IF NOT EXISTS document_locks (
  document_id TEXT PRIMARY KEY,
  locked_by_user_id TEXT NOT NULL,
  locked_by_user_name TEXT NOT NULL,
  locked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL, -- 过期时间戳 (默认当前时间 + 60s)
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (locked_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. 在线划词批注表 (Comment-Only)
CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  quote_text TEXT, -- 划词引用的文本片段
  position_meta TEXT, -- JSON 存储锚点或页码位置信息
  resolved INTEGER NOT NULL DEFAULT 0, -- 是否已解决 (0: 未解决, 1: 已解决)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. 文档历史版本快照表
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_r2_key TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_by_user_name TEXT NOT NULL,
  commit_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. 合规审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL, -- login | doc_create | doc_edit | lock_acquire | lock_takeover | perm_change
  target_id TEXT,
  details TEXT, -- JSON 格式详细变更
  ip_address TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 11. 邀请码管理表 (邀请入职与受限激活)
CREATE TABLE IF NOT EXISTS invitation_codes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member', -- admin | member | viewer
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 12. 角色组表 (Role Groups)
CREATE TABLE IF NOT EXISTS role_groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0, -- 1: 系统内置角色组(Owner/Admin/Member/Viewer), 0: 自定义
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 13. 用户-角色组多对多关联表
CREATE TABLE IF NOT EXISTS user_role_groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_group_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, role_group_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_group_id) REFERENCES role_groups(id) ON DELETE CASCADE
);

-- 14. 四维权限规则表 (Permission Rules)
-- scope_type: 'document' | 'category' | 'tag' | 'file_type'
-- allow_actions & deny_actions: JSON 字符串数组，如 '["view","edit","comment","download","share","upload"]'
CREATE TABLE IF NOT EXISTS permission_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  role_group_id TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  allow_actions TEXT NOT NULL DEFAULT '[]',
  deny_actions TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (role_group_id) REFERENCES role_groups(id) ON DELETE CASCADE
);

-- 15. 性能索引
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_pinned ON documents(pinned, pinned_at DESC, "order" ASC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON documents(share_token);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_doc_perm_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_perm_doc ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_locks_expires ON document_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_doc ON document_comments(document_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_doc ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitation_codes(code);

CREATE INDEX IF NOT EXISTS idx_role_groups_org ON role_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_user_role_groups_user ON user_role_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_groups_group ON user_role_groups(role_group_id);
CREATE INDEX IF NOT EXISTS idx_perm_rules_group ON permission_rules(role_group_id);
CREATE INDEX IF NOT EXISTS idx_perm_rules_scope ON permission_rules(scope_type, scope_id);


