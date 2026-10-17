<p align="center">
  <img src="./public/logo.svg" width="100" height="100" alt="CIZHENYU Office Logo">
</p>

<h1 align="center">CIZHENYU Office</h1>

<p align="center">
  <strong>现代化、高性能的私有在线 Office 套件与云端资产管理平台。</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/框架-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/存储-Cloudflare%20R2-orange.svg" alt="Storage">
  <img src="https://img.shields.io/badge/数据库-Cloudflare%20D1-yellow.svg" alt="Database">
  <img src="https://img.shields.io/badge/许可证-AGPL%20v3-green.svg" alt="License">
</p>

<p align="center">
  <a href="https://o.ycz.me/"><strong>🚀 在线访问 (o.ycz.me)</strong></a> | <span>简体中文</span> | <a href="README.md">English</a>
</p>

<p align="center">
  <strong>快速新建:</strong>
  <a href="https://o.ycz.me/editor?new=docx">📄 Word 文档</a> | 
  <a href="https://o.ycz.me/editor?new=xlsx">📊 Excel 表格</a> | 
  <a href="https://o.ycz.me/editor?new=pptx">📽️ PowerPoint 幻灯片</a> | 
  <a href="https://o.ycz.me/editor?new=md">📝 Markdown 文档</a>
</p>

---

## 🚀 项目概览

**CIZHENYU Office** 是一款基于 WebAssembly 与云原生架构构建的私有在线办公套件与数字资产管理系统。

无需在本地安装任何笨重的传统桌面办公软件，亦无需自建昂贵易崩溃的后端服务器，即可在现代浏览器中秒级进入桌面级高保真排版、数据计算与文档协同环境。

系统深度依托 **Cloudflare Pages + Functions + R2 + D1** 边缘无服务器（Serverless）生态，具备极致的轻量性、零维护成本、毫秒级全球就近加速，以及严密可靠的双轨安全访问控制体系。

---

## ✨ 详细功能全景介绍

### 1. 📂 四核 Office 深度编辑与高保真排版
- **三大核心格式原生支持**: 全面支持 `.docx`、`.xlsx`、`.pptx` 的高保真渲染、复杂排版、样式调整、函数公式与图表插入。
- **高兼容旧版格式**: 支持查看与兼容处理 `.doc`、`.xls`、`.ppt` 等传统 Office 格式。
- **PDF 在线阅读器**: 原生内置 PDF 高清预览引擎，具备高清晰度缩放与流畅分页阅读。
- **Wasm 离线内核**: 基于 OnlyOffice 离线 WebAssembly 内核技术，免依赖任何外部重型第三方转换后端，杜绝隐私泄露。
- **Ctrl+S 云端静默保存**: 编辑过程中按下 `Ctrl + S`（或 Mac 下 `Cmd + S`），文档二进制流直接经由边缘 Functions 静默持久化回写至 Cloudflare R2，绝不丢失任何数据。

### 2. 📝 Markdown 沉浸式创作与专属分享大纲
- **三模态编辑视图**: 支持“所见即所得 (WYSIWYG)”、“即时渲染 (IR)”与“分屏实时预览 (SV)”一键切换。
- **精准双栏联动**: 源码区与预览区滚动条平滑同步联动，内置代码块高亮、数学公式（KaTeX）、表格、任务清单与脚注支持。
- **专属公开分享阅读视图**:
  - **右侧智能浮动目录 (Sticky TOC)**: 在大屏分享页面中，根据正文层级自动提取完整目录，**智能随视窗保持吸顶浮动跟随**，并根据页面阅读进度高亮当前章节；
  - **无死锁滚动**: 彻底消除长页面滚动时的自动上滚冲突，正文畅快向下浏览，章节目录内部独立自适应滚动；
  - **便捷辅助工具**: 支持一键复制 Markdown 纯文本源码、下载原文件，并在移动端支持滑出式抽屉目录。

### 3. 🖼️ 全格式文件管理与多媒体全屏展示
- **无限制格式上传**: 突破传统 Office 工具的格式边界，支持上传管理任何格式的文件（图片、音视频、压缩包、安装包等）。
- **多媒体专属标识与预览**:
  - **图片 (Image)**: 包含 JPG、PNG、GIF、WebP、SVG、AVIF 等，弹窗高清无损原图缩放预览；
  - **视频 (Video)**: 包含 MP4、WebM、MOV 等，内置原生视频播放器即时播映；
  - **音频 (Audio)**: 包含 MP3、WAV、OGG、AAC、FLAC 等，内置音频播放卡片；
