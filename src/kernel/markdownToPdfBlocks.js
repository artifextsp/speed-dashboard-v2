import { marked } from "marked";
import { normalizeUrl, extractYouTubeId, youtubeWatchUrl } from "./urlUtils";

function parseInline(tokens) {
  if (!tokens?.length) return [];
  const parts = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        parts.push({ type: "text", text: token.text });
        break;
      case "strong":
        parts.push(
          ...parseInline(token.tokens).map((p) => ({ ...p, bold: true }))
        );
        break;
      case "em":
        parts.push(
          ...parseInline(token.tokens).map((p) => ({ ...p, italic: true }))
        );
        break;
      case "del":
        parts.push(
          ...parseInline(token.tokens).map((p) => ({ ...p, strike: true }))
        );
        break;
      case "link": {
        const href = normalizeUrl(token.href);
        const ytId = extractYouTubeId(href);
        if (ytId) {
          parts.push({
            type: "video",
            text: token.text?.trim() || "Ver video en YouTube",
            url: youtubeWatchUrl(ytId),
          });
        } else {
          parts.push({
            type: "link",
            text: token.text?.trim() || href,
            href,
          });
        }
        break;
      }
      case "codespan":
        parts.push({ type: "text", text: token.text, code: true });
        break;
      case "br":
        parts.push({ type: "text", text: "\n" });
        break;
      case "image": {
        parts.push({
          type: "image",
          src: normalizeUrl(token.href),
          alt: token.text || "Imagen",
        });
        break;
      }
      default:
        if (token.raw) parts.push({ type: "text", text: token.raw });
        else if (token.text) parts.push({ type: "text", text: token.text });
    }
  }

  return parts;
}

function parseHtml(html) {
  const blocks = [];
  const iframeRe = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = iframeRe.exec(html)) !== null) {
    const ytId = extractYouTubeId(match[1]);
    if (ytId) {
      blocks.push({
        type: "video",
        text: "▶ Ver video en YouTube",
        url: youtubeWatchUrl(ytId),
      });
    }
  }

  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  while ((match = imgRe.exec(html)) !== null) {
    blocks.push({
      type: "image",
      src: normalizeUrl(match[1]),
      alt: match[2]?.trim() || "Imagen",
    });
  }

  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = linkRe.exec(html)) !== null) {
    const href = normalizeUrl(match[1]);
    const text = match[2].replace(/<[^>]+>/g, "").trim() || href;
    const ytId = extractYouTubeId(href);
    if (ytId) {
      blocks.push({ type: "video", text, url: youtubeWatchUrl(ytId) });
    } else {
      blocks.push({
        type: "paragraph",
        parts: [{ type: "link", text, href }],
      });
    }
  }

  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (blocks.length === 0 && plain) {
    blocks.push({
      type: "paragraph",
      parts: [{ type: "text", text: plain }],
    });
  }

  return blocks;
}

function headingParts(token) {
  if (token.tokens?.length) return parseInline(token.tokens);
  return [{ type: "text", text: token.text || "" }];
}

/**
 * Convierte Markdown en bloques estructurados para PDF (enlaces y videos clicables).
 */
export function markdownToPdfBlocks(markdown) {
  if (!markdown?.trim()) return [];

  const tokens = marked.lexer(markdown);
  const blocks = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        blocks.push({
          type: "heading",
          depth: token.depth,
          parts: headingParts(token),
        });
        break;
      case "paragraph":
        blocks.push({ type: "paragraph", parts: parseInline(token.tokens) });
        break;
      case "list":
        blocks.push({
          type: "list",
          ordered: token.ordered,
          items: token.items.map((item) => ({
            parts: parseInline(item.tokens),
          })),
        });
        break;
      case "blockquote":
        blocks.push({ type: "blockquote", parts: parseInline(token.tokens) });
        break;
      case "code":
        blocks.push({ type: "code", text: token.text });
        break;
      case "hr":
        blocks.push({ type: "hr" });
        break;
      case "html":
        blocks.push(...parseHtml(token.raw || token.text || ""));
        break;
      case "space":
        break;
      default:
        if (token.text) {
          blocks.push({
            type: "paragraph",
            parts: [{ type: "text", text: token.text }],
          });
        }
    }
  }

  return blocks;
}

/** Recopila enlaces y videos únicos para el anexo de recursos. */
export function collectPdfResources(blocks, extraVideos = []) {
  const seen = new Set();
  const resources = [];

  const add = (item) => {
    const key = item.url;
    if (!key || seen.has(key)) return;
    seen.add(key);
    resources.push(item);
  };

  for (const block of blocks) {
    const scanParts = (parts) => {
      for (const p of parts || []) {
        if (p.type === "link") add({ kind: "link", label: p.text, url: p.href });
        if (p.type === "video") add({ kind: "video", label: p.text, url: p.url });
        if (p.type === "image") add({ kind: "image", label: p.alt, url: p.src });
      }
    };

    if (block.parts) scanParts(block.parts);
    if (block.type === "list") {
      for (const item of block.items) scanParts(item.parts);
    }
    if (block.type === "image") {
      add({ kind: "image", label: block.alt, url: block.src });
    }
    if (block.type === "video") {
      add({ kind: "video", label: block.text, url: block.url });
    }
  }

  for (const v of extraVideos) {
    const url = normalizeUrl(v.youtube_url);
    if (!url) continue;
    add({
      kind: "video",
      label: v.title || "Videotutorial",
      url,
      timing: v.timing,
    });
  }

  return resources;
}

export function slugifyFilename(title) {
  const base = String(title || "clase")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return base || "clase-speed";
}
