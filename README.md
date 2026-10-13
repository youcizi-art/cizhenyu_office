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

Deeply integrated with **Cloudflare R2** object storage and **Cloudflare Pages Functions**, CIZHENYU Office delivers multi-level tree categorization, silent Ctrl+S cloud auto-save, password-protected access control, and password-free read-only public sharing links.

---

## ✨ Key Features

- **📂 Multi-Format High-Fidelity Editing**: Native support for `.docx`, `.xlsx`, `.pptx`, and `.pdf` with precise rendering, formulas, and chart manipulation.
- **🌲 Tree-Structured Categorization**: Collapsible sidebar in `/documents` supporting nested multi-level folders, compact icon navigation mode, sub-category creation, renaming, deletion, and document counting.
- **📱 Mobile-First Responsive UX**: Dedicated mobile slide-out drawer (Sheet) for category trees, horizontal scroll quick-pills, and touch-optimized action cards.
- **☁️ Cloudflare R2 Cloud Storage**: Persistent cloud storage directly bound to R2 buckets, enabling fast search, editing, and reliable archiving.
- **📤 Local Document Upload**: One-click upload from your local drive with category selection in the documents dashboard.
- **🔗 Secure Public Sharing**: Generate password-free, read-only download links for external guests.
- **🔐 Secret-Key Access Control**: Edge-level password verification implemented via Cloudflare Pages Functions.
- **⚡ Local-First Performance**: Core rendering engine runs in the browser, offering sub-millisecond local latency.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, Static Export)
- **Document Engine**: [OnlyOffice](https://www.onlyoffice.com/) WebAssembly kernel
- **Cloud Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) Object Storage
- **Serverless Compute**: [Cloudflare Pages & Functions](https://pages.cloudflare.com/) Edge Functions
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## ⚙️ Environment Variables & Bindings Reference

| Binding / Variable Type | Variable Name | Required | Example Value | Description |
| :--- | :--- | :---: | :--- | :--- |
| **R2 Bucket Binding**<br>`(Functions Binding)` | `DOCUMENTS_BUCKET` | **Required** | Select your bucket (e.g. `office-ycz-me`) | Binds your Cloudflare R2 bucket. Backend Functions use this to persist documents and catalog metadata. |
| **Environment Variable / Secret**<br>`(App Secret)` | `PASSWORD`<br>*(or `ACCESS_KEY`)* | Optional | `MySecretPassword2026!` | **Global Access Key / Password**.<br>• **If configured**: Visitors must enter this password to unlock access (issued 30-day HMAC token);<br>• **If omitted**: Open public mode without authentication. |

> [!TIP]
> Variable names must be strictly typed as **`DOCUMENTS_BUCKET`** and **`PASSWORD`** (uppercase).

---

## 🚀 Deployment Guide (Cloudflare Pages + R2)

### Step 1: Create a Cloudflare R2 Bucket

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **R2**, then click **Create bucket**.
3. Name your bucket (e.g., `office-ycz-me`), choose an automatic or nearby location, and click **Create bucket**.

---

### Step 2: Deploy to Cloudflare Pages

Choose either Option A (Git Integration) or Option B (Wrangler CLI):

#### Option A: Deploy via GitHub / GitLab (Recommended for CI/CD)

1. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> switch to the **Pages** tab -> click **Connect to Git**.
2. Select your repository and configure build settings:
   - **Project name**: `office-website`
   - **Production branch**: `main`
   - **Framework preset**: `None` (or `Next.js (Static HTML Export)`)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `out`
3. Expand **Environment variables**, and add the build dependency:
   - Variable: `NODE_VERSION`, Value: `20` (or higher)
4. Click **Save and Deploy**.

#### Option B: Deploy via Wrangler CLI

1. Build locally:
   ```bash
   pnpm install
   pnpm run build
   ```
   This generates the `./out` static directory.
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

1. In Cloudflare Dashboard, go to **Workers & Pages** -> click your Pages project (e.g., `office-website`).
2. Navigate to **Settings** -> select **Functions** from the sub-menu.
3. Scroll down to **R2 bucket bindings**, and click **Add binding**.
4. Configure the following:
   - **Variable name**: `DOCUMENTS_BUCKET` *(must be exact)*
   - **R2 bucket**: Select your created bucket (e.g., `office-ycz-me`)
5. Click **Save**.

---

### Step 4: Configure Access Password (Recommended)

To protect your cloud documents with private authentication:

1. Navigate to **Settings** -> **Environment variables**.
2. Under "Production", click **Add variable**:
   - **Variable name**: `PASSWORD` *(or `ACCESS_KEY`)*
   - **Value**: Your private password (e.g., `Admin@Pass123`)
   - Click **Encrypt** to store it as a secure secret.
3. Click **Save**.

> [!NOTE]
> If you add R2 bindings or variables after the initial build, navigate to **Deployments**, locate your latest deployment, and click **Redeploy** to apply changes to edge functions.

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

### 2. Password prompt appears and reject valid keys?
* **Cause**: Input doesn't match the `PASSWORD` environment variable.
* **Fix**: Verify the value in Pages **Settings -> Environment variables**. To remove authentication, delete the `PASSWORD` variable and redeploy.

---

## 📄 License & Attribution

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)**.

- Built upon the open-source OnlyOffice core and community ecosystem.
- Compliant with AGPL-3.0 copyleft requirements: copyright notices and the full license text are preserved. Any derivative work must remain open source under the AGPL-3.0 license.
