import fs from "fs";
import path from "path";

// 1. 生成 doc-formats 占位 SVG
const svgDir = path.resolve("./public/v9.3.0.24-1/web-apps/apps/common/main/resources/img/doc-formats");
fs.mkdirSync(svgDir, { recursive: true });
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"></svg>`;
const scales = ["", "@1.25x", "@1.5x", "@1.75x", "@2x", "@2.5x"];
for (const s of scales) {
  const p = path.join(svgDir, `formats${s}.svg`);
  fs.writeFileSync(p, svgContent, "utf8");
  console.log("Created SVG:", p);
}

// 2. 增强 HTML 中的 injectSvgIcons 容错性
function patchHtmls(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchHtmls(full);
    } else if (entry.name.endsWith(".html")) {
      let content = fs.readFileSync(full, "utf8");
      const target = 'child.setAttribute("data-sprite-uid",sprite_uid);el.appendChild(child);';
      const replacement = 'if(child&&child.setAttribute){child.setAttribute("data-sprite-uid",sprite_uid);el.appendChild(child);}';
      if (content.includes(target)) {
        content = content.replaceAll(target, replacement);
        fs.writeFileSync(full, content, "utf8");
        console.log("Patched HTML:", full);
      }
    }
  }
}
patchHtmls(path.resolve("./public/v9.3.0.24-1"));
console.log("SVG generation and HTML patching complete!");
