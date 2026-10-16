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
  <a href="https://o.ycz.me/editor?new=pptx">📽️ PowerPoint</a> | 
  <a href="https://o.ycz.me/editor?new=md">📝 Markdown</a>
</p>

---

## 🚀 Overview

**CIZHENYU Office** is a powerful online office and document management system built on WebAssembly and modern cloud-native architectures. Without needing bulky desktop applications, you get desktop-class typography, editing, and calculation capabilities directly inside your browser.

Deeply integrated with **Cloudflare R2** object storage and **Cloudflare Pages Functions**, CIZHENYU Office delivers multi-level tree categorization, silent Ctrl+S cloud auto-save, dual-channel access key protection (supporting `.env` build-time injection and Pages runtime), and password-free read-only public sharing links.

---

## ✨ Key Features

- **📂 Multi-Format High-Fidelity Editing**: Native support for `.docx`, `.xlsx`, `.pptx`, and `.pdf` with precise rendering, formulas, and chart manipulation.
- **📝 High-Performance Markdown Studio**: Built-in lightweight Markdown editor featuring real-time synchronized split-pane preview, undo/redo history, formatting toolbar (headings, code blocks, tables, task lists), and live word/character statistics.
- **🖼️ Universal File & Media Management**: Upload any file format without restriction. Media files (Images: JPG, PNG, GIF, WebP, SVG, AVIF; Videos: MP4, WebM; Audio: MP3, WAV, OGG, AAC) have dedicated visual badges and inline preview/playback.
- **📑 Server-Side Filtering & Pagination**: The `/documents` dashboard features true server-side pagination with customizable page sizes (10, 20, 30, 40, 50, 100 items/page) and multi-dimensional server queries (keyword search, document types, nested categories, and tag filtering).
- **📋 Non-Editable File Details Modal**: Clicking on non-editable files opens a rich metadata card displaying file type, size, upload timestamp, category, and tags with quick actions for download, share, rename, move, and deletion.
- **🌲 Tree-Structured Categorization**: Collapsible sidebar in `/documents` supporting nested multi-level folders, compact icon navigation mode, sub-category creation, renaming, deletion, and document counting.
- **📱 Mobile-First Responsive UX**: Dedicated mobile slide-out drawer (Sheet) for category trees, horizontal scroll quick-pills, and touch-optimized action cards.
- **☁️ Cloudflare R2 & D1 Database Engine**: Persistent cloud storage directly bound to R2 buckets, with optional Cloudflare D1 SQL database support for scalable enterprise asset indexing.
- **🔗 Flexible Public Sharing**: Generate direct public download links, 4-character passcode protection, or web-view preview links for Markdown and media files.
- **🌐 Global Multi-Language System**: Full localization with English as the first-class default fallback across 50+ languages, complete with an instant language switcher on share pages.
- **🔐 Dual-Channel Access Key Protection**: Reliable secret-key protection supporting `.env` build-time injection or Cloudflare environment variables.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, Static Export)
- **Document Engine**: [OnlyOffice](https://www.onlyoffice.com/) WebAssembly kernel
- **Cloud Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) Object Storage
- **Database Engine**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (Optional Serverless SQLite Database)
- **Serverless Compute**: [Cloudflare Pages & Functions](https://pages.cloudflare.com/) Edge Functions
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## ⚙️ Environment Variables & Bindings Reference

| Binding / Variable Type | Variable Name | Required | Example Value | Description |
| :--- | :--- | :---: | :--- | :--- |
| **R2 Bucket Binding**<br>`(Functions Binding)` | **`DOCUMENTS_BUCKET`** | **Required** | Select your bucket (e.g. `office-ycz-me`) | Binds your Cloudflare R2 bucket. Backend Functions use this to persist documents and catalog metadata. |
| **D1 Database Binding**<br>`(Functions Binding)` | **`DB`** | Optional | Select your D1 database (e.g. `office-d1`) | Binds Cloudflare D1 for SQL-level querying. If omitted, the system seamlessly uses the R2 metadata index engine. |
| **Build-Time Access Key**<br>`(.env / Build Env)` | **`NEXT_PUBLIC_ACCESS_KEY`**<br>*(Recommended)* | Optional | `MySecretPassword2026!` | **Most reliable access key method**.<br>• Put in root `.env.local` or Cloudflare build variables;<br>• Embedded during build, **100% immune to runtime env loss**;<br>• Never committed to git (in `.gitignore`). |
| **Runtime Access Key**<br>`(Pages Functions Env)` | **`PASSWORD`**<br>*(or `ACCESS_KEY`)* | Optional | `MySecretPassword2026!` | Cloudflare Pages runtime secret for edge function authentication. |

---

## 🔐 Access Key Configuration (Recommended via `.env`)

In static-export Next.js projects, Cloudflare Pages runtime variables can sometimes fail to reach client-side components due to environment branch mismatches (Production vs Preview) or static packaging.

To guarantee that authentication is always enforced:

### Option 1: Use `.env.local` locally (Recommended & Most Reliable)

1. Create a `.env.local` file from [`.env.example`](.env.example):
   ```bash
   cp .env.example .env.local
   ```
2. Set your private access key inside `.env.local`:
   ```env
   NEXT_PUBLIC_ACCESS_KEY=your_secure_password
   ```
3. Run the build command:
   ```bash
   pnpm build
   ```
4. Deploy to Pages (e.g., `npx wrangler pages deploy out --project-name=office-website`).

> [!IMPORTANT]
> **Security Notice**:
> 1. `.env*` is already in `.gitignore`, so **`.env.local` is never committed to Git**;
> 2. The client uses SHA-256 hash comparison; visitors are immediately gated with an unlock card, granting a 30-day encrypted local session once unlocked.

---

### Option 2: Add as Build Environment Variable in Cloudflare Pages

If deploying via GitHub / GitLab integration:

1. Go to Cloudflare Dashboard -> **Workers & Pages** -> click your Pages project -> **Settings** -> **Environment variables**;
2. Under both **Production** and **Preview**, add:
   - Variable name: `NEXT_PUBLIC_ACCESS_KEY`
   - Value: `your_secure_password`
3. Click **Save**, then go to **Deployments** and click **Redeploy**.

---

## 🚀 Deployment Guide (Cloudflare Pages + R2)

### Step 1: Create a Cloudflare R2 Bucket

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/);
2. In the left navigation, click **R2**, then click **Create bucket**;
3. Name your bucket (e.g., `office-ycz-me`), choose an automatic or nearby location, and click **Create bucket**.

