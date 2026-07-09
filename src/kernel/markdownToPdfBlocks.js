import { marked } from "marked";
import { friendlyLinkLabel } from "../utils/enrichContentHtml.js";
import { normalizeUrl, extractYouTubeId, youtubeWatchUrl, resolveImageUrl } from "./urlUtils";

const MD_LINK_IN_TEXT_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Convierte HTML del editor a markdown limpio antes de generar el PDF. */
function normalizeContentForPdf(markdown) {
  if (!markdown?.trim()) return "";

  let s = markdown;

  s = s.replace(
    /<div class="markdown-styled-block"[^>]*>([\s\S]*?)<\/div>/gi,
    (_, inner) => `\n\n${inner}\n\n`
  );

  s = s.replace(
    /<span[^>]*>##\s*([\s\S]*?)<\/span>/gi,
    (_, inner) => `\n\n## ${inner.replace(/<[^>]+>/g, "").trim()}\n\n`
  );

  s = s.replace(/⸻/g, "\n\n---\n\n");

  s = s.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").trim() || href;
      return `[${label}](${href})`;
    }
  );

  s = s.replace(
    /<div class="markdown-embed[^"]*">[\s\S]*?<iframe[^>]+src=["']([^"']+)["'][\s\S]*?<\/div>/gi,
    (_, src) => {
      const ytId = extractYouTubeId(src);
      return ytId
        ? `\n\n[Ver video en YouTube](${youtubeWatchUrl(ytId)})\n\n`
        : "";
    }
  );

  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, depth, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return `\n\n${"#".repeat(Number(depth))} ${text}\n\n`;
    }
  );

  s = s.replace(
    /<span\b[^>]*style=["'][^"']*color:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    (_, _color, inner) => inner.replace(/<[^>]+>/g, "").trim()
  );

  s = s.replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "\n");
  s = s.replace(/<p[^>]*>/gi, "\n").replace(/<\/p>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "\n");
  s = s.replace(/<ul[^>]*>/gi, "\n").replace(/<\/ul>/gi, "\n");
  s = s.replace(/<ol[^>]*>/gi, "\n").replace(/<\/ol>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

function finalizeParts(parts) {
  const result = [];
  for (const part of parts || []) {
    if (part.type === "text" && part.text?.includes("](")) {
      result.push(...parseMarkdownLinksInPlainText(part.text));
    } else {
      result.push(part);
    }
  }
  return result;
}

function parseMarkdownLinksInPlainText(text) {
  if (!text?.includes("](")) {
    return [{ type: "text", text: text || "" }];
  }

  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MD_LINK_IN_TEXT_RE)) {
    const [raw, label, url] = match;
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const href = normalizeUrl(url.trim());
    const linkLabel = friendlyLinkLabel(label.trim(), href);
    const ytId = extractYouTubeId(href);
    if (ytId) {
      parts.push({
        type: "video",
        text: linkLabel || "Ver video en YouTube",
        url: youtubeWatchUrl(ytId),
      });
    } else {
      parts.push({ type: "link", text: linkLabel, href });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", text }];
}

function parseInline(tokens) {
  if (!tokens?.length) return [];
  const parts = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.tokens?.length) {
          parts.push(...parseInline(token.tokens));
        } else {
          parts.push(...parseMarkdownLinksInPlainText(token.text));
        }
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
        const label = friendlyLinkLabel(token.text, href);
        const ytId = extractYouTubeId(href);
        if (ytId) {
          parts.push({
            type: "video",
            text: label || "Ver video en YouTube",
            url: youtubeWatchUrl(ytId),
          });
        } else {
          parts.push({
            type: "link",
            text: label,
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
          src: resolveImageUrl(token.href),
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
  const seenKeys = new Set();

  const pushUnique = (block) => {
    const key = JSON.stringify(block);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    blocks.push(block);
  };

  const iframeRe = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = iframeRe.exec(html)) !== null) {
    const ytId = extractYouTubeId(match[1]);
    if (ytId) {
      pushUnique({
        type: "video",
        text: "▶ Ver video en YouTube",
        url: youtubeWatchUrl(ytId),
      });
    }
  }

  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  while ((match = imgRe.exec(html)) !== null) {
    pushUnique({
      type: "image",
      src: resolveImageUrl(match[1]),
      alt: match[2]?.trim() || "Imagen",
    });
  }

  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = linkRe.exec(html)) !== null) {
    const href = normalizeUrl(match[1]);
    const rawText = match[2].replace(/<[^>]+>/g, "").trim();
    const text = friendlyLinkLabel(rawText, href);
    const ytId = extractYouTubeId(href);
    if (ytId) {
      pushUnique({ type: "video", text, url: youtubeWatchUrl(ytId) });
    } else {
      pushUnique({
        type: "paragraph",
        parts: [{ type: "link", text, href }],
      });
    }
  }

  const mdLinkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = mdLinkRe.exec(html)) !== null) {
    const href = normalizeUrl(match[2].trim());
    const text = friendlyLinkLabel(match[1].trim(), href);
    const ytId = extractYouTubeId(href);
    if (ytId) {
      pushUnique({ type: "video", text, url: youtubeWatchUrl(ytId) });
    } else {
      pushUnique({
        type: "paragraph",
        parts: [{ type: "link", text, href }],
      });
    }
  }

  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (blocks.length === 0 && plain) {
    pushUnique({
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

  const tokens = marked.lexer(normalizeContentForPdf(markdown));
  const blocks = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        blocks.push({
          type: "heading",
          depth: token.depth,
          parts: finalizeParts(headingParts(token)),
        });
        break;
      case "paragraph":
        blocks.push({
          type: "paragraph",
          parts: finalizeParts(parseInline(token.tokens)),
        });
        break;
      case "list":
        blocks.push({
          type: "list",
          ordered: token.ordered,
          items: token.items.map((item) => ({
            parts: finalizeParts(
              item.tokens?.length
                ? parseInline(item.tokens)
                : parseMarkdownLinksInPlainText(item.text || "")
            ),
          })),
        });
        break;
      case "blockquote":
        blocks.push({
          type: "blockquote",
          parts: finalizeParts(parseInline(token.tokens)),
        });
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
      case "table": {
        const rows = (token.rows || []).flatMap((row) =>
          row.flatMap((cell) => parseInline(cell.tokens))
        );
        if (rows.length) {
          blocks.push({ type: "paragraph", parts: rows });
        }
        break;
      }
      case "space":
        break;
      default:
        if (token.raw) {
          blocks.push({
            type: "paragraph",
            parts: finalizeParts(parseMarkdownLinksInPlainText(token.raw)),
          });
        } else if (token.text) {
          blocks.push({
            type: "paragraph",
            parts: finalizeParts(parseMarkdownLinksInPlainText(token.text)),
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
