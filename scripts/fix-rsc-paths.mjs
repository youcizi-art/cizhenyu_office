import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("./out");

/**
 * Next.js 16 在 Windows 平台静态导出时，会将点分隔的 RSC payload 路径导出为子目录结构，
 * 例如：out/editor/__next.editor/__PAGE__.txt
 * 但浏览器客户端发出的请求是扁平的点分隔路径：
 * 例如：/editor/__next.editor.__PAGE__.txt
 * 该脚本遍历 out 目录，自动生成扁平的点分隔文件别名副本，彻底解决 404 问题。
 */
function fixDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixDir(fullPath);

      // 如果当前目录名以 __next 开头，则将其下面的文件提升并用点连接
      if (entry.name.startsWith("__next")) {
        const subFiles = getAllFiles(fullPath);
        for (const subFile of subFiles) {
          const relToSub = path.relative(fullPath, subFile);
          // 将相对路径中的斜杠替换为点
          const flatName = `${entry.name}.${relToSub.replace(/[/\\]/g, ".")}`;
          const targetPath = path.join(dir, flatName);
          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(subFile, targetPath);
            console.log(`[RSC 修复] 创建别名: ${path.relative(OUT_DIR, targetPath)}`);
          }
        }
      }
    }
  }
}

function getAllFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

fixDir(OUT_DIR);
console.log("RSC 路径修复完成！");
