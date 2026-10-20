# CIZHENYU Office 企业版构建与落地计划书
## 打造面向中小企业（SMB）与小团队的“零服务器、零运维”私有在线办公协同平台

---

## 一、 项目背景与核心战略定位

### 1. 核心战略哲学：务实、极简、零额外负担
当前很多企业级协同办公系统（如飞书、腾讯文档、Office 365）虽然功能繁复，但存在以下中小团队不可承受的痛点：
1. **公有云合规红线**：中小企业、律师事务所、设计工作室、金融/涉密机构的核心经营数据、机密商业合同严禁上传至第三方公有云平台；
2. **传统私有化方案极其沉重**：采购一套传统的私有化协同办公系统，动辄要求购买多台高配云主机（VPS）、搭建维护庞大的 Docker / Kubernetes 集群，部署繁琐、运维成本高昂，小企业根本无专职 IT 团队维护。

**本项目的核心立足点**：
> **“能在 Cloudflare 上解决的，绝不增加额外服务器负担！”**
> 100% 依托现有的 **Cloudflare Pages + Functions + D1 + R2** 无服务器生态，保持**零主机租金、零容器运维、秒开极轻量、数据 100% 私有自主可控**的绝对差异化竞争优势。

---

## 二、 核心功能矩阵与技术方案规划

### 1. 功能特性对比矩阵（开源个人版 vs 企业用户版）

| 功能模块 | 开源社区版（当前分支） | 企业用户版（全新分支） | 核心实现架构 |
| :--- | :--- | :--- | :--- |
| **部署环境** | 纯静态 Cloudflare Pages + R2 | 纯静态 Cloudflare Pages + R2 + D1 | **100% Cloudflare 边缘环境，0 额外服务器** |
| **用户体系** | 单一访问口令（ACCESS_KEY） | 企业组织树、多部门、多成员账号管理 | Cloudflare D1 + PBKDF2/Argon2 密码加密 |
| **权限控制** | 全库读写（管理员模式） | 细粒度 RBAC 权限（所有者/管理/编辑/批注/只读） | Functions 边缘网关 `<1ms` 快速验权 |
| **协同防冲突** | 覆盖保存（Last-Write-Wins） | **专业级文档防冲突独占锁（Exclusive Lock）** | D1 租约表 + 客户端定时心跳续租 |
| **协作感知** | 无法感知他人 | **全透明在线感知（显示当前主笔人、强制接管）** | 锁状态广播 + 顶部提示横幅 |
| **在线审阅** | 需下载后在本地批注 | **在线轻量划词批注与意见回复（Comment-Only）** | 批注进 D1 数据库，不破坏 Office 二进制 |
| **版本回退** | 无历史版本（覆盖写） | **多版本快照回滚与操作审计日志（Audit Trail）** | R2 对象版本控制 / 快照表 |
| **轻量协同** | 本地单人 Markdown 编辑 | **Markdown 纯文本多人毫秒级打字协同（可选）** | Cloudflare Durable Objects + Yjs CRDT |

---

## 三、 企业版四大核心模块详细技术设计

### 模块一：细粒度企业权限管理系统 (RBAC)

#### 1. 权限角色划分
* **组织所有者 (Owner)**：企业最高权限，管理组织设置、订阅凭证、审计日志。
* **部门/空间管理员 (Admin)**：管理所属部门/文件夹的成员权限与文档分配。
* **协同编辑者 (Editor)**：可申请编辑锁修改文档正文，可上传新版本。
* **审阅批注者 (Commenter)**：不可修改正文二进制，但可在线划词批注、提意见、打勾确认。
* **只读浏览者 (Viewer)**：仅在线阅读或导出下载，不可申请锁，不可删除。

#### 2. 鉴权执行链
```
客户端请求 (携带 JWT Token)
   │
   ▼
Cloudflare Pages Functions (中间件拦截)
   ├── 验证 JWT 签名合法性与有效期限
   ├── 查询 D1 缓存/ACL 矩阵匹配文档操作权限
   │      ├── 权限不足 ──> 抛出 403 Forbidden
   │      └── 权限通过 ──> 放行到业务逻辑
```

---

### 模块二：专业级文档防冲突独占锁（Conflict-Free Exclusive Lock）

针对中小企业“主笔人负责制”的真实场景，彻底根除“多人保存相互覆盖”的灾难。

