import { marked } from "marked";
import { enrichContentHtml } from "./enrichContentHtml";
import { prepareMarkdownForRender } from "../kernel/markdownSpacing";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const raw = marked.parse(prepareMarkdownForRender(markdown));
  const html = typeof raw === "string" ? raw : String(raw);
  return enrichContentHtml(html);
}
