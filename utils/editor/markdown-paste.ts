/**
 * HTML 转 Markdown 转换工具
 * 专门针对从 ChatGPT / Gemini / Claude 等 AI 界面复制的内容进行智能解析
 * 保留图片、表单控件 (<form>, <input>, <select>, <button>, <textarea>) 与结构化格式
 */

export function htmlToMarkdown(html: string): string {
  if (typeof window === "undefined" || !html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // 过滤掉不可见的辅助元素与脚本
    if (["script", "style", "meta", "link", "noscript"].includes(tag)) {
      return "";
    }

    // 处理表单及输入组件：直接保留为安全且高保真的 HTML 结构
    if (
      [
        "form",
        "input",
        "select",
        "option",
        "button",
        "textarea",
        "label",
        "fieldset",
        "legend",
      ].includes(tag)
    ) {
      // 清理潜在的不安全属性 (on* 事件处理器)
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith("on")) {
          el.removeAttribute(attr.name);
        }
      });

      // 如果是 input 标签，确保自闭合或标准输出
      if (tag === "input") {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        const checked = el.hasAttribute("checked") || (el as HTMLInputElement).checked ? " checked" : "";
        const name = el.getAttribute("name") ? ` name="${el.getAttribute("name")}"` : "";
        const value = el.getAttribute("value") ? ` value="${el.getAttribute("value")}"` : "";
        const placeholder = el.getAttribute("placeholder") ? ` placeholder="${el.getAttribute("placeholder")}"` : "";
        return `<input type="${type}"${name}${value}${placeholder}${checked} />`;
      }

      // 如果是 label 标签，保留其内部结构
      if (tag === "label") {
        const inner = Array.from(el.childNodes).map(traverse).join("");
        return `<label class="inline-flex items-center gap-1.5 cursor-pointer">${inner}</label>`;
      }

      return el.outerHTML;
    }

    // 收集子节点内容
    const childContent = Array.from(el.childNodes)
      .map((child) => traverse(child))
      .join("");

    switch (tag) {
      case "h1":
        return `\n\n# ${childContent.trim()}\n\n`;
      case "h2":
        return `\n\n## ${childContent.trim()}\n\n`;
      case "h3":
        return `\n\n### ${childContent.trim()}\n\n`;
      case "h4":
        return `\n\n#### ${childContent.trim()}\n\n`;
      case "h5":
        return `\n\n##### ${childContent.trim()}\n\n`;
      case "h6":
        return `\n\n###### ${childContent.trim()}\n\n`;
      case "p":
        return `\n\n${childContent.trim()}\n\n`;
      case "strong":
      case "b":
        return `**${childContent.trim()}**`;
      case "em":
      case "i":
        return `*${childContent.trim()}*`;
      case "del":
      case "s":
      case "strike":
        return `~~${childContent.trim()}~~`;
      case "code":
        // 如果是 pre 内部的 code，直接返回文本
        if (el.parentElement?.tagName.toLowerCase() === "pre") {
          return el.textContent || "";
        }
        return `\`${childContent.trim()}\``;
      case "pre": {
        const lang =
          el.querySelector("code")?.className.replace(/language-/, "") || "";
        const codeText = el.textContent || "";
        return `\n\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`;
      }
      case "blockquote":
        return `\n\n> ${childContent.trim().replace(/\n/g, "\n> ")}\n\n`;
      case "ul":
        return `\n\n${childContent.trim()}\n\n`;
      case "ol":
        return `\n\n${childContent.trim()}\n\n`;
      case "li": {
        const parent = el.parentElement?.tagName.toLowerCase();
        if (parent === "ol") {
          const index = Array.from(el.parentElement?.children || []).indexOf(el) + 1;
          return `${index}. ${childContent.trim()}\n`;
        }
        return `- ${childContent.trim()}\n`;
      }
      case "hr":
        return "\n\n---\n\n";
      case "a": {
        const href = el.getAttribute("href") || "#";
        const title = childContent.trim() || href;
        return `[${title}](${href})`;
      }
      case "img": {
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "image";
        if (!src) return "";
        return `![${alt}](${src})`;
      }
      case "table": {
        return convertTableToMarkdown(el);
      }
      case "br":
        return "\n";
      case "div":
      case "section":
      case "article":
      case "main":
        return childContent ? `\n${childContent}\n` : "";
      default:
        return childContent;
    }
  }

  function convertTableToMarkdown(tableEl: HTMLElement): string {
    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (rows.length === 0) return "";

    const markdownRows: string[] = [];
    let colCount = 0;

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      if (cells.length > colCount) colCount = cells.length;

      const cellTexts = cells.map((cell) =>
        (cell.textContent || "").trim().replace(/\|/g, "\\|")
      );
      markdownRows.push(`| ${cellTexts.join(" | ")} |`);

      // 在第一行（表头）后插入分隔行
      if (rowIndex === 0) {
        const separators = new Array(cells.length).fill("---");
        markdownRows.push(`| ${separators.join(" | ")} |`);
      }
    });

    return `\n\n${markdownRows.join("\n")}\n\n`;
  }

  const result = traverse(body);
  // 清洗多余空行
  return result.replace(/\n{3,}/g, "\n\n").trim();
}
