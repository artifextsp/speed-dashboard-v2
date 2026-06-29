import { sanitizeColor } from "./colorUtils.js";

export const TABLE_CLASS = "markdown-editor-table";
export const TABLE_WRAP_CLASS = "markdown-table-wrap";
export const DEFAULT_COL_WIDTH = 120;
export const DEFAULT_ROW_HEIGHT = 44;
export const MIN_COL_WIDTH = 60;
export const MIN_ROW_HEIGHT = 28;
export const MAX_ROWS = 20;
export const MAX_COLS = 12;

export function generateTableId() {
  return `tbl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function buildTableHtml({
  rows = 3,
  cols = 3,
  defaultBg = "#ffffff",
  colWidth = DEFAULT_COL_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  tableId = generateTableId(),
} = {}) {
  const safeRows = clampInt(rows, 1, MAX_ROWS, 3);
  const safeCols = clampInt(cols, 1, MAX_COLS, 3);
  const safeBg = sanitizeColor(defaultBg) || "#ffffff";
  const safeColWidth = clampInt(colWidth, MIN_COL_WIDTH, 600, DEFAULT_COL_WIDTH);
  const safeRowHeight = clampInt(rowHeight, MIN_ROW_HEIGHT, 400, DEFAULT_ROW_HEIGHT);

  const colgroup = Array.from({ length: safeCols }, () => `<col style="width:${safeColWidth}px" />`).join(
    ""
  );

  const bodyRows = Array.from({ length: safeRows }, (_, rowIndex) => {
    const cells = Array.from({ length: safeCols }, () => {
      return `<td style="background:${safeBg};width:${safeColWidth}px;height:${safeRowHeight}px;min-height:${safeRowHeight}px;border:1px solid #d1d5db;padding:8px;vertical-align:top">Celda</td>`;
    }).join("");
    return `<tr style="height:${safeRowHeight}px">${cells}</tr>`;
  }).join("");

  return `\n\n<div class="${TABLE_WRAP_CLASS}" data-table-id="${tableId}"><table class="${TABLE_CLASS}" style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup>${colgroup}</colgroup><tbody>${bodyRows}</tbody></table></div>\n\n`;
}

const TABLE_WRAP_RE = new RegExp(
  `<div\\s+class="${TABLE_WRAP_CLASS}"\\s+data-table-id="([^"]+)"[^>]*>[\\s\\S]*?<\\/div>`,
  "gi"
);

export function replaceTableInMarkdown(markdown, tableId, tableWrapHtml) {
  if (!markdown || !tableId) return markdown;
  const normalized =
    tableWrapHtml.startsWith("<div") ? tableWrapHtml : buildTableWrapFromInner(tableId, tableWrapHtml);

  let replaced = false;
  const out = String(markdown).replace(TABLE_WRAP_RE, (match, id) => {
    if (id !== tableId) return match;
    replaced = true;
    return normalized.trim();
  });
  return replaced ? out : markdown;
}

function buildTableWrapFromInner(tableId, inner) {
  const trimmed = String(inner).trim();
  if (trimmed.startsWith(`<div class="${TABLE_WRAP_CLASS}"`)) return trimmed;
  return `<div class="${TABLE_WRAP_CLASS}" data-table-id="${tableId}">${trimmed}</div>`;
}

export function serializeEditableTableWrap(wrapEl) {
  if (!wrapEl) return "";
  const clone = wrapEl.cloneNode(true);
  clone
    .querySelectorAll(
      ".markdown-table-handle, .markdown-table-cell-picker, .markdown-table-cell-color"
    )
    .forEach((node) => node.remove());
  clone.classList.remove("markdown-table-wrap--editable");
  clone.querySelectorAll("[contenteditable]").forEach((node) => {
    node.removeAttribute("contenteditable");
  });
  return clone.outerHTML.trim();
}
