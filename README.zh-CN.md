<p align="center">
  <img src="./public/logo.svg" width="100" height="100" alt="CIZHENYU Office Logo">
</p>

<h1 align="center">CIZHENYU Office</h1>

<p align="center">
  <strong>现代化、高性能的私有在线 Office 套件与云端资产管理平台。</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/框架-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/存储-Cloudflare%20R2-orange.svg" alt="Storage">
  <img src="https://img.shields.io/badge/许可证-AGPL%20v3-green.svg" alt="License">
</p>

<p align="center">
  <a href="https://o.ycz.me/"><strong>🚀 在线访问 (o.ycz.me)</strong></a> | <span>简体中文</span> | <a href="README.md">English</a>
</p>

<p align="center">
  <strong>快速新建:</strong>
  <a href="https://o.ycz.me/editor?new=docx">📄 Word 文档</a> | 
  <a href="https://o.ycz.me/editor?new=xlsx">📊 Excel 表格</a> | 
  <a href="https://o.ycz.me/editor?new=pptx">📽️ PowerPoint 幻灯片</a>
</p>

---

## 🚀 概览

**CIZHENYU Office** 是一款基于 WebAssembly 与云原生架构构建的在线办公与文档管理系统。无需在本地安装笨重的桌面办公软件，即可在浏览器中获得桌面级的排版、编辑与计算体验。

系统深度融合 **Cloudflare R2** 对象存储与 **Cloudflare Pages Functions** 边缘算力，提供企业级的多级分类归档、Ctrl+S 云端静默覆盖保存、双轨访问密码保护（支持 `.env` 本地构建注入与 Pages 运行时），以及安全便捷的免密只读外链分享功能。

---

## ✨ 核心特性

- **📂 全主流格式高保真编辑**: 原生支持 `.docx`、`.xlsx`、`.pptx` 及 `.pdf` 的高保真排版、公式计算、图表展示与编辑。
- **🌲 树形多级分类管理**: 在 `/documents` 页面提供可折叠展开的树形目录侧边栏（收缩时自动展示精简小图标导航），支持无限级子分类、分类重命名、删除及所属文档计数。
- **📱 移动端深度优化**: 移动端支持优雅的滑出式分类抽屉（Drawer）、横向滚动快捷分类胶囊条，单手触控操作流畅自如。
- **☁️ Cloudflare R2 云端存储**: 所有文档直接持久化至高可用的 R2 存储桶，支持快速检索、在线编辑与安全归档。
- **📤 本地文档一键上传**: 支持在文档列表页直接选取本地 Office 文档并指定归属分类批量上传至云端。
- **🔗 免密只读公开分享**: 支持为任意文档一键生成独立的只读下载外链，未登录访客凭链接即可安全下载。
- **🔐 双轨访问密码保护**: 支持通过 `.env` 本地构建注入或 Cloudflare 环境变量设置访问口令，防范未授权访问。
- **⚡ 离线与本地优先体验**: 核心排版引擎在浏览器端本地执行，响应流畅无卡顿。

---

## 🛠️ 技术架构

