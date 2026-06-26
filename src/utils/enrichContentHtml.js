import { normalizeUrl, extractYouTubeId, youtubeWatchUrl, resolveImageUrl } from "../kernel/urlUtils";

/** Texto visible del enlace: evita mostrar URLs crudas como etiqueta. */
export function friendlyLinkLabel(text, href) {
  const label = String(text ?? "").trim();
  const url = normalizeUrl(href || "");
  if (!url) return label || "Enlace";

  const looksLikeUrl =
    !label ||
    label === url ||
    /^https?:\/\//i.test(label) ||
    label.includes("://");

  if (!looksLikeUrl) return label;

  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "Ver video en YouTube";
    }
    return host;
  } catch {
    return label || url;
  }
}

function normalizeLinksInHtml(html) {
  return html.replace(/<a([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi, (match, before, href, after, inner) => {
    const safe = normalizeUrl(href.replace(/&amp;/g, "&"));
    const plainInner = inner.replace(/<[^>]+>/g, "").trim();
    const label = friendlyLinkLabel(plainInner, safe);
    return `<a${before}href="${safe}" target="_blank" rel="noopener noreferrer"${after}>${label}</a>`;
  });
}

/** Convierte [texto](url) que quedó sin parsear en el HTML. */
function fixRawMarkdownLinks(html) {
  return html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const href = normalizeUrl(url.trim());
    const label = friendlyLinkLabel(text.trim(), href);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
}

/** Añade enlace clicable debajo de cada embed de YouTube. */
function enrichYouTubeEmbeds(html) {
  const embedRe =
    /<div class="markdown-embed markdown-embed--video">\s*<iframe[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>\s*<\/div>/gi;

  return html.replace(embedRe, (block, src) => {
    const ytId = extractYouTubeId(src);
    if (!ytId) return block;
    if (block.includes("markdown-video-link")) return block;

    const watchUrl = youtubeWatchUrl(ytId);
    const link = `<p class="markdown-video-link"><a href="${watchUrl}" target="_blank" rel="noopener noreferrer">▶ Abrir video en YouTube</a></p>`;
    return `${block}\n${link}`;
  });
}

/** Reescribe src de imágenes (p. ej. enlaces /view de Google Drive). */
function enrichImageSources(html) {
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      const raw = src.replace(/&amp;/g, "&");
      const resolved = resolveImageUrl(raw);
      if (resolved === raw) return match;
      return `<img${before}src="${resolved}"${after}>`;
    }
  );
}

export function enrichContentHtml(html) {
  if (!html) return "";
  let out = html;
  out = fixRawMarkdownLinks(out);
  out = enrichImageSources(out);
  out = enrichYouTubeEmbeds(out);
  out = normalizeLinksInHtml(out);
  return out;
}
