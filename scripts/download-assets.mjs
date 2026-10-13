import fs from "fs";
import path from "path";

const UPSTREAM = "https://office-editor.ziziyi.com";
const PUBLIC_DIR = path.resolve("./public");

// 待下载集合（相对于 public/）
const queue = new Set();
const processed = new Set();

// 1. 扫描 public 下所有 HTML 中的引用
function scanHtml(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanHtml(fullPath);
    } else if (entry.name.endsWith(".html")) {
      const content = fs.readFileSync(fullPath, "utf8");
      // 匹配 src="..." 和 href="..."
      const matches = content.matchAll(/(?:src|href)=["']([^"']+)["']/g);
      for (const m of matches) {
        const urlPath = m[1].split("?")[0].split("#")[0];
        if (
          !urlPath.startsWith("http://") &&
          !urlPath.startsWith("https://") &&
          !urlPath.startsWith("data:") &&
          !urlPath.startsWith("#")
        ) {
          let resolved;
          if (urlPath.startsWith("/")) {
            resolved = path.join(PUBLIC_DIR, urlPath.slice(1));
          } else {
            resolved = path.resolve(dir, urlPath);
          }
          const rel = path.relative(PUBLIC_DIR, resolved).replace(/\\/g, "/");
          if (rel.startsWith("v9.3.0.24-1/")) {
            queue.add(rel);
          }
        }
      }
    }
  }
}

scanHtml(PUBLIC_DIR);

// 2. 预置已知的核心文件
const editors = [
  "documenteditor",
  "spreadsheeteditor",
  "presentationeditor",
  "pdfeditor",
  "visioeditor",
];

const variants = ["main", "mobile", "embed"];