- **前端框架**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, 静态导出)
- **文档引擎**: [OnlyOffice](https://www.onlyoffice.com/) WebAssembly 内核
- **云端存储**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) 对象存储
- **边缘算力**: [Cloudflare Pages & Functions](https://pages.cloudflare.com/) 边缘无服务器计算
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **UI 组件**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## ⚙️ 关键配置参数与变量说明

部署前请确保配置以下变量：

| 变量 / 绑定类型 | 变量名称 | 是否必填 | 推荐填写示例 | 作用与配置说明 |
| :--- | :--- | :---: | :--- | :--- |
| **R2 存储桶绑定**<br>`(R2 Bucket Binding)` | **`DOCUMENTS_BUCKET`** | **必填** | 选择您的 R2 存储桶（如 `office-ycz-me`） | 绑定 Cloudflare R2 存储桶。后端 Functions 通过此绑定持久化存储文档数据与目录索引。 |
| **构建期访问密钥**<br>`(.env / Build Env)` | **`NEXT_PUBLIC_ACCESS_KEY`**<br>*(推荐方案)* | 选填 | `MySecretPassword2026!` | **最稳妥的访问密钥**。<br>• 写入根目录 `.env.local` 或 `.env` 文件；<br>• 在静态构建期打入代码，**100% 免疫任何平台运行时环境变量丢失的问题**；<br>• 本地无需提交 Git（已加入 `.gitignore`）。 |
| **运行时访问密钥**<br>`(Pages Functions Env)` | **`PASSWORD`**<br>*(或 `ACCESS_KEY`)* | 选填 | `MySecretPassword2026!` | Cloudflare Pages 后台设置的环境变量 / Secret。作为后端边缘鉴权的二次防护。 |

---

## 🔐 访问密钥配置指南（推荐使用 `.env` 方式）

在 Next.js 静态导出的 Web 应用中，Cloudflare Pages 后台设置的“运行时环境变量”经常会因**环境分支不匹配（Production 与 Preview）**或**静态打包时无法获取**而导致密钥在前端读取为空。

为此系统支持了**`.env` 构建期注入方案**，100% 确保密钥生效：

### 方式一：本地使用 `.env` 文件导入（最推荐、最稳妥）

1. 在项目根目录下创建 `.env.local` 文件（或参考 [`.env.example`](.env.example)）：
   ```bash
   cp .env.example .env.local
   ```
2. 在 `.env.local` 中填入您的私有访问密钥：
   ```env
   NEXT_PUBLIC_ACCESS_KEY=你的安全密码
   ```
3. 运行构建命令：
   ```bash
   pnpm build
   ```
4. 执行发布（例如 `npx wrangler pages deploy out --project-name=office-website`）。

> [!IMPORTANT]
> **安全性说明**：
> 1. 项目的 `.gitignore` 中已默认配置了 `.env*` 规则，**`.env.local` 绝对不会被提交至 Git 仓库**，非常安全；
> 2. 构建时系统会自动将此密钥参与前端 SHA-256 哈希比对校验；访客进入网站时会被第一时间拦截并弹出输入密码卡片，验证通过后发放 30 天加密本地凭据，未授权人员绝无法直接进入。

---

### 方式二：在 Cloudflare Pages 控制台配置为“构建环境变量”

如果您是通过 GitHub / GitLab 接入 Cloudflare Pages 进行自动化持续集成的：

1. 进入 Cloudflare 控制台 -> **Workers 和 Pages** -> 点击您的 Pages 项目 -> **设置 (Settings)** -> **环境变量 (Environment variables)**；
2. 在 **制作 (Production)** 和 **预览 (Preview)** 区域添加以下构建变量：
   - 变量名称：`NEXT_PUBLIC_ACCESS_KEY`
   - 变量值：`你的私有访问密钥`
3. 保存后，在 **部署 (Deployments)** 页面点击 **重新部署 (Redeploy)** 即可！

---

## 🚀 部署指南 (Cloudflare Pages + R2)

### 步骤一：创建 Cloudflare R2 存储桶

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)；
2. 在左侧菜单点击 **R2**，点击 **创建存储桶 (Create bucket)**；
3. 输入存储桶名称（例如 `office-ycz-me`），位置选择“自动”或就近区域，点击 **创建存储桶**。

---

### 步骤二：部署网站到 Cloudflare Pages

提供以下两种部署方式，任选其一即可：

#### 方案 A：通过 GitHub / GitLab 仓库集成（推荐持续交付）

1. 在 Cloudflare 控制台左侧进入 **Workers 和 Pages** -> **创建应用程序** -> 切换至 **Pages** 选项卡 -> 点击 **连接到 Git**；
2. 选择本项目的 Git 仓库，并进入配置页面：
   - **项目名称 (Project name)**: `office-website`（或自定义）
   - **生产分支 (Production branch)**: `main`
   - **框架预设 (Framework preset)**: `None`（或 `Next.js (Static HTML Export)`）
   - **构建命令 (Build command)**: `pnpm run build`
   - **构建输出目录 (Build output directory)**: `out`
