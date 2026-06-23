import { marked } from "marked";
import { enrichContentHtml } from "./enrichContentHtml";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const raw = marked.parse(markdown);
  const html = typeof raw === "string" ? raw : String(raw);
  return enrichContentHtml(html);
}
