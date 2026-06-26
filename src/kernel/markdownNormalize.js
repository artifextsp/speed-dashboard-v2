import { expandMarkdownVerticalSpace } from "./markdownSpacing.js";

const PROTECTED_BLOCK_RE =
  /(<div class="markdown-embed markdown-embed--video">[\s\S]*?<\/div>(?:\s*<p class="markdown-video-link">[\s\S]*?<\/p>)?|<div class="markdown-spacer"><\/div>)/gi;

function protectBlocks(markdown) {
  const tokens = [];
  const out = markdown.replace(PROTECTED_BLOCK_RE, (block) => {
    const token = `@@MD_PROTECT_${tokens.length}@@`;
    tokens.push(block);
    return token;
  });
  return { out, tokens };
}

function restoreBlocks(markdown, tokens) {
  return tokens.reduce(
    (out, block, index) => out.replaceAll(`@@MD_PROTECT_${index}@@`, block),
    markdown
  );
}

/** Libera markdown atrapado dentro de divs del editor (p. ej. text-align). */
export function unwrapTrappingHtmlDivs(markdown) {
  const { out: protectedMd, tokens } = protectBlocks(markdown);
  let out = protectedMd;

  out = out.replace(
    /<div\s+style="text-align:\s*(?:left|center|right)"\s*>\s*([\s\S]*?)\s*<\/div>/gi,
    (_, inner) => `\n\n${inner.trim()}\n\n`
  );

  let previous;
  do {
    previous = out;
    out = out.replace(/<div(?:\s[^>]*)?>\s*([\s\S]*?)\s*<\/div>/gi, (match, inner) => {
      if (/@@MD_PROTECT_\d+@@/.test(match)) return match;
      if (/<(?:div|iframe|img|figure)\b/i.test(inner)) return match;
      const body = inner.trim();
      if (!body) return "";
      if (/!\[[^\]]*\]\(|^#{1,6}\s|^\s*[-*+]\s+\S/m.test(body)) {
        return `\n\n${body}\n\n`;
      }
      return match;
    });
  } while (out !== previous);

  return restoreBlocks(out, tokens);
}

/** Asegura límites de bloque para imágenes y encabezados markdown. */
export function ensureBlockBoundaries(markdown) {
  return markdown
    .replace(/([^\n])\n(!\[[^\]]+\]\([^)]+\))/g, "$1\n\n$2")
    .replace(/(!\[[^\]]+\]\([^)]+\))\n([^\n!#\s-])/g, "$1\n\n$2")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
}

export function prepareMarkdownForRender(markdown) {
  if (!markdown) return "";
  let out = markdown;
  out = unwrapTrappingHtmlDivs(out);
  out = ensureBlockBoundaries(out);
  out = expandMarkdownVerticalSpace(out);
  return out;
}