---

### Step 2: Deploy to Cloudflare Pages

#### Option A: Deploy via GitHub / GitLab (Recommended for CI/CD)

1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** tab -> **Connect to Git**;
2. Select your repository and configure build settings:
   - **Project name**: `office-website`
   - **Production branch**: `main`
   - **Framework preset**: `None` (or `Next.js (Static HTML Export)`)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `out`
3. Expand **Environment variables**, add:
   - `NODE_VERSION`: `20`
   - *(Optional access key)*: `NEXT_PUBLIC_ACCESS_KEY`: `your_password`
4. Click **Save and Deploy**.

#### Option B: Deploy via Wrangler CLI

1. Configure `.env.local` with `NEXT_PUBLIC_ACCESS_KEY`, then build:
   ```bash
   pnpm install
   pnpm run build
   ```
2. Verify `wrangler.json`:
   ```json
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "office-website",
     "compatibility_date": "2026-01-12",
     "pages_build_output_dir": "./out",
     "r2_buckets": [
       {
         "binding": "DOCUMENTS_BUCKET",
         "bucket_name": "your-r2-bucket-name"
       }
     ]
   }
   ```
3. Deploy to Pages:
   ```bash
   npx wrangler pages deploy out --project-name=office-website
   ```

---

### Step 3: Bind R2 Bucket (Mandatory)

1. In Cloudflare Dashboard, go to **Workers & Pages** -> click your Pages project;
2. Navigate to **Settings** -> select **Functions** from the sub-menu;
3. Scroll down to **R2 bucket bindings**, and click **Add binding**;
4. Configure:
   - **Variable name**: `DOCUMENTS_BUCKET` *(exact uppercase)*
   - **R2 bucket**: Select your bucket (e.g., `office-ycz-me`)
5. Click **Save** and trigger a **Redeploy**.

---

### Step 4: Set up Cloudflare D1 Database (Optional)

CIZHENYU Office features a dual-engine architecture: it works out-of-the-box with R2, and seamlessly upgrades to **Cloudflare D1 SQL Database** for large-scale document collections.

1. Create a D1 database using Wrangler:
   ```bash
   npx wrangler d1 create office-d1
   ```
2. Execute the initialization schema:
   ```bash
   npx wrangler d1 execute office-d1 --file=./d1/schema.sql
   ```
3. Bind D1 in Cloudflare Pages:
   - Go to **Settings -> Functions -> D1 database bindings**;
   - Add binding: **Variable name**: `DB`, **D1 database**: Select `office-d1`;
   - Trigger a **Redeploy**.

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

## ❓ Frequently Asked Questions (FAQ)

### 1. "Failed to load documents" or 500 error on `/documents`?
* **Cause**: R2 bucket binding is missing.
* **Fix**: Ensure `DOCUMENTS_BUCKET` is configured under Pages **Settings -> Functions -> R2 bucket bindings**, and trigger a **Redeploy**.

### 2. Password prompt doesn't appear even after setting `PASSWORD` in Cloudflare?
* **Cause**: Cloudflare Pages runtime variables may not reach static export pages due to environment mismatch.
* **Fix**: Create `.env.local` with `NEXT_PUBLIC_ACCESS_KEY=your_password`, run `pnpm build`, and redeploy.

---

## 📄 License & Attribution

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)**.

- Built upon the open-source OnlyOffice core and community ecosystem.
- Compliant with AGPL-3.0 copyleft requirements: copyright notices and the full license text are preserved. Any derivative work must remain open source under the AGPL-3.0 license.