for (const ed of editors) {
  for (const va of variants) {
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/${va}/app.js`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/${va}/resources/css/app.css`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/${va}/resources/css/app-mobile.css`);
  }
  // 语言包 (OnlyOffice 会尝试两处路径：main/locale 和 main/resources/locale)
  for (const lang of ["zh-CN", "zh", "en", "ru", "fr", "de", "es", "ja", "pt", "it"]) {
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/locale/${lang}.json`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/locale/${lang}.json`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/help/${lang}/help.json`);
  }

  // 图标 SVG
  const scales = ["", "@1.25x", "@1.5x", "@1.75x", "@2x", "@2.5x"];
  for (const s of scales) {
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/v2/iconsbig${s}.svg`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/v2/iconshuge${s}.svg`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/v2/iconssmall${s}.svg`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/iconsbig${s}.svg`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/iconshuge${s}.svg`);
    queue.add(`v9.3.0.24-1/web-apps/apps/${ed}/main/resources/img/iconssmall${s}.svg`);
  }
}

const commonScales = ["", "@1.25x", "@1.5x", "@1.75x", "@2x", "@2.5x"];
for (const s of commonScales) {
  queue.add(`v9.3.0.24-1/web-apps/apps/common/main/resources/img/doc-formats/formats${s}.svg`);
}

const vendors = [
  "requirejs/require.js",
  "jquery/jquery.min.js",
  "socketio/socket.io.min.js",
  "xregexp/xregexp-all-min.js",
  "underscore/underscore-min.js",
  "jszip/jszip.min.js",
  "sockjs/sockjs.min.js",
  "cryptojs/cryptojs.worker.min.js",
  "hammer/hammer.min.js",
];
for (const v of vendors) {
  queue.add(`v9.3.0.24-1/web-apps/vendor/${v}`);
}

const sdkEngines = ["word", "cell", "slide", "pdf", "visio"];
for (const eng of sdkEngines) {
  queue.add(`v9.3.0.24-1/sdkjs/${eng}/sdk-all-min.js`);
  queue.add(`v9.3.0.24-1/sdkjs/${eng}/sdk-all.js`);
  queue.add(`v9.3.0.24-1/sdkjs/${eng}/css/main.css`);
  queue.add(`v9.3.0.24-1/sdkjs/${eng}/css/main-mobile.css`);
}

const commonSdks = [
  "v9.3.0.24-1/sdkjs/common/AllFonts.js",
  "v9.3.0.24-1/sdkjs/common/spell/spell/spell.js",
  "v9.3.0.24-1/sdkjs/common/Charts/ChartStyles.js",
  "v9.3.0.24-1/sdkjs/common/libfont/engine/fonts.js",
  "v9.3.0.24-1/sdkjs/common/Images/cursors/svg.json",
  "v9.3.0.24-1/web-apps/apps/api/documents/api.js",
  "v9.3.0.24-1/web-apps/common/main/lib/util/fix-ie-compat.js",
  "v9.3.0.24-1/sdkjs/vendor/string.js",
];
for (const c of commonSdks) {
  queue.add(c);
}

// 控件与占位图片
const commonImages = [
  "icons/anchor.png",
  "content_controls/toc.png",
  "content_controls/toc_active.png",
  "content_controls/img.png",
  "content_controls/img_active.png",
  "content_controls/signature.png",
  "placeholders/image.png",
  "placeholders/image_url.png",
  "placeholders/table.png",
  "placeholders/table_active.png",
  "placeholders/audio.png",
  "placeholders/video.png",
  "placeholders/smartart.png",
  "placeholders/smartart_active.png",
  "placeholders/chart.png",
  "placeholders/chart_active.png",
];
for (const img of commonImages) {
  queue.add(`v9.3.0.24-1/sdkjs/common/Images/${img}`);
}

// 3. 从已下载的 CSS/JS 中提取额外子资源（例如 url(...) 中的图片与字体）
function extractSubResources(relPath, buffer) {
  if (relPath.endsWith(".css")) {
    const text = buffer.toString("utf8");
    const matches = text.matchAll(/url\((?:['"]?)([^'"()]+)(?:['"]?)\)/g);
    for (const m of matches) {
      const url = m[1].trim();
      if (!url.startsWith("data:") && !url.startsWith("http://") && !url.startsWith("https://")) {
        const cleanUrl = url.split("?")[0].split("#")[0];
        const absDir = path.dirname(path.join(PUBLIC_DIR, relPath));
        const resolved = path.resolve(absDir, cleanUrl);
        const childRel = path.relative(PUBLIC_DIR, resolved).replace(/\\/g, "/");
        if (childRel.startsWith("v9.3.0.24-1/") && !processed.has(childRel)) {
          queue.add(childRel);
        }
      }
    }
  }
}

async function downloadFile(relPath) {
  const localPath = path.join(PUBLIC_DIR, relPath);
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 10) {
    const buffer = fs.readFileSync(localPath);
    extractSubResources(relPath, buffer);
    return { path: relPath, status: "exists" };
  }

  const remoteUrl = `${UPSTREAM}/${relPath}`;
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) {
      return { path: relPath, status: `http_${res.status}` };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    extractSubResources(relPath, buffer);
    return { path: relPath, status: "downloaded", size: buffer.length };
  } catch (err) {
    return { path: relPath, status: "error", error: err.message };
  }
}

// 并发下载执行器
async function run() {
  console.log(`初始队列大小: ${queue.size}`);
  let successCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  const concurrency = 10;
  
  while (true) {
    // 找出未处理的项目
    const pending = Array.from(queue).filter((x) => !processed.has(x));
    if (pending.length === 0) break;

    console.log(`\n本轮待下载项: ${pending.length} 项 (并发: ${concurrency})...`);
    let idx = 0;

    async function worker() {
      while (idx < pending.length) {
        const item = pending[idx++];
        processed.add(item);
        const result = await downloadFile(item);
        if (result.status === "downloaded") {
          successCount++;
          console.log(`[成功下载] (${successCount}) ${result.path} (${(result.size / 1024).toFixed(1)} KB)`);
        } else if (result.status === "exists") {
          skippedCount++;
        } else {
          notFoundCount++;
          // console.warn(`[跳过或不存在] ${result.path} - ${result.status}`);
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  console.log(`\n全部下载完成！`);
  console.log(`- 下载成功: ${successCount}`);
  console.log(`- 本地已存在: ${skippedCount}`);
  console.log(`- 404或跳过: ${notFoundCount}`);
}

run().catch(console.error);
