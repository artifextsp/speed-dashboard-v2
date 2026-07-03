import {
  compileMarkdownToHtml,
  expandSelectionToStyledBlock,
  STYLED_BLOCK_CLASS,
} from "../../../kernel/styledBlockCompile.js";

export { STYLED_BLOCK_CLASS };

export const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];

export const TEXT_COLOR_PRESETS = [
  "#111827",
  "#534AB7",
  "#185FA5",
  "#1D9E75",
  "#D85A30",
  "#F97316",
  "#DC2626",
  "#9333EA",
  "#64748B",
];

export function isMultiLine(text) {
  return String(text ?? "").includes("\n");
}

export function hasBlockMarkdown(text) {
  return /^\s*\d+\.\s/m.test(text) || /^\s*[-*+]\s/m.test(text);
}

export function needsBlockWrapper(content, formats) {
  if (!formats.fontSize && !formats.color) return false;
  return isMultiLine(content) || hasBlockMarkdown(content);
}

export function sanitizeColor(color) {
  const value = String(color ?? "").trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return null;
}

function createEmptyFormats() {
  return {
    bold: false,
    italic: false,
    strike: false,
    color: null,
    fontSize: null,
  };
}

export function cloneFormats(formats) {
  return {
    bold: Boolean(formats?.bold),
    italic: Boolean(formats?.italic),
    strike: Boolean(formats?.strike),
    color: formats?.color ?? null,
    fontSize: formats?.fontSize ?? null,
  };
}

export function hasActiveFormats(formats) {
  return Boolean(
    formats?.bold ||
      formats?.italic ||
      formats?.strike ||
      formats?.color ||
      formats?.fontSize
  );
}

export function describeFormats(formats) {
  if (!hasActiveFormats(formats)) return "sin estilo";
  const parts = [];
  if (formats.bold) parts.push("negrilla");
  if (formats.italic) parts.push("cursiva");
  if (formats.strike) parts.push("tachado");
  if (formats.fontSize) parts.push(`${formats.fontSize}px`);
  if (formats.color) parts.push(formats.color);
  return parts.join(", ");
}

export function copyFormatsFromText(text) {
  const { formats } = extractFormats(text);
  return cloneFormats(formats);
}

function parseStyleAttr(styleStr, formats) {
  String(styleStr || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const [prop, rawValue] = rule.split(":").map((part) => part.trim());
      if (prop === "color") {
        formats.color = sanitizeColor(rawValue) || formats.color;
      }
      if (prop === "font-size") {
        const size = Number.parseInt(rawValue, 10);
        if (size) formats.fontSize = size;
      }
      if (prop === "font-weight" && /^bold$/i.test(rawValue)) {
        formats.bold = true;
      }
      if (prop === "font-style" && /^italic$/i.test(rawValue)) {
        formats.italic = true;
      }
    });
}

/** Quita capas externas de markdown/HTML para poder combinar formatos. */
export function extractFormats(text) {
  const formats = createEmptyFormats();
  let content = String(text ?? "");

  for (let i = 0; i < 12; i += 1) {
    let peeled = false;

    const styledDivMatch = content.match(
      new RegExp(
        `^<div\\s+class="${STYLED_BLOCK_CLASS}"\\s+style="([^"]*)">([\\s\\S]*)<\\/div>$`,
        "i"
      )
    );
    if (styledDivMatch) {
      parseStyleAttr(styledDivMatch[1], formats);
      content = styledDivMatch[2];
      peeled = true;
      continue;
    }

    const styledDivLegacyMatch = content.match(/^<div\s+style="([^"]*)">([\s\S]*)<\/div>$/i);
    if (styledDivLegacyMatch) {
      parseStyleAttr(styledDivLegacyMatch[1], formats);
      content = styledDivLegacyMatch[2];
      peeled = true;
      continue;
    }

    const spanMatch = content.match(/^<span\s+style="([^"]*)">([\s\S]*)<\/span>$/i);
    if (spanMatch) {
      parseStyleAttr(spanMatch[1], formats);
      content = spanMatch[2];
      peeled = true;
      continue;
    }

    const strongMatch = content.match(/^<strong>([\s\S]*)<\/strong>$/i);
    if (strongMatch) {
      formats.bold = true;
      content = strongMatch[1];
      peeled = true;
      continue;
    }

    const emMatch = content.match(/^<em>([\s\S]*)<\/em>$/i);
    if (emMatch) {
      formats.italic = true;
      content = emMatch[1];
      peeled = true;
      continue;
    }

    const delMatch = content.match(/^<del>([\s\S]*)<\/del>$/i);
    if (delMatch) {
      formats.strike = true;
      content = delMatch[1];
      peeled = true;
      continue;
    }

    const boldMd = content.match(/^\*\*([\s\S]*)\*\*$/);
    if (boldMd) {
      formats.bold = true;
      content = boldMd[1];
      peeled = true;
      continue;
    }

    const italicMd = content.match(/^\*([\s\S]*)\*$/);
    if (italicMd && !content.startsWith("**")) {
      formats.italic = true;
      content = italicMd[1];
      peeled = true;
      continue;
    }

    const strikeMd = content.match(/^~~([\s\S]*)~~$/);
    if (strikeMd) {
      formats.strike = true;
      content = strikeMd[1];
      peeled = true;
      continue;
    }

    if (!peeled) break;
  }

  return { content, formats };
}

