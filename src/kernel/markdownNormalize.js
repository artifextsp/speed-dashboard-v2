import { expandMarkdownVerticalSpace } from "./markdownSpacing.js";
import { compileStyledBlocks } from "./styledBlockCompile.js";

const PROTECTED_BLOCK_RE =
  /(<div class="markdown-styled-block"[\s\S]*?<\/div>|<div class="markdown-table-wrap"[\s\S]*?<\/div>|<div class="markdown-embed markdown-embed--video">[\s\S]*?<\/div>(?:\s*<p class="markdown-video-link">[\s\S]*?<\/p>)?|<div class="markdown-spacer"><\/div>|```[\s\S]*?```|`[^`\n]+`)/gi;

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

function looksLikeInlineMarkdown(text) {
  return /!\[[^\]]*\]\(|\*\*[^*\n]+?\*\*|__[^_\n]+?__|(?<![*_])\*[^*\n]+?\*(?![*_])|\[[^\]]+\]\([^)]+\)|#{1,6}\s/.test(
    text
  );
}

function cleanHeadingInner(text) {
  return String(text ?? "")
    .trim()
    .replace(/^(#{1,6})\s+/g, "")
    .replace(/^\*\*(.+)\*\*$/s, "$1")
    .replace(/^\*\*/g, "")
    .replace(/\*\*$/g, "")
    .replace(/^(#{1,6})\s+/g, "");
}

/** Repara encabezados atrapados en HTML o con ## duplicados. */
export function repairUnparsedHeadings(markdown) {
  let out = markdown;

  out = out.replace(
    /^#{1,6}\s*<span([^>]*)>\s*(#{1,6})\s*([\s\S]*?)<\/span>\s*$/gim,
    (_, attrs, hashes, inner) => {
      const level = hashes.length;
      return `<h${level}><span${attrs}>${cleanHeadingInner(inner)}</span></h${level}>`;
    }
  );

  out = out.replace(/^#{1,6}\s+(?=<h[1-6]\b)/gm, "");

  out = out.replace(
    /<p\b[^>]*>\s*<span([^>]*)>\s*(#{1,6})\s*([\s\S]*?)<\/span>\s*<\/p>/gi,
    (_, attrs, hashes, inner) => {
      const level = hashes.length;
      return `<h${level}><span${attrs}>${cleanHeadingInner(inner)}</span></h${level}>`;
    }
  );

  out = out.replace(
    /<span([^>]*)>\s*(#{1,6})\s*([\s\S]*?)<\/span>/gi,
    (match, attrs, hashes, inner) => {
      if (/<h[1-6]\b/i.test(match)) return match;
      const level = hashes.length;
      return `<h${level}><span${attrs}>${cleanHeadingInner(inner)}</span></h${level}>`;
    }
  );

  out = out.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const cleaned = inner
      .replace(/(>)\s*#{1,6}\s+/g, "$1")
      .replace(/\*\*<span/g, "<span")
      .replace(/<\/span>\*\*/g, "</span>");
    return `<h${level}>${cleaned}</h${level}>`;
  });

  out = out.replace(/^#{1,6}[^\s#<].+$/gm, (line) => {
    const match = line.match(/^(#{1,6})\s*(.+)$/);
    if (!match) return line;
    const [, hashes, rest] = match;
    const level = hashes.length;
    const spanMatch = rest.match(/<span([^>]*)>([\s\S]*?)<\/span>/i);
    if (spanMatch) {
      return `<h${level}><span${spanMatch[1]}>${cleanHeadingInner(spanMatch[2])}</span></h${level}>`;
    }
    return line;
  });

  return out;
}

function looksLikeBlockMarkdown(text) {
  return /!\[[^\]]*\]\(|^#{1,6}\s|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S/m.test(text);
}

/** Convierte <p> con sintaxis markdown a texto plano para que el parser la procese. */
export function unwrapParagraphsWithMarkdown(markdown) {
  return markdown.replace(/<p\b[^>]*>\s*([\s\S]*?)\s*<\/p>/gi, (match, inner) => {
    if (/<(?:p|div|img|iframe|figure|pre|code)\b/i.test(inner)) return match;
    const body = inner.trim();
    if (!body) return "";
    if (looksLikeInlineMarkdown(body) || looksLikeBlockMarkdown(body)) {
      return `\n\n${body}\n`;
    }
    return match;
  });
}

/** Repara **negrilla** y *cursiva* que quedaron sin parsear. */
export function repairUnparsedEmphasis(markdown) {
  const { out: protectedMd, tokens } = protectBlocks(markdown);
  let out = protectedMd;
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
  out = out.replace(/(?<![*_])\*([^*\n]+?)\*(?![*_])/g, "<em>$1</em>");
  return restoreBlocks(out, tokens);
}

/** Libera markdown atrapado dentro de divs del editor (p. ej. text-align). */
export function unwrapTrappingHtmlDivs(markdown) {
  const { out: protectedMd, tokens } = protectBlocks(markdown);
  let out = protectedMd;

  out = out.replace(
    /<div\s+style="text-align:\s*(?:left|center|right)"\s*>\s*([\s\S]*?)\s*<\/div>/gi,
    (_, inner) => `\n\n${inner.trim()}\n\n`
  );

  const isProtectedStyledBlock = (tag) =>
    /class="[^"]*\bmarkdown-styled-block\b/i.test(tag);
  const isProtectedTableWrap = (tag) => /class="[^"]*\bmarkdown-table-wrap\b/i.test(tag);

  let previous;
  do {
    previous = out;
    out = out.replace(/<div(\s[^>]*)>\s*([\s\S]*?)\s*<\/div>/gi, (match, attrs, inner) => {
      if (/@@MD_PROTECT_\d+@@/.test(match)) return match;
      if (isProtectedStyledBlock(attrs)) return match;
      if (isProtectedTableWrap(attrs)) return match;
      if (/<(?:div|iframe|img|figure)\b/i.test(inner)) return match;
      const body = inner.trim();
      if (!body) return "";
      if (looksLikeBlockMarkdown(body) || looksLikeInlineMarkdown(body)) {
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

/** Asegura líneas en blanco alrededor de espaciadores para que el markdown siga parseándose. */
export function ensureSpacerBoundaries(markdown) {
  return markdown
    .replace(/(<div class="markdown-spacer"><\/div>)\n(?!\n)/g, "$1\n\n")
    .replace(/([^\n>])\n(<div class="markdown-spacer">)/g, "$1\n\n$2");
}

export function prepareMarkdownForRender(markdown) {
  if (!markdown) return "";
  let out = markdown;
  out = expandMarkdownVerticalSpace(out);
  out = unwrapTrappingHtmlDivs(out);
  out = unwrapParagraphsWithMarkdown(out);
  out = ensureBlockBoundaries(out);
  out = ensureSpacerBoundaries(out);
  out = repairUnparsedHeadings(out);
  out = repairUnparsedEmphasis(out);
  out = compileStyledBlocks(out);
  return out;
}
