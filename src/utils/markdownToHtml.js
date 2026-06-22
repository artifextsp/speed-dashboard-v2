import { marked } from "marked";
import { normalizeUrl } from "../kernel/urlUtils";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function normalizeLinksInHtml(html) {
  return html.replace(/href="([^"]+)"/gi, (_match, url) => {
    const safe = normalizeUrl(url.replace(/&amp;/g, "&"));
    return `href="${safe}" target="_blank" rel="noopener noreferrer"`;
  });
}

export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const raw = marked.parse(markdown);
  return normalizeLinksInHtml(typeof raw === "string" ? raw : String(raw));
}