#### 1. 租约心跳（TTL Lease）与防僵尸锁机制
```
用户 A 打开文档 ────> 请求获取锁 ──成功──> 获得独占写权限 (mode: "edit")
                        │                      │
                        │                      └── 启动心跳 (每 20s 自动续期租约)
                        │
用户 B 打开文档 ────> 请求获取锁 ──已被占用──> 降为只读模式 (mode: "view")
                                               │
                                               └── 顶部横幅提示：🔒 用户 A 正在编辑
```
* **租约有效期（TTL）**：单次锁定默认有效期为 **60 秒**；
* **心跳续租**：持有锁的前端开着页面时，每 **20 秒**静默向 `/api/documents/:id/heartbeat` 发送心跳包续期；
* **防死锁（Zombie Lock）**：若用户直接合上笔记本、断网或发生崩溃，服务端因 **60 秒**未收到心跳将自动释放该锁，其他人即可正常接管。

#### 2. 管理员强制接管（Take Over）机制
* **场景**：主笔人离开工位未关电脑，急需紧急修改文件；
* **处理**：文档所有者或管理员可点击【强制接管编辑权】；
* **执行**：服务端立刻重置锁持有者为管理员；原主笔人前端在下次心跳时收到通知，自动优雅降级为只读，避免冲突。

#### 3. 空闲排队通知（Notify When Available）
* 只读查看的用户可点击【空闲时提醒我】；
* 当锁被释放后，前端自动弹窗提示：“该文档当前已空闲，点击即可获取编辑权”。

---

### 模块三：在线审阅与轻量批注系统 (Comment-Only)

* **原理**：同一时间只允许 1 个人修改正文内容，但企业团队成员（如法务、主管）可以随时打开文档在线审阅；
* **数据解耦**：批注内容（行号/选区文本、批注人、时间、评论内容、解决状态）直接记录在 **Cloudflare D1** 数据库中，**完全不污染和破坏 Office 的原生二进制流**；
* **呈现方式**：在编辑器右侧滑出审阅抽屉面板，主笔人与审阅人可以就某个条款展开对话讨论，打勾后标记为“已解决”。

---

### 模块四：版本快照控制与合规审计日志 (Audit Trail)

#### 1. 多版本历史快照
* 每次编辑者点击保存（Ctrl+S 或退出编辑）时，系统自动在 D1 记录一条版本日志，并指向该版本的 R2 存储快照；
* 提供可视化版本列表：展示 `v1.0 (创建)`, `v1.1 (张三 修改)`, `v1.2 (李四 审核)`；
* 支持任意历史版本的一键在线比对与一键回滚恢复。

#### 2. 合规审计日志（满足企业监管与法务追溯）
* 详尽记录所有敏感事件：`文档创建`、`加锁编辑`、`解锁退出`、`重命名`、`权限变更`、`外链分享`、`文档删除`；
* 支持企业管理员按时间、操作人、关键词筛选并一键导出 CSV 报告。

---

## 四、 数据库表结构设计（Cloudflare D1 Schema）

在企业版中，需在 `d1/schema.sql` 扩充以下数据表结构：

```sql
-- 1. 企业组织/租户表
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'team',              -- 团队方案: 'team', 'enterprise'
  max_members INTEGER DEFAULT 20,
  created_at INTEGER NOT NULL
);

-- 2. 部门/工作区表
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at INTEGER NOT NULL
);

-- 3. 企业成员表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',   -- 'owner', 'admin', 'member'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled'
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- 4. 细粒度文档权限 ACL 矩阵表
CREATE TABLE IF NOT EXISTS document_permissions (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,                  -- 文档 ID
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,              -- 'admin', 'edit', 'comment', 'view'
  created_at INTEGER NOT NULL
);

-- 5. 文档实时租约独占锁表
CREATE TABLE IF NOT EXISTS document_locks (
  doc_id TEXT PRIMARY KEY,
  locked_by_user_id TEXT NOT NULL REFERENCES users(id),
  locked_by_name TEXT NOT NULL,
  locked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL            -- 锁到期时间戳 (当前时间 + 60s)
);

-- 6. 在线批注审阅表
CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  selected_text TEXT,
  content TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,            -- 0: 未解决, 1: 已解决
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 7. 文档历史版本表
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  r2_key TEXT NOT NULL,                  -- 对应的历史快照 R2 Key
  size INTEGER NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  change_summary TEXT,                   -- 修改摘要
  created_at INTEGER NOT NULL
);

-- 8. 企业合规审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,                  -- 'LOCK', 'UNLOCK', 'SAVE', 'DELETE', 'SHARE'
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  ip_address TEXT,
  details TEXT,                          -- JSON 格式扩展细节
  created_at INTEGER NOT NULL
);
```