- **沉浸式全屏在线分享**: 针对图片、音视频设置“展示分享”模式后，访客打开链接直接进入全屏沉浸式播放/预览视窗（免密直达，密码保护解锁后即刻呈现），无需繁琐先下载后打开。
- **不可编辑文件详情卡片 (FileDetailsModal)**: 对压缩包、可执行文件等其他类型，点击卡片弹出精美元数据面板，展示文件大小、上传时间、所属分类与标签，提供安全下载、重命名、分类移动、改标签及删除操作。

### 4. 📑 服务端真实物理分页与多维组合筛选
- **服务端真实分页**: `/documents` 页面支持真正的物理分页拉取，默认每页展示 20 项，支持用户自由切换（10, 20, 30, 40, 50, 100 条/页），极大提升在海量文件库下的加载性能与内存友好性。
- **多维度交叉筛选**:
  - **关键词搜索**: 支持对文档名称进行实时模糊匹配；
  - **文档类型快速切换**: 一键过滤 Word、Excel、PPT、PDF、Markdown、图片、视频、音频或其它文件；
  - **无限级分类树关联**: 选中分类时递归检索该分类及其所有子目录下的所有文档；
  - **标签体系 (Tags)**: 支持按文档自定义标签进行联合检索过滤；
- **智能排序与拖拽重排**:
  - **置顶支持 (Pin)**: 重要文档一键置顶展示；
  - **长按自由排序**: 鼠标按住卡片（或移动端长按）0.25 秒触发高自由度拖拽排序，服务端实时同步保存顺序。

### 5. 📱 移动端极致紧凑与防遮挡优化
- **顶部操作图标收缩**: 在手机端，桌面端大尺寸的搜索框与上传按钮收缩至右上角紧凑操作图标，点击后以浮动卡片滑出搜索面板，平时完全不挤占任何宝贵的屏幕高度。
- **多余提示行智能隐藏**: 隐藏拖拽辅助说明条，为移动端卡片列表增加 100px 以上的净展示高度。
- **纯数字超紧凑底部分页条**: 去除长文本，采用 `1 - 20 / 255` 纯数字信息和极窄上下页翻页箭头，单行排版永不换行。
- **`100dvh` 与安全间距防遮挡**: 结合现代动态视口高度（Dynamic Viewport Height），在移动端为底部分页条预留底部导航栏（MobileNav）的安全浮动距离，绝不被手机系统手势条或底部菜单遮挡。

### 6. 🔗 灵活多元安全外链分享
- **公开直接下载**: 一键生成直链，无需任何登录权限即可直接下载。
- **4~8 位提取密钥保护**: 支持开启提取密码保护，支持一键随机生成安全密码，只有凭正确口令的访客方能提取与阅读。
- **展示与下载双模式**: 针对 Markdown 和音视频媒体文档，支持在“直接下载模式”与“网页在线展示 (Web Preview) 模式”之间灵活切换。
- **完善交互动效与防重复点击**: 生成和关闭分享链接时提供平滑 Loading 转圈动画与按钮防抖禁用，杜绝网络等待中的重复误触。

### 7. 🌐 全站多语言国际化 (i18n)
- **英语第一公民与默认兜底**: 全站所有文案以规范英文为基准，完全消除硬编码中文字符串。
- **50+ 种全球语言覆盖**: 自动支持主流操作系统与浏览器的语言环境自适应。
- **即时语言切换器**: 在公开分享页面、媒体阅读视图与主系统顶栏均配备语言切换器，深度支持 **中文（简体/繁体）**、**英语**、**日本語**、**한국어 (韩语)**、**Español (西班牙语)**、**Deutsch (德语)**、**Français (法语)** 等主流语种。

### 8. ☁️ Cloudflare R2 + D1 双引擎驱动与多层鉴权
- **零成本云原生架构**: 采用 Next.js `output: 'export'` 纯静态构建打包，部署至 Cloudflare Pages，不产生服务器空闲运行费用。
- **双引擎存储模式**:
  - **原生 R2 引擎**: 零数据库依赖，直接利用 R2 持久化存储二进制流与目录元数据，开箱即用；
  - **Cloudflare D1 关系型数据库扩展**: 提供现成的 `d1/schema.sql` 迁移建表脚本，针对百万级企业资产管理可直接启用 D1 引擎执行原生 SQL 高性能查询；
- **双轨访问口令体系**: 支持 `.env.local` 本地构建期注入密钥（100% 免疫平台环境变量丢失）与 Pages 运行时环境变量双保险。

---

