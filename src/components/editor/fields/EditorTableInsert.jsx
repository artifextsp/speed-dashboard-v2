import { useEffect, useRef, useState } from "react";
import { IconTable } from "@tabler/icons-react";
import { TEXT_COLOR_PRESETS } from "./richEditorFormat";
import { buildTableHtml, MAX_COLS, MAX_ROWS } from "../../../kernel/markdownTable";
import { sanitizeColor } from "../../../kernel/colorUtils";
import { EditorToolbarButton } from "./EditorToolbarWidgets";

export function EditorTableInsertButton({ disabled, onPrepare, onInsert }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [bgColor, setBgColor] = useState("#ffffff");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleInsert = () => {
    const safeBg = sanitizeColor(bgColor) || "#ffffff";
    onInsert(
      buildTableHtml({
        rows,
        cols,
        defaultBg: safeBg,
      })
    );
    setOpen(false);
  };

  return (
    <div className="editor-toolbar-table" ref={rootRef}>
      <EditorToolbarButton
        icon={<IconTable size={13} />}
        title="Insertar tabla"
        disabled={disabled}
        active={open}
        onPrepare={onPrepare}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div className="editor-toolbar-table__panel" onMouseDown={(event) => event.stopPropagation()}>
          <p className="editor-toolbar-table__title">Nueva tabla</p>
          <div className="editor-toolbar-table__grid">
            <label className="editor-toolbar-table__field">
              <span>Filas</span>
              <input
                type="number"
                min={1}
                max={MAX_ROWS}
                value={rows}
                onChange={(event) => setRows(Number(event.target.value))}
              />
            </label>
            <label className="editor-toolbar-table__field">
              <span>Columnas</span>
              <input
                type="number"
                min={1}
                max={MAX_COLS}
                value={cols}
                onChange={(event) => setCols(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="editor-toolbar-table__colors">
            <span className="editor-toolbar-table__colors-label">Fondo de celda</span>
            <div className="editor-toolbar-table__swatches">
              {["#ffffff", ...TEXT_COLOR_PRESETS.filter((c) => c !== "#111827")].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`editor-toolbar-color__swatch${bgColor === color ? " editor-toolbar-color__swatch--active" : ""}`}
                  style={{ background: color }}
                  title={color}
                  aria-label={`Color ${color}`}
                  onClick={() => setBgColor(color)}
                />
              ))}
            </div>
            <input
              type="text"
              className="editor-toolbar-color__hex-input"
              value={bgColor}
              onChange={(event) => setBgColor(event.target.value)}
            />
          </div>
          <button type="button" className="editor-toolbar-table__insert" onClick={handleInsert}>
            Insertar tabla
          </button>
        </div>
      )}
    </div>
  );
}
