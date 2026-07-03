import { marked } from "marked";

export const STYLED_BLOCK_CLASS = "markdown-styled-block";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const STYLED_BLOCK_OPEN_RE = new RegExp(
  `<div\\s+class="${STYLED_BLOCK_CLASS}"\\s+style="([^"]*)">`,
  "gi"
);

/** Repara etiquetas rotas típicas del editor (p. ej. `<strongPalabra` sin `>`). */
export function repairBrokenInlineTags(html) {
  return String(html ?? "")
    .replace(/<strong(?![>\s/])([A-Za-zÁÉÍÓÚáéíóúÑñ0-9])/g, "<strong>$1")
    .replace(/<em(?![>\s/])([A-Za-zÁÉÍÓÚáéíóúÑñ0-9])/g, "<em>$1")
    .replace(/<del(?![>\s/])([A-Za-zÁÉÍÓÚáéíóúÑñ0-9])/g, "<del>$1")
    .replace(/<span(?=\s*style=)(?![>\s])/gi, "<span ")
    .replace(/<\/strong(?![>])/g, "</strong>");
}

export function looksLikeMarkdown(text) {
  return /(\*\*|__|~~|^\s*[-*+]\s|^\s*\d+\.\s|^#{1,6}\s|^\s*---\s*$|\[[^\]]+\]\()/m.test(
    text
  );
}

function findStyledBlockClose(text, fromIndex) {
  return text.indexOf("</div>", fromIndex);
}

/** Convierte markdown interno a HTML seguro para incrustar en bloques estilizados. */
export function compileMarkdownToHtml(markdown) {
  const cleaned = repairBrokenInlineTags(String(markdown ?? "").trim());
  if (!cleaned) return "";

  if (
    !looksLikeMarkdown(cleaned) &&
    /<(?:p|ol|ul|li|h[1-6]|table|strong|em|del)\b/i.test(cleaned)
  ) {
    return cleaned;
  }

  const raw = marked.parse(cleaned);
  const html = typeof raw === "string" ? raw.trim() : String(raw).trim();
  return repairBrokenInlineTags(html);
}

/** Compila el markdown atrapado dentro de bloques con tamaño/color de fuente. */
export function compileStyledBlocks(markdown) {
  if (!markdown || !markdown.includes(STYLED_BLOCK_CLASS)) return markdown;

  let result = "";
  let lastIndex = 0;
  let match;

  STYLED_BLOCK_OPEN_RE.lastIndex = 0;
  while ((match = STYLED_BLOCK_OPEN_RE.exec(markdown)) !== null) {
    result += markdown.slice(lastIndex, match.index);
    const style = match[1];
    const contentStart = match.index + match[0].length;
    const closeIdx = findStyledBlockClose(markdown, contentStart);
    if (closeIdx === -1) {
      result += match[0];
      lastIndex = match.index + match[0].length;
      continue;
    }

    const inner = markdown.slice(contentStart, closeIdx);
    const compiled = compileMarkdownToHtml(inner);
    result += `<div class="${STYLED_BLOCK_CLASS}" style="${style}">${compiled}</div>`;
    lastIndex = closeIdx + "</div>".length;
  }

  result += markdown.slice(lastIndex);
  return result;
}

/** Expande la selección al bloque estilizado completo para no romper HTML al formatear. */
export function expandSelectionToStyledBlock(fullText, selectionStart, selectionEnd) {
  const text = String(fullText ?? "");
  const start = Math.max(0, selectionStart ?? 0);
  const end = Math.max(start, selectionEnd ?? start);
  const selected = text.slice(start, end);

  const completeBlockRe = new RegExp(
    `^<div\\s+class="${STYLED_BLOCK_CLASS}"\\s+style="[^"]*">[\\s\\S]*<\\/div>$`,
    "i"
  );
  if (completeBlockRe.test(selected.trim())) {
    return { text: selected, start, end };
  }

  const openRe = new RegExp(
    `<div\\s+class="${STYLED_BLOCK_CLASS}"\\s+style="[^"]*">`,
    "gi"
  );
  let match;
  while ((match = openRe.exec(text)) !== null) {
    const blockStart = match.index;
    const contentStart = blockStart + match[0].length;
    const closeIdx = findStyledBlockClose(text, contentStart);
    if (closeIdx === -1) continue;
    const blockEnd = closeIdx + "</div>".length;

    if (start >= blockStart && end <= blockEnd) {
      return { text: text.slice(blockStart, blockEnd), start: blockStart, end: blockEnd };
    }
  }

  return { text: selected, start, end };
}