---

## 五、 API 路由设计（Cloudflare Pages Functions）

所有新增路由均放置在 `functions/api/enterprise/` 命名空间下，严格与个人版代码解耦：

### 1. 认证与组织管理
* `POST /api/enterprise/auth/login`：企业成员登录，下发 HttpOnly JWT Token。
* `GET  /api/enterprise/organization/members`：获取团队成员列表与部门树。
* `POST /api/enterprise/organization/members`：邀请/添加新成员。

### 2. 独占锁与状态感知
* `POST /api/enterprise/documents/:id/lock`：申请获取文档锁（若已被占用返回 423 Locked 及占用人信息）。
* `POST /api/enterprise/documents/:id/heartbeat`：每 20s 自动续租锁。
* `POST /api/enterprise/documents/:id/unlock`：主动退出或关闭标签页时释放锁。
* `POST /api/enterprise/documents/:id/takeover`：管理员强制接管收回锁。

### 3. 历史版本与审计
* `GET  /api/enterprise/documents/:id/versions`：获取文档的历史版本列表。
* `POST /api/enterprise/documents/:id/versions/:verId/restore`：一键回滚恢复指定版本。
* `GET  /api/enterprise/audit-logs`：企业管理员多维度筛选审计记录。

---

## 六、 实施路线图与交付里程碑（Roadmap）

```
阶段一：基础底座 (1-2 周)      阶段二：独占锁系统 (1-2 周)      阶段三：版本与审计 (1 周)      阶段四：商业化打包 (1 周)
   ├── 新建 enterprise 分支       ├── 锁申请与心跳机制          ├── R2 快照归档               ├── 商业 License 机制
   ├── D1 企业表结构部署          ├── 状态横幅与强制接管        ├── 历史版本一键恢复          ├── 部署文档与配置向导
   └── RBAC 用户与权限接口        └── 只读态自动优雅降级        └── 合规审计日志导出          └── 交付中小企业客户测试
```

### 里程碑 1：分支设立与企业权限模型搭建 (Phase 1)
* 在 Git 中创建并维护 `enterprise` 独立分支；
* 执行 `d1/schema.sql` 扩充表结构迁移；
* 完成基于 D1 的成员登录、组织架构管理与细粒度权限校验中间件。

### 里程碑 2：防冲突独占锁系统与前端联动 (Phase 2)
* 封装心跳 Hook `useDocumentLock(docId)`；
* 改造 OnlyOffice 编辑器入口：根据锁状态动态传入 `mode: "edit"` 或 `mode: "view"`；
* 完善前端 UI：顶部常驻展示“【张三】正在编辑”状态条与【强制接管】按钮。

### 里程碑 3：历史版本与审计回溯 (Phase 3)
* 每次完成保存后自动备份版本快照至 R2；
* 在文档管理列表与编辑器顶部提供【历史版本】侧滑面板，支持一键预览与回滚；
* 提供管理员专属的审计日志页面。

### 里程碑 4：打包商业授权与部署矩阵 (Phase 4)
* 封装企业版专属环境变量与 License 校验逻辑；
* 编写详尽的《中小企业 10 分钟 Cloudflare 零成本私有部署手册》。

---

## 七、 商业模式与市场变现建议

1. **开源个人版（当前分支）**：
   * 保持 100% 开源免费、单人离线秒开、自由分发；
   * 负责在 GitHub 积累 Stars、扩大品牌知名度与开发者口碑。
2. **企业商业版（`enterprise` 分支）**：
   * **适用客群**：5-100 人规模的中小企业、初创团队、财务代理记账公司、律所、设计团队；
   * **商业模式**：
     * **方式 A：买断授权（One-Time License）**：提供企业版源码或私有仓库访问权，一次性收费（如 ¥1,999 / $299 买断永久更新）；
     * **方式 B：团队年费席位制（Subscription）**：按团队规模提供技术支持与持续功能升级（如 ¥999/年，含 20 人协作授权）；
   * **客户核心心智**：**“花了传统 OA 系统 1/10 的价格，买到了一套数据 100% 私有、无需购买云服务器、终身免运维的高性能在线 Office 套件”**。

---

*计划书编制完成，归档于项目根目录 `docs/ENTERPRISE_EDITION_PLAN.md`。*