3. 展开 **环境变量 (Environment variables)**，添加构建依赖项：
   - 变量名: `NODE_VERSION`，值: `20`（或更高版本）
   - *(可选访问密钥)*: `NEXT_PUBLIC_ACCESS_KEY`，值: `您的私有密码`
4. 点击 **保存并部署** 完成首次代码构建。

#### 方案 B：通过 Wrangler CLI 命令行直接部署

1. 本地创建 `.env.local` 并配置好 `NEXT_PUBLIC_ACCESS_KEY`，然后执行构建：
   ```bash
   pnpm install
   pnpm run build
   ```
   构建完成后会在本地生成 `out` 静态导出目录。
2. 确认根目录下 `wrangler.json` 中的 R2 绑定配置：
   ```json
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "office-website",
     "compatibility_date": "2026-01-12",
     "pages_build_output_dir": "./out",
     "r2_buckets": [
       {
         "binding": "DOCUMENTS_BUCKET",
         "bucket_name": "你的R2存储桶名称"
       }
     ]
   }
   ```
3. 执行 Wrangler 部署命令发布至 Pages：
   ```bash
   npx wrangler pages deploy out --project-name=office-website
   ```

---

### 步骤三：绑定 R2 存储桶 (必须)

无论使用哪种方式部署，都需要在 Cloudflare Pages 控制台为边缘 Functions 绑定 R2 存储桶：

1. 进入 Cloudflare 控制台 -> **Workers 和 Pages** -> 点击进入您的 Pages 项目（如 `office-website`）；
2. 点击顶部的 **设置 (Settings)** 选项卡 -> 在左侧点击 **函数 (Functions)**；
3. 向下滚动找到 **R2 存储桶绑定 (R2 bucket bindings)** 区域，点击 **添加绑定 (Add binding)**；
4. 填写以下信息：
   - **变量名称 (Variable name)**: `DOCUMENTS_BUCKET` *(注意全大写，不可修改)*
   - **R2 存储桶 (R2 bucket)**: 选择在步骤一中创建的 R2 存储桶（例如 `office-ycz-me`）
5. 点击 **保存 (Save)**。

> [!NOTE]
> 如果您是在部署完成后首次添加 R2 绑定，请在 Pages 项目的 **部署 (Deployments)** 页面中，找到最新一次部署并点击 **重新部署 (Redeploy)**，以使 R2 绑定在边缘 Functions 中全面生效！

---

## 💻 本地开发与调试

### 1. 环境准备
确保本地安装有 Node.js (≥ 18) 与 pnpm：
```bash
npm install -g pnpm
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置本地密钥（可选）
```bash
cp .env.example .env.local
# 编辑 .env.local 写入 NEXT_PUBLIC_ACCESS_KEY
```

### 4. 本地启动开发服务器
```bash
pnpm dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 5. 本地全量构建与校验
```bash
pnpm build
```

---

## ❓ 常见问题排查 (FAQ)

### 1. 打开 `/documents` 页面提示“加载文档库失败”或 500 错误？
* **原因**：Functions 未正确绑定 R2 存储桶。
* **排查方法**：进入 Pages 项目 -> **设置** -> **函数** -> 检查是否存在名为 `DOCUMENTS_BUCKET` 的 R2 绑定。如刚完成绑定，请点击“重新部署 (Redeploy)”一次。

### 2. 设置了密码后，刷新页面依然不需要输入密码就能进？
* **原因**：通过 Cloudflare Pages 控制台设置的 `PASSWORD` 为运行时变量，在纯静态导出模式下可能未被 Functions 正确捕获。
* **解决方法**：在项目根目录创建 `.env.local` 写入 `NEXT_PUBLIC_ACCESS_KEY=你的密码`，然后重新执行 `pnpm build` 并部署；或者在 Cloudflare Pages 的环境变量中添加 `NEXT_PUBLIC_ACCESS_KEY` 并重新部署。

---

## 📄 开源许可证与技术声明

本项目遵循 **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)** 开源许可证。

- 本项目基于开源的 OnlyOffice 核心与社区生态成果深度定制开发。
- 遵循 AGPL-3.0 协议规定，保留原作者的开源版权信息与许可证声明，任何基于本项目的衍生作品亦须以 AGPL-3.0 协议开源。
