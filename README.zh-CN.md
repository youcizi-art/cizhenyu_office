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

系统深度融合 **Cloudflare R2** 对象存储，提供企业级的多级分类归档、Ctrl+S 云端静默覆盖保存，以及安全便捷的免密只读外链分享功能。

---

## ✨ 核心特性

- **📂 全主流格式高保真编辑**: 原生支持 `.docx`、`.xlsx`、`.pptx` 及 `.pdf` 的高保真排版、公式计算、图表展示与编辑。
- **🌲 树形多级分类管理**: 在 `/documents` 页面提供可折叠展开的树形目录侧边栏，支持无限级子分类、分类重命名、删除及所属文档计数。
- **☁️ Cloudflare R2 云端存储**: 所有文档直接持久化至高可用的 R2 存储桶，支持快速检索、在线编辑与安全归档。
- **📤 本地文档一键上传**: 支持在文档列表页直接选取本地 Office 文档并指定归属分类批量上传至云端。
- **🔗 免密只读公开分享**: 支持为任意文档一键生成独立的只读下载外链，未登录访客凭链接即可安全下载。
- **🔐 单密钥访问保护**: 服务端在边缘 Functions 层面校验访问口令，防范未授权访问。
- **⚡ 离线与本地优先体验**: 核心排版引擎在浏览器端本地执行，响应流畅无卡顿。

---

## 🛠️ 技术架构

- **前端框架**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **文档引擎**: [OnlyOffice](https://www.onlyoffice.com/) WebAssembly 内核
- **云端存储**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- **边缘算力**: [Cloudflare Pages & Functions](https://pages.cloudflare.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **UI 组件**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## 💻 本地开发与构建

### 1. 环境准备
确保本地安装有 Node.js (≥ 18) 与 pnpm：
```bash
npm install -g pnpm
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 本地开发调试
```bash
pnpm dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 4. 生产构建
```bash
pnpm build
```

---

## 📄 开源许可证与技术声明

本项目遵循 **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)** 开源许可证。

- 本项目基于开源的 OnlyOffice 核心与社区生态成果深度定制开发。
- 遵循 AGPL-3.0 协议规定，保留原作者的开源版权信息与许可证声明，任何基于本项目的衍生作品亦须以 AGPL-3.0 协议开源。