export function buildFormattedHtml(content, formats) {
  const hasStyle =
    formats.bold ||
    formats.italic ||
    formats.strike ||
    formats.color ||
    formats.fontSize;

  if (!hasStyle) return content;

  let html = content;
  if (formats.strike) html = `<del>${html}</del>`;
  if (formats.italic) html = `<em>${html}</em>`;
  if (formats.bold) html = `<strong>${html}</strong>`;

  const styles = [];
  if (formats.color) styles.push(`color: ${formats.color}`);
  if (formats.fontSize) styles.push(`font-size: ${formats.fontSize}px`);

  if (styles.length === 0) return html;

  const styleAttr = styles.join("; ");
  if (needsBlockWrapper(content, formats)) {
    const innerHtml = compileMarkdownToHtml(html);
    return `<div class="${STYLED_BLOCK_CLASS}" style="${styleAttr}">${innerHtml}</div>`;
  }

  return `<span style="${styleAttr}">${html}</span>`;
}

export function getSelectionText(state) {
  return state?.selectedText ?? "";
}

function applyFormat(state, api, updater) {
  const fullText = state?.text ?? "";
  const selection = state?.selection;
  const selStart = selection?.start ?? 0;
  const selEnd = selection?.end ?? selStart;
  const expanded = expandSelectionToStyledBlock(fullText, selStart, selEnd);
  const text = expanded.text || getSelectionText(state);
  if (!text) return null;

  if (expanded.start !== selStart || expanded.end !== selEnd) {
    api.setSelectionRange?.({ start: expanded.start, end: expanded.end });
  }

  const { content, formats } = extractFormats(text);
  updater(formats);
  const replacement = buildFormattedHtml(content, formats);
  api.replaceSelection(replacement);
  return replacement;
}

export function applyBoldFormat(state, api) {
  return applyFormat(state, api, (formats) => {
    formats.bold = !formats.bold;
  });
}

export function applyItalicFormat(state, api) {
  return applyFormat(state, api, (formats) => {
    formats.italic = !formats.italic;
  });
}

export function applyStrikeFormat(state, api) {
  return applyFormat(state, api, (formats) => {
    formats.strike = !formats.strike;
  });
}

export function applyTextColorFormat(state, api, color) {
  const safeColor = sanitizeColor(color);
  if (!safeColor) return null;
  return applyFormat(state, api, (formats) => {
    formats.color = safeColor;
  });
}

export function applyFontSizeFormat(state, api, sizePx) {
  const size = Number(sizePx);
  if (!size || size < 8 || size > 72) return null;
  return applyFormat(state, api, (formats) => {
    formats.fontSize = size;
  });
}

export function applyCopiedFormats(state, api, copiedFormats) {
  const fullText = state?.text ?? "";
  const selection = state?.selection;
  const selStart = selection?.start ?? 0;
  const selEnd = selection?.end ?? selStart;
  const expanded = expandSelectionToStyledBlock(fullText, selStart, selEnd);
  const text = expanded.text || getSelectionText(state);
  if (!text) return null;

  if (expanded.start !== selStart || expanded.end !== selEnd) {
    api.setSelectionRange?.({ start: expanded.start, end: expanded.end });
  }

  const template = cloneFormats(copiedFormats);
  if (!hasActiveFormats(template)) return null;
  const { content } = extractFormats(text);
  const replacement = buildFormattedHtml(content, template);
  api.replaceSelection(replacement);
  return replacement;
}
