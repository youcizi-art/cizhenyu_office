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

-- 3. 性能索引
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_pinned ON documents(pinned, pinned_at DESC, "order" ASC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON documents(share_token);
