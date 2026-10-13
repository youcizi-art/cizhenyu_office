import fs from "fs";
import path from "path";

const UPSTREAM = "https://office-editor.ziziyi.com";
const PUBLIC_DIR = path.resolve("./public");

const editors = ["documenteditor", "spreadsheeteditor", "presentationeditor", "pdfeditor", "visioeditor"];
const variants = ["main", "mobile", "embed"];

const allModules = new Set();

for (const ed of editors) {
  for (const v of variants) {
    const appPath = path.join(PUBLIC_DIR, `v9.3.0.24-1/web-apps/apps/${ed}/${v}/app.js`);
    if (!fs.existsSync(appPath)) continue;
    const content = fs.readFileSync(appPath, "utf8");

    const regex = /["']((?:common|documenteditor|spreadsheeteditor|presentationeditor|pdfeditor|visioeditor)\/[a-zA-Z0-9_\-\/]+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      allModules.add(match[1]);
    }
  }
}

// 还要特别保证每个编辑器的 main/code.js
for (const ed of editors) {
  allModules.add(`${ed}/main/code`);
  allModules.add(`${ed}/mobile/code`);
  allModules.add(`${ed}/embed/code`);
}

console.log(`在所有 app.js 中发现潜在模块名: ${allModules.size} 个`);

async function checkAndDownload() {
  const missing = [];
  for (const mod of allModules) {
    const relFile = `v9.3.0.24-1/web-apps/apps/${mod}.js`;
    const localFile = path.join(PUBLIC_DIR, relFile);
    if (!fs.existsSync(localFile)) {
      missing.push(relFile);
    }
  }

  console.log(`待检查/补齐的模块文件: ${missing.length} 个`);

  let downloaded = 0;
  let notFound = 0;
  let idx = 0;
  const concurrency = 15;

  async function worker() {
    while (idx < missing.length) {
      const rel = missing[idx++];
      const url = `${UPSTREAM}/${rel}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const local = path.join(PUBLIC_DIR, rel);
          fs.mkdirSync(path.dirname(local), { recursive: true });
          fs.writeFileSync(local, buf);
          downloaded++;
          console.log(`[成功补齐] (${downloaded}) ${rel} (${(buf.length / 1024).toFixed(1)} KB)`);
        } else {
          notFound++;
        }
      } catch (e) {
        notFound++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\n扫描完成！下载: ${downloaded}, 上游不存在/跳过: ${notFound}`);
}

checkAndDownload().catch(console.error);
