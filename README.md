<p align="center">
  <img src="./public/logo.svg" width="100" height="100" alt="CIZHENYU Office Logo">
</p>

<h1 align="center">CIZHENYU Office</h1>

<p align="center">
  <strong>Modern, High-Performance Private Online Office Suite & Cloud Digital Asset Platform.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Framework-Next.js%2016-black.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Storage-Cloudflare%20R2-orange.svg" alt="Storage">
  <img src="https://img.shields.io/badge/Database-Cloudflare%20D1-yellow.svg" alt="Database">
  <img src="https://img.shields.io/badge/License-AGPL%20v3-green.svg" alt="License">
</p>

<p align="center">
  <a href="https://o.ycz.me/"><strong>🚀 Live Demo (o.ycz.me)</strong></a> | <a href="README.zh-CN.md">简体中文</a> | <span>English</span>
</p>

<p align="center">
  <strong>Quick Create:</strong>
  <a href="https://o.ycz.me/editor?new=docx">📄 Word Document</a> | 
  <a href="https://o.ycz.me/editor?new=xlsx">📊 Excel Spreadsheet</a> | 
  <a href="https://o.ycz.me/editor?new=pptx">📽️ PowerPoint Presentation</a> | 
  <a href="https://o.ycz.me/editor?new=md">📝 Markdown Document</a>
</p>

---

## 🚀 Overview

**CIZHENYU Office** is a private, lightweight online office and cloud asset management platform engineered with WebAssembly and cloud-native serverless architecture.

Without installing heavy desktop software or provisioning expensive dedicated backends, users can instantly access desktop-grade typography, calculations, and document collaboration in any modern browser.

Built on the **Cloudflare Pages + Functions + R2 + D1** ecosystem, the application provides zero server maintenance overhead, sub-second global edge routing, and a multi-tiered security model.

---

## ✨ Comprehensive Feature Matrix

### 1. 📂 Core Office Suite & High-Fidelity Rendering
- **Native Document Formats**: Full editing support for `.docx`, `.xlsx`, and `.pptx` with high-fidelity formatting, tables, formula calculations, and chart manipulation.
- **Legacy Compatibility**: Smooth viewing and compatibility for legacy `.doc`, `.xls`, and `.ppt` formats.
- **Integrated PDF Reader**: Built-in PDF reader with pinch-to-zoom, text search, and fluid page navigation.
- **Wasm Offline Kernel**: Powered by the OnlyOffice WebAssembly engine directly in browser memory without sending document binaries to third-party conversion servers.
- **Ctrl+S Silent Cloud Save**: Hit `Ctrl + S` (or `Cmd + S` on macOS) to stream document changes directly to Cloudflare R2 via edge Functions.

### 2. 📝 Immersive Markdown Studio & Smart TOC Share View
- **Three Editing Modalities**: Quick switching among "What You See Is What You Get (WYSIWYG)", "Instant Rendering (IR)", and "Split View (SV)".
- **Synchronized Split Scrolling**: Real-time two-way synchronized scrolling between source and preview panes, with full support for KaTeX math formulas, code syntax highlighting, task lists, and footnotes.
- **Public Share View Experience**:
  - **Smart Sticky TOC**: Automatically parses document heading hierarchy and presents a sticky table of contents that floats smoothly in the right viewport, dynamically highlighting the active section based on reading progress.
  - **Deadlock-Free Scrolling**: Completely eliminates the browser scroll rebound glitch, ensuring fluid downward scrolling while allowing the TOC panel to navigate independently.
  - **Productivity Utilities**: Single-click Markdown raw text copying, original file download, and responsive slide-out drawer on mobile viewports.

### 3. 🖼️ Universal Asset Management & Multimedia Playback
- **Universal Format Support**: Manage any file format without restriction, from images and media files to compressed archives and binary packages.
- **Dedicated Media Player & Preview**:
  - **Images**: Seamless zoomable previews for JPG, PNG, GIF, WebP, SVG, and AVIF.
  - **Videos**: Built-in player for MP4, WebM, and MOV videos.
  - **Audio**: Inline music card player for MP3, WAV, OGG, AAC, and FLAC.
