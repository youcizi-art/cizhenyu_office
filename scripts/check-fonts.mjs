import fs from "fs";

const content = fs.readFileSync("./public/v9.3.0.24-1/sdkjs/common/AllFonts.js", "utf8");
const match = content.match(/window\["__fonts_files"\]\s*=\s*\[([\s\S]*?)\];/);
if (match) {
  const list = JSON.parse("[" + match[1] + "]");
  console.log("Total fonts files in AllFonts.js:", list.length);
  console.log("Sample:", list.slice(0, 10), "...", list.slice(-5));
} else {
  console.log("Not found");
}
