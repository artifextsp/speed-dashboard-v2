import { buildImageCandidates } from "./urlUtils";
import { preloadImageCandidates } from "./imageLoadCache";

const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\(([^)]+)\)/g;

export function extractMarkdownImageUrls(markdown) {
  if (!markdown) return [];
  const urls = new Set();
  for (const match of String(markdown).matchAll(IMAGE_MARKDOWN_RE)) {
    const raw = match[1]?.trim();
    if (raw) urls.add(raw);
  }
  return [...urls];
}

export function preloadMarkdownImages(markdown, { maxWidth = 640 } = {}) {
  const urls = extractMarkdownImageUrls(markdown);
  urls.forEach((url) => {
    const candidates = buildImageCandidates(url, { maxWidth });
    void preloadImageCandidates(candidates);
  });
}
