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

  if (styles.length > 0) {
    html = `<span style="${styles.join("; ")}">${html}</span>`;
  }

  return html;
}

export function getSelectionText(state) {
  return state?.selectedText ?? "";
}

export function applyBoldFormat(state, api) {
  const text = getSelectionText(state);
  if (!text) return;
  const { content, formats } = extractFormats(text);
  formats.bold = !formats.bold;
  api.replaceSelection(buildFormattedHtml(content, formats));
}

export function applyItalicFormat(state, api) {
  const text = getSelectionText(state);
  if (!text) return;
  const { content, formats } = extractFormats(text);
  formats.italic = !formats.italic;
  api.replaceSelection(buildFormattedHtml(content, formats));
}

export function applyStrikeFormat(state, api) {
  const text = getSelectionText(state);
  if (!text) return;
  const { content, formats } = extractFormats(text);
  formats.strike = !formats.strike;
  api.replaceSelection(buildFormattedHtml(content, formats));
}

export function applyTextColorFormat(state, api, color) {
  const safeColor = sanitizeColor(color);
  if (!safeColor) return;
  const text = getSelectionText(state);
  if (!text) return;
  const { content, formats } = extractFormats(text);
  formats.color = safeColor;
  api.replaceSelection(buildFormattedHtml(content, formats));
}

export function applyFontSizeFormat(state, api, sizePx) {
  const size = Number(sizePx);
  if (!size || size < 8 || size > 72) return;
  const text = getSelectionText(state);
  if (!text) return;
  const { content, formats } = extractFormats(text);
  formats.fontSize = size;
  api.replaceSelection(buildFormattedHtml(content, formats));
}