- **Fullscreen Public Media Preview**: When "Web Preview" is selected, recipients enjoy direct fullscreen multimedia playback and gallery rendering (instant public view, or unlocked upon passcode verification).
- **Non-Editable File Details Modal (FileDetailsModal)**: For files like `.zip` or `.exe`, clicking opens a rich metadata card displaying file size, creation timestamp, category, and tags, with quick actions for download, rename, category move, tag editing, and deletion.

### 4. 📑 Server-Side Physical Pagination & Multi-Dimensional Filtering
- **Real Server-Side Pagination**: Physical page querying on `/documents` with configurable page sizes (10, 20, 30, 40, 50, 100 items/page), keeping memory consumption low even with massive asset catalogs.
- **Multi-Dimensional Query Filtering**:
  - **Keyword Search**: Instant live matching on document titles.
  - **Format Quick-Pills**: Quick filtering for Word, Excel, PPT, PDF, Markdown, Image, Video, Audio, or Other files.
  - **Recursive Category Trees**: Selecting any folder automatically queries documents belonging to that category and all of its descendants.
  - **Tag Taxonomy**: Combine custom tags for granular categorization.
- **Ordering & Drag Reordering**:
  - **Pin to Top**: Mark crucial files with persistent top pinning.
  - **0.25s Touch & Drag Reorder**: Press and hold any card for 0.25 seconds to drag and reorder documents, persisting custom order straight to storage.

### 5. 📱 Mobile-First Immersive Experience
- **Collapsible Action Header**: Desktop search bars and upload buttons collapse into compact icons on mobile screens. Tapping opens a floating search drawer that tucks away when not needed.
- **Zero Space Wasted**: Drag hint rows are hidden on mobile to provide over 100px of extra vertical space for document cards.
- **Compact Numeric Pagination**: Clean `1 - 20 / 255` format with minimalistic navigation arrows that never wrap or push cards off screen.
- **`100dvh` Viewport Clearance**: Styled with modern dynamic viewport height (`dvh`) and custom bottom padding to guarantee the pagination bar stays clear of the floating mobile navigation bar (`MobileNav`) across iOS Safari and Android Chrome.

### 6. 🔗 Multi-Tiered Secure Public Sharing
- **Direct Public Download**: Instant link generation for frictionless file distribution.
- **4~8 Digit Passcode Protection**: Enforce access control with auto-generated randomized security keys.
- **Dual Share Modes**: Seamlessly toggle between "Direct Download" and "Web Preview (Online Reading)" for Markdown and multimedia documents.
- **Debounced Loading States**: Smooth animated spinners and disabled submit buttons eliminate accidental double submissions and page freeze perceptions.

### 7. 🌐 Global Localization (i18n)
- **English Default Fallback**: English serves as the primary base across all keys, eliminating hardcoded strings.
- **50+ Worldwide Locales**: Automatic locale detection based on browser and OS preferences.
- **Instant Language Switcher**: Fast-switching language menu available on the main header, share view, and media viewer, with full native support for **English**, **Simplified Chinese**, **Traditional Chinese**, **Japanese**, **Korean**, **Spanish**, **German**, and **French**.

### 8. ☁️ Cloudflare R2 + D1 Dual-Engine Architecture
- **Pure Serverless Architecture**: Next.js `output: 'export'` static build deployed onto Cloudflare Pages for true zero-server maintenance.
- **Dual-Engine Persistence**:
  - **Native R2 Engine**: Zero external database dependency, directly persisting document binaries and JSON metadata indexes in R2.
  - **Cloudflare D1 SQL Extension**: Comes with `./d1/schema.sql` ready to migrate onto Cloudflare D1 for large-scale relational queries.
- **Dual-Channel Access Keys**: Protection via `.env.local` build-time injection (100% immune to runtime variable loss) alongside Cloudflare environment variables.

---

## 🛠️ Architecture & Tech Stack

