/**
 * 针对 Markdown 内部内嵌 HTML（如表单控件、按钮、输入框）进行安全净化与交互样式增强
 * 允许 input, form, select, button, textarea, label 等富交互标签
 * 杜绝 script, on* 事件与 javascript: 伪协议
 */

export function sanitizeAndEnhanceHtml(rawHtml: string): string {
  if (typeof window === "undefined" || !rawHtml) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${rawHtml}</body>`, "text/html");
  const body = doc.body;

  // 1. 彻底移除潜在的脚本与危险元素
  const dangerousTags = ["script", "iframe", "object", "embed", "base", "meta", "link"];
  dangerousTags.forEach((tagName) => {
    const elements = Array.from(body.querySelectorAll(tagName));
    elements.forEach((el) => el.remove());
  });

  // 2. 遍历所有元素，清理危险属性 (on*, javascript:)
  const allElements = Array.from(body.querySelectorAll("*"));
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();

      // 清除内联事件处理函数 (onclick, onerror, onload...)
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
      // 清除 javascript: 伪协议
      if (
        (name === "href" || name === "src" || name === "action") &&
        val.startsWith("javascript:")
      ) {
        el.removeAttribute(attr.name);
      }
    });

    // 为表单交互控件注入现代 ChatGPT / Gemini 风格的高质感样式
    const tag = el.tagName.toLowerCase();
    if (tag === "form") {
      el.classList.add(
        "my-4",
        "p-4",
        "rounded-2xl",
        "border",
        "border-border",
        "bg-card/60",
        "shadow-xs",
        "flex",
        "flex-col",
        "gap-3"
      );
      // 阻止真实跳转刷新页面，只作为交互表单呈现
      el.setAttribute("onsubmit", "return false;");
    } else if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        el.classList.add(
          "w-4",
          "h-4",
          "rounded",
          "border-border",
          "text-primary",
          "focus:ring-primary/20",
          "cursor-pointer"
        );
      } else if (type === "submit" || type === "button") {
        el.classList.add(
          "px-3.5",
          "py-1.5",
          "rounded-lg",
          "bg-primary",
          "text-primary-foreground",
          "text-xs",
          "font-medium",
          "shadow-xs",
          "hover:bg-primary/90",
          "transition-all",
          "cursor-pointer"
        );
      } else {
        el.classList.add(
          "w-full",
          "px-3",
          "py-1.5",
          "rounded-lg",
          "border",
          "border-border",
          "bg-background",
          "text-foreground",
          "text-xs",
          "focus:outline-hidden",
          "focus:ring-2",
          "focus:ring-primary/20",
          "transition-all"
        );
      }
    } else if (tag === "select") {
      el.classList.add(
        "w-full",
        "px-3",
        "py-1.5",
        "rounded-lg",
        "border",
        "border-border",
        "bg-background",
        "text-foreground",
        "text-xs",
        "focus:outline-hidden",
        "focus:ring-2",
        "focus:ring-primary/20",
        "cursor-pointer"
      );
    } else if (tag === "textarea") {
      el.classList.add(
        "w-full",
        "p-3",
        "rounded-lg",
        "border",
        "border-border",
        "bg-background",
        "text-foreground",
        "text-xs",
        "focus:outline-hidden",
        "focus:ring-2",
        "focus:ring-primary/20"
      );
    } else if (tag === "button") {
      el.classList.add(
        "px-3.5",
        "py-1.5",
        "rounded-lg",
        "bg-primary",
        "text-primary-foreground",
        "text-xs",
        "font-medium",
        "shadow-xs",
        "hover:bg-primary/90",
        "transition-all",
        "cursor-pointer"
      );
    } else if (tag === "label") {
      el.classList.add(
        "text-xs",
        "font-semibold",
        "text-foreground/90",
        "flex",
        "items-center",
        "gap-2",
        "cursor-pointer"
      );
    }
  });

  return body.innerHTML;
}
