<p align="center">
  <img src="./public/logo.svg" width="100" height="100" alt="CIZHENYU Office Logo">
</p>

<h1 align="center">CIZHENYU Office</h1>

<p align="center">
  <strong>A modern, high-performance private online Office suite and cloud asset management platform.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/framework-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/storage-Cloudflare%20R2-orange.svg" alt="Storage">
  <img src="https://img.shields.io/badge/license-AGPL%20v3-green.svg" alt="License">
</p>

<p align="center">
  <a href="https://o.ycz.me/"><strong>🚀 Live Site (o.ycz.me)</strong></a> | <a href="README.zh-CN.md">简体中文</a> | <span>English</span>
</p>

<p align="center">
  <strong>Quick Create:</strong>
  <a href="https://o.ycz.me/editor?new=docx">📄 Word</a> | 
  <a href="https://o.ycz.me/editor?new=xlsx">📊 Excel</a> | 
  <a href="https://o.ycz.me/editor?new=pptx">📽️ PowerPoint</a>
</p>

---

## 🚀 Overview

**CIZHENYU Office** is a powerful online office and document management system built on WebAssembly and modern cloud-native architectures. Without needing bulky desktop applications, you get desktop-class typography, editing, and calculation capabilities directly inside your browser.

Deeply integrated with **Cloudflare R2** object storage, CIZHENYU Office delivers multi-level tree categorization, silent Ctrl+S cloud auto-save, and password-free read-only public sharing links.

---

## ✨ Key Features

- **📂 Multi-Format High-Fidelity Editing**: Native support for `.docx`, `.xlsx`, `.pptx`, and `.pdf` with precise rendering, formulas, and chart manipulation.
- **🌲 Tree-Structured Categorization**: Collapsible sidebar in `/documents` supporting nested multi-level folders, sub-category creation, renaming, deletion, and document counting.
- **☁️ Cloudflare R2 Storage**: Persistent cloud storage directly bound to R2 buckets, enabling fast search, editing, and reliable archiving.
- **📤 Local Document Upload**: One-click upload from your local drive with category selection in the documents dashboard.
- **🔗 Secure Public Sharing**: Generate password-free, read-only download links for external guests.
- **🔐 Secret-Key Access Control**: Edge-level password verification implemented via Cloudflare Pages Functions.
- **⚡ Local-First Performance**: Core rendering engine runs in the browser, offering sub-millisecond local latency.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Document Engine**: [OnlyOffice](https://www.onlyoffice.com/) WebAssembly kernel
- **Cloud Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- **Serverless Compute**: [Cloudflare Pages & Functions](https://pages.cloudflare.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## 💻 Local Development

### 1. Prerequisites
Ensure Node.js (≥ 18) and pnpm are installed:
```bash
npm install -g pnpm
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Development Server
```bash
pnpm dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
pnpm build
```

---

## 📄 License & Attribution

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)**.

- Built upon the open-source OnlyOffice core and community ecosystem.
- Compliant with AGPL-3.0 copyleft requirements: copyright notices and the full license text are preserved. Any derivative work must remain open source under the AGPL-3.0 license.