| Domain | Technology | Highlights |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, Static Export) | Sub-second page loads & static caching |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) v4 & [Lucide Icons](https://lucide.dev/) | Modern design tokens, dark mode, and glassmorphism |
| **Office Core Engine** | [OnlyOffice](https://www.onlyoffice.com/) WebAssembly SDK | High-fidelity client-side document processing |
| **Markdown Engine** | [Vditor](https://github.com/Vanessa219/vditor) | Dual-mode rich editing & preview synchronization |
| **Object Storage** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) | S3-compatible, zero-egress fee edge storage |
| **Relational Database**| [Cloudflare D1](https://developers.cloudflare.com/d1/) | Serverless SQLite database for structured data |
| **Serverless Compute** | [Cloudflare Pages Functions](https://pages.cloudflare.com/) | Edge serverless API routes running across 300+ PoPs |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, predictable client store |
| **Internationalization**| [next-intl](https://next-intl.dev/) | Universal multi-locale routing and message extraction |

---

## ⚙️ Configuration & Environment Variables

| Variable / Binding | Key Name | Required | Example | Description |
| :--- | :--- | :---: | :--- | :--- |
| **R2 Bucket Binding** | **`DOCUMENTS_BUCKET`** | **Yes** | `office-ycz-me` | Cloudflare R2 bucket binding used by Functions to store document binaries and index data. |
| **D1 Database Binding** | **`DB`** | No | `office-d1` | Cloudflare D1 binding to run native SQL queries. If unbound, R2 storage engine acts as fallback. |
| **Build-Time Access Key** | **`NEXT_PUBLIC_ACCESS_KEY`**<br>*(Recommended)* | No | `MySecretKey2026!` | **Most reliable access secret**.<br>• Set inside `.env.local`;<br>• Injected during build time, **100% immune to runtime variable drops**;<br>• Automatically ignored by Git (`.gitignore`). |
| **Runtime Access Key** | **`PASSWORD`**<br>*(or `ACCESS_KEY`)* | No | `MySecretKey2026!` | Cloudflare Pages runtime environment variable / Secret for secondary edge gatekeeping. |

---

## 🚀 Deployment Guide (Cloudflare Pages + R2)

### Step 1: Create a Cloudflare R2 Bucket

1. Sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com/);
2. Navigate to **R2** from the sidebar and click **Create bucket**;
3. Name your bucket (e.g., `office-ycz-me`) and click **Create bucket**.

---

### Step 2: Deploy to Cloudflare Pages

Choose either of the two deployment methods:

#### Option A: GitHub / GitLab Integration (Recommended for CI/CD)

1. Go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**;
2. Select your repository:
   - **Project name**: `office-website`
   - **Production branch**: `main`
   - **Framework preset**: `None` (or `Next.js (Static HTML Export)`)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `out`
3. Expand **Environment variables** and configure:
   - `NODE_VERSION`: `20` (or higher)
   - `NEXT_PUBLIC_ACCESS_KEY`: `your_access_password`
4. Click **Save and Deploy**.

#### Option B: Deploy via Wrangler CLI

1. Create `.env.local` locally with your `NEXT_PUBLIC_ACCESS_KEY`, then build:
   ```bash
   pnpm install
   pnpm run build
   ```
2. Verify R2 binding settings in `wrangler.json`:
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

### Step 3: Bind the R2 Bucket (Required)

1. Open your Pages project in Cloudflare Dashboard;
2. Go to **Settings** -> **Functions**;
3. Scroll down to **R2 bucket bindings** and click **Add binding**;
4. Set:
   - **Variable name**: `DOCUMENTS_BUCKET` *(Must be uppercase)*
   - **R2 bucket**: Select your bucket (e.g., `office-ycz-me`)
5. Click **Save** and trigger a **Redeploy** on the Deployments tab to activate changes.

---

### Step 4: Configure Cloudflare D1 Database (Optional)

1. Create a D1 database with Wrangler:
   ```bash
   npx wrangler d1 create office-d1
   ```
2. Execute migration schema:
   ```bash
   npx wrangler d1 execute office-d1 --file=./d1/schema.sql
   ```
3. In Cloudflare Pages, navigate to **Settings** -> **Functions** -> **D1 database bindings**, add variable `DB` mapped to `office-d1`, and redeploy.

---

## 💻 Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure access key
cp .env.example .env.local

# 3. Start development server
pnpm dev

# 4. Production build test
pnpm build
```

---

## 📄 License

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE.txt)**.