## 🛠️ 技术栈与生态组件

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, 纯静态导出) | 业界顶级响应速度与静态 HTML 秒开体验 |
| **样式与图标** | [Tailwind CSS](https://tailwindcss.com/) v4 & [Lucide Icons](https://lucide.dev/) | 现代化设计系统、暗色模式、精美玻璃拟态与响应式微交互 |
| **办公文档引擎** | [OnlyOffice](https://www.onlyoffice.com/) WebAssembly SDK | 高保真 Word/Excel/PPT/PDF 离线排版计算引擎 |
| **Markdown 引擎**| [Vditor](https://github.com/Vanessa219/vditor) | 工业级富文本与 Markdown 双引擎协同 |
| **存储后端** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) | 兼容 S3 协议、无出口下行流量费（Zero Egress Fee）的全球分布式对象存储 |
| **数据库 (可选)**| [Cloudflare D1](https://developers.cloudflare.com/d1/) | 边缘无服务器 SQLite 关系型数据库 |
| **边缘计算** | [Cloudflare Pages Functions](https://pages.cloudflare.com/) | 全球 300+ 边缘节点无缝接管 API 请求与鉴权拦截 |
| **状态管理** | [Zustand](https://github.com/pmndrs/zustand) | 极轻量客户端状态管理 |
| **国际化 (i18n)** | [next-intl](https://next-intl.dev/) | 全球化多语言提取与安全兜底驱动 |

---

## ⚙️ 关键配置参数与环境变量说明

| 变量 / 绑定类型 | 变量名称 | 是否必填 | 推荐填写示例 | 作用与配置说明 |
| :--- | :--- | :---: | :--- | :--- |
| **R2 存储桶绑定**<br>`(R2 Bucket Binding)` | **`DOCUMENTS_BUCKET`** | **必填** | `office-ycz-me` | 绑定 Cloudflare R2 存储桶。后端 Functions 通过此绑定持久化存储文档数据与目录索引。 |
| **D1 数据库绑定**<br>`(D1 Database Binding)` | **`DB`** | 选填 | `office-d1` | 绑定 Cloudflare D1 数据库执行 SQL 查询。若未绑定，系统平滑自动使用 R2 索引引擎。 |
| **构建期访问密钥**<br>`(.env / Build Env)` | **`NEXT_PUBLIC_ACCESS_KEY`**<br>*(推荐方案)* | 选填 | `MySecretPassword2026!` | **最稳妥的访问密钥**。<br>• 写入根目录 `.env.local` 文件；<br>• 在静态构建期打入代码，**100% 免疫任何平台运行时环境变量丢失的问题**；<br>• 本地已加入 `.gitignore`，安全不泄露。 |
| **运行时访问密钥**<br>`(Pages Functions Env)` | **`PASSWORD`**<br>*(或 `ACCESS_KEY`)* | 选填 | `MySecretPassword2026!` | Cloudflare Pages 后台设置的环境变量 / Secret。作为后端边缘鉴权的二次防护。 |

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

### 步骤四：配置 Cloudflare D1 数据库 (可选扩展)

CIZHENYU Office 采用高可用的双引擎架构：原生零配置支持 R2 运行；同时支持无缝扩展至 **Cloudflare D1 关系型数据库**，满足海量资产数据检索与扩展开发需求。

1. 使用 Wrangler 命令行创建 D1 数据库：
   ```bash
   npx wrangler d1 create office-d1
   ```
2. 执行 SQL 架构建表与索引初始化：
   ```bash
   npx wrangler d1 execute office-d1 --file=./d1/schema.sql
   ```
3. 在 Cloudflare Pages 中绑定 D1：
   - 进入 Pages 项目 -> **设置 (Settings)** -> **函数 (Functions)** -> **D1 数据库绑定**；
   - 添加绑定：**变量名称**: `DB`，**D1 数据库**: 选择 `office-d1`；
   - 保存并在 **部署 (Deployments)** 中点击 **重新部署 (Redeploy)** 即可。

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
* **解决方法**：在项目根目录创建 `.env.local` 写入 `NEXT_PUBLIC_ACCESS_KEY=你的密码`，然后重新执行 `pnpm build` 并部署；或者在 Cloudflare Pages 的构建环境变量中添加 `NEXT_PUBLIC_ACCESS_KEY` 并重新部署。

### 3. Markdown 分享页在长文档下能否流畅定位章节？
* **特性**：系统采用了独立的视窗浮动目录（Sticky TOC）与安全的相对位置微调算法，彻底杜绝了旧版页面向下滚动时被强制回滚的问题。点击目录项将自动平滑定位并留出顶部导航的安全距离。

---

## 📄 开源许可证与技术声明

本项目遵循 **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)** 开源许可证。

- 本项目基于开源的 OnlyOffice 核心与社区生态成果深度定制开发。
- 遵循 AGPL-3.0 协议规定，保留原作者的开源版权信息与许可证声明，任何基于本项目的衍生作品亦须以 AGPL-3.0 协议开源。
