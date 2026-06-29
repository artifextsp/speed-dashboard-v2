import { useCallback, useEffect, useRef, useState } from "react";
import { TEXT_COLOR_PRESETS } from "../editor/fields/richEditorFormat";
import { sanitizeColor } from "../../kernel/colorUtils";
import {
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  serializeEditableTableWrap,
  TABLE_CLASS,
} from "../../kernel/markdownTable";

function parsePx(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getColumnWidths(table) {
  const cols = table.querySelectorAll("colgroup col");
  if (cols.length > 0) {
    return [...cols].map((col) => parsePx(col.style.width, 120));
  }
  const firstRow = table.querySelector("tr");
  if (!firstRow) return [];
  return [...firstRow.children].map((cell) => parsePx(cell.style.width, 120));
}

function setColumnWidth(table, colIndex, width) {
  const safeWidth = Math.max(MIN_COL_WIDTH, width);
  const cols = table.querySelectorAll("colgroup col");
  if (cols[colIndex]) cols[colIndex].style.width = `${safeWidth}px`;
  table.querySelectorAll("tr").forEach((row) => {
    const cell = row.children[colIndex];
    if (cell) cell.style.width = `${safeWidth}px`;
  });
}

function setRowHeight(table, rowIndex, height) {
  const safeHeight = Math.max(MIN_ROW_HEIGHT, height);
  const row = table.querySelectorAll("tr")[rowIndex];
  if (!row) return;
  row.style.height = `${safeHeight}px`;
  [...row.children].forEach((cell) => {
    cell.style.height = `${safeHeight}px`;
    cell.style.minHeight = `${safeHeight}px`;
  });
}

function CellColorPicker({ color, onChange, onClose }) {
  return (
    <div className="markdown-table-cell-picker" onMouseDown={(event) => event.stopPropagation()}>
      <div className="markdown-table-cell-picker__swatches">
        {["#ffffff", "#f8fafc", ...TEXT_COLOR_PRESETS].map((preset) => (
          <button
            key={preset}
            type="button"
            className={`editor-toolbar-color__swatch${color === preset ? " editor-toolbar-color__swatch--active" : ""}`}
            style={{ background: preset }}
            title={preset}
            aria-label={`Color ${preset}`}
            onClick={() => {
              onChange(preset);
              onClose();
            }}
          />
        ))}
      </div>
      <input
        type="text"
        className="editor-toolbar-color__hex-input"
        value={color}
        placeholder="#ffffff"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const safe = sanitizeColor(color);
            if (safe) onChange(safe);
            onClose();
          }
        }}
      />
    </div>
  );
}

export function MarkdownEditableTable({ tableId, onTableChange, children }) {
  const wrapRef = useRef(null);
  const [colorPicker, setColorPicker] = useState(null);

  const commit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !onTableChange) return;
    onTableChange(tableId, serializeEditableTableWrap(wrap));
  }, [onTableChange, tableId]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const table = wrap?.querySelector(`table.${TABLE_CLASS}`);
    if (!wrap || !table) return undefined;

    const cleanups = [];

    const startColResize = (colIndex, startX) => {
      const widths = getColumnWidths(table);
      const startWidth = widths[colIndex] ?? 120;

      const onMove = (event) => {
        const delta = event.clientX - startX;
        setColumnWidth(table, colIndex, startWidth + delta);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commit();
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const startRowResize = (rowIndex, startY) => {
      const row = table.querySelectorAll("tr")[rowIndex];
      const startHeight = parsePx(row?.style.height, MIN_ROW_HEIGHT);

      const onMove = (event) => {
        const delta = event.clientY - startY;
        setRowHeight(table, rowIndex, startHeight + delta);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        commit();
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const openColorPicker = (cell, button) => {
      const bg = cell.style.background || cell.style.backgroundColor || "#ffffff";
      const rect = button.getBoundingClientRect();
      setColorPicker({
        color: bg,
        top: rect.bottom + 6,
        left: rect.left,
        onApply: (nextColor) => {
          const safe = sanitizeColor(nextColor);
          if (safe) {
            cell.style.background = safe;
            button.style.background = safe;
            commit();
          }
        },
      });
    };

    table.querySelectorAll("tr").forEach((row, rowIndex) => {
      [...row.children].forEach((cell, colIndex) => {
        cell.setAttribute("contenteditable", "true");
        cell.setAttribute("spellcheck", "true");

        const onCellBlur = () => commit();
        cell.addEventListener("blur", onCellBlur);
        cleanups.push(() => cell.removeEventListener("blur", onCellBlur));

        const colorBtn = document.createElement("button");
        colorBtn.type = "button";
        colorBtn.className = "markdown-table-cell-color";
        colorBtn.title = "Color de fondo de la celda";
        colorBtn.style.background = cell.style.background || "#ffffff";
        colorBtn.addEventListener("mousedown", (event) => event.stopPropagation());
        colorBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openColorPicker(cell, colorBtn);
        });
        cell.append(colorBtn);
        cleanups.push(() => colorBtn.remove());

        if (colIndex < row.children.length - 1) {
          const colHandle = document.createElement("span");
          colHandle.className = "markdown-table-handle markdown-table-handle--col";
          colHandle.title = "Arrastra para cambiar el ancho de la columna";
          colHandle.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            startColResize(colIndex, event.clientX);
          });
          cell.append(colHandle);
          cleanups.push(() => colHandle.remove());
        }

        const rowHandle = document.createElement("span");
        rowHandle.className = "markdown-table-handle markdown-table-handle--row";
        rowHandle.title = "Arrastra para cambiar el alto de la fila";
        rowHandle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          startRowResize(rowIndex, event.clientY);
        });
        cell.append(rowHandle);
        cleanups.push(() => rowHandle.remove());
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [children, commit]);

  useEffect(() => {
    if (!colorPicker) return undefined;
    const onPointerDown = (event) => {
      if (!event.target.closest(".markdown-table-cell-picker-layer")) {
        setColorPicker(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [colorPicker]);

  return (
    <>
      <div
        ref={wrapRef}
        className="markdown-table-wrap markdown-table-wrap--editable"
        data-table-id={tableId}
      >
        {children}
      </div>
      {colorPicker ? (
        <div
          className="markdown-table-cell-picker-layer"
          style={{ top: colorPicker.top, left: colorPicker.left }}
        >
          <CellColorPicker
            color={colorPicker.color}
            onChange={colorPicker.onApply}
            onClose={() => setColorPicker(null)}
          />
        </div>
      ) : null}
    </>
  );
}
