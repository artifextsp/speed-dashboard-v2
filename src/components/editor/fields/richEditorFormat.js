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

function toggleMarkdownWrap(api, text, prefix, suffix = prefix) {
  if (text.startsWith(prefix) && text.endsWith(suffix)) {
    api.replaceSelection(text.slice(prefix.length, text.length - suffix.length));
    return;
  }
  api.replaceSelection(`${prefix}${text}${suffix}`);
}

function toggleHtmlWrap(api, text, tag, attrs = "") {
  const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  const close = `</${tag}>`;
  if (text.startsWith(open) && text.endsWith(close)) {
    api.replaceSelection(text.slice(open.length, -close.length));
    return;
  }
  api.replaceSelection(`${open}${text}${close}`);
}

function applyTextStyle(api, text, style) {
  toggleHtmlWrap(api, text, "span", `style="${style}"`);
}

export function getSelectionText(state, fallback = "Texto") {
  const selected = state?.selectedText ?? "";
  return selected.length > 0 ? selected : fallback;
}

export function applyBoldFormat(state, api) {
  const text = getSelectionText(state);
  if (isMultiLine(text)) {
    toggleHtmlWrap(api, text, "strong");
    return;
  }
  toggleMarkdownWrap(api, text, "**");
}

export function applyItalicFormat(state, api) {
  const text = getSelectionText(state);
  if (isMultiLine(text)) {
    toggleHtmlWrap(api, text, "em");
    return;
  }
  toggleMarkdownWrap(api, text, "*");
}

export function applyStrikeFormat(state, api) {
  const text = getSelectionText(state);
  if (isMultiLine(text)) {
    toggleHtmlWrap(api, text, "del");
    return;
  }
  toggleMarkdownWrap(api, text, "~~");
}

export function applyTextColorFormat(state, api, color) {
  const safeColor = sanitizeColor(color);
  if (!safeColor) return;
  const text = getSelectionText(state);
  applyTextStyle(api, text, `color: ${safeColor}`);
}

export function applyFontSizeFormat(state, api, sizePx) {
  const size = Number(sizePx);
  if (!size || size < 8 || size > 72) return;
  const text = getSelectionText(state);
  applyTextStyle(api, text, `font-size: ${size}px`);
}
