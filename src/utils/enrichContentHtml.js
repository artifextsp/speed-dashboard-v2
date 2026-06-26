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

function buildImageFigureHtml(alt, url) {
  const src = resolveImageUrl(url.trim());
  const safeAlt = alt.trim();
  const caption =
    safeAlt && safeAlt.toLowerCase() !== "imagen"
      ? `<figcaption class="markdown-image-card__caption">${safeAlt}</figcaption>`
      : "";
  return `<figure class="markdown-image-card markdown-image-card--zoomable"><div class="markdown-image-card__frame" role="button" tabindex="0" aria-label="Ampliar imagen"><img class="markdown-image-card__img" src="${src}" alt="${safeAlt}" loading="lazy" referrerpolicy="no-referrer" /></div>${caption}</figure>`;
}

/** Convierte ![alt](url) que quedó sin parsear. */
function fixRawMarkdownImages(html) {
  return html
    .replace(/<p>\s*!\[([^\]]*)\]\(([^)]+)\)\s*<\/p>/gi, (_, alt, url) =>
      buildImageFigureHtml(alt, url)
    )
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => buildImageFigureHtml(alt, url));
}

/** Convierte ## título que quedó sin parsear. */
function fixRawMarkdownHeadings(html) {
  return html.replace(/<p>\s*(#{1,6})\s+([^<]+?)\s*<\/p>/gi, (_, hashes, text) => {
    const level = hashes.length;
    return `<h${level}>${text.trim()}</h${level}>`;
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

/** Envuelve imágenes sueltas en tarjeta con marco y pie opcional. */
function wrapImagesInCards(html) {
  return html.replace(/<img([^>]*?)>/gi, (match, attrs) => {
    if (/markdown-image-card__img/.test(match)) return match;
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch?.[1]?.trim() || "";
    const img = `<img class="markdown-image-card__img"${attrs.replace(/\sclass=["'][^"']*["']/i, "")}>`;
    const caption =
      alt && alt.toLowerCase() !== "imagen"
        ? `<figcaption class="markdown-image-card__caption">${alt}</figcaption>`
        : "";
    return `<figure class="markdown-image-card markdown-image-card--zoomable"><div class="markdown-image-card__frame" role="button" tabindex="0" aria-label="Ampliar imagen">${img}</div>${caption}</figure>`;
  });
}

/** Convierte **negrilla** y *cursiva* sin parsear en HTML. */
function fixRawMarkdownEmphasis(html) {
  return html
    .replace(/\*\*([^*<]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_<]+?)__/g, "<strong>$1</strong>")
    .replace(/(?<![*_])\*([^*<\n]+?)\*(?![*_])/g, "<em>$1</em>");
}

export function enrichContentHtml(html) {
  if (!html) return "";
  let out = html;
  out = fixRawMarkdownImages(out);
  out = fixRawMarkdownHeadings(out);
  out = fixRawMarkdownEmphasis(out);
  out = fixRawMarkdownLinks(out);
  out = enrichImageSources(out);
  out = wrapImagesInCards(out);
  out = enrichYouTubeEmbeds(out);
  out = normalizeLinksInHtml(out);
  return out;
}
