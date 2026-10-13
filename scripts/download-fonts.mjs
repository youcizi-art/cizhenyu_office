import fs from "fs";
import path from "path";

const UPSTREAM = "https://office-editor.ziziyi.com";
const PUBLIC_DIR = path.resolve("./public");

// 1. 读取 AllFonts.js 获取所有字体文件 ID
const allFontsFile = path.join(PUBLIC_DIR, "v9.3.0.24-1/sdkjs/common/AllFonts.js");
const content = fs.readFileSync(allFontsFile, "utf8");
const match = content.match(/window\["__fonts_files"\]\s*=\s*\[([\s\S]*?)\];/);

if (!match) {
  console.error("未能从 AllFonts.js 中解析到字体文件列表！");
  process.exit(1);
}

const fontIds = JSON.parse("[" + match[1] + "]");
console.log(`共发现 ${fontIds.length} 个字体文件需要同步`);

// 待下载列表（相对路径）
const tasks = [
  "v9.3.0.24-1/sdkjs/common/Images/fonts_thumbnail_ea.png.bin",
  "v9.3.0.24-1/sdkjs/common/Images/fonts_thumbnail.png.bin",
  ...fontIds.map((id) => `v9.3.0.24-1/fonts/${id}`),
];

console.log(`总共待处理资源项: ${tasks.length}`);

async function downloadOne(relPath) {
  const localPath = path.join(PUBLIC_DIR, relPath);
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
    return { path: relPath, status: "exists" };
  }

  const url = `${UPSTREAM}/${relPath}`;
  for (let retry = 0; retry < 3; retry++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return { path: relPath, status: "404" };
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, buf);
      return { path: relPath, status: "downloaded", size: buf.length };
    } catch (e) {
      if (retry === 2) {
        return { path: relPath, status: "error", error: e.message };
      }
      await new Promise((r) => setTimeout(r, 1000 * (retry + 1)));
    }
  }
}

async function main() {
  const concurrency = 15;
  let idx = 0;
  let downloadedCount = 0;
  let existsCount = 0;
  let failedCount = 0;

  async function worker() {
    while (idx < tasks.length) {
      const current = tasks[idx++];
      const res = await downloadOne(current);
      if (res.status === "downloaded") {
        downloadedCount++;
        console.log(`[下载成功 ${downloadedCount}] ${res.path} (${(res.size / 1024).toFixed(1)} KB)`);
      } else if (res.status === "exists") {
        existsCount++;
      } else {
        failedCount++;
        console.error(`[下载失败] ${res.path}: ${res.status} ${res.error || ""}`);
      }
    }
  }

  console.log(`开始并发下载 (并发数: ${concurrency})...`);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\n下载完成！`);
  console.log(`- 新下载: ${downloadedCount}`);
  console.log(`- 已存在: ${existsCount}`);
  console.log(`- 失败/不存在: ${failedCount}`);
}

main().catch(console.error);
