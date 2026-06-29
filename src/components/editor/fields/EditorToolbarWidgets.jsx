import { useEffect, useRef, useState } from "react";
import { IconPalette, IconPaint, IconPaintFilled } from "@tabler/icons-react";
import { FONT_SIZE_OPTIONS, TEXT_COLOR_PRESETS, sanitizeColor } from "./richEditorFormat";

export function EditorToolbarButton({ icon, title, disabled, active, onPrepare, onClick }) {
  return (
    <button
      type="button"
      className={`editor-toolbar-btn${active ? " editor-toolbar-btn--active" : ""}`}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseDown={(event) => {
        onPrepare?.();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      {icon}
    </button>
  );
}

export function EditorStylePaintButtons({
  copiedStyleLabel,
  canApply,
  disabled,
  onPrepare,
  onCopy,
  onApply,
}) {
  return (
    <div className="editor-toolbar-style-paint">
      <EditorToolbarButton
        icon={<IconPaint size={13} />}
        title="Copiar estilo del texto seleccionado"
        disabled={disabled}
        onPrepare={onPrepare}
        onClick={onCopy}
      />
      <EditorToolbarButton
        icon={<IconPaintFilled size={13} />}
        title={
          canApply
            ? `Aplicar estilo copiado (${copiedStyleLabel})`
            : "Primero copia un estilo con el botón de la izquierda"
        }
        disabled={disabled || !canApply}
        active={canApply}
        onPrepare={onPrepare}
        onClick={onApply}
      />
    </div>
  );
}

export function EditorFontSizeSelect({ onApply, onPrepare, disabled }) {
  return (
    <select
      className="editor-toolbar-select"
      defaultValue=""
      disabled={disabled}
      title="Tamaño de texto"
      aria-label="Tamaño de texto"
      onMouseDown={(event) => {
        onPrepare?.();
        event.stopPropagation();
      }}
      onChange={(event) => {
        const size = event.target.value;
        if (!size) return;
        onApply(Number(size));
        event.target.value = "";
      }}
    >
      <option value="">Aa</option>
      {FONT_SIZE_OPTIONS.map((size) => (
        <option key={size} value={size}>
          {size}px
        </option>
      ))}
    </select>
  );
}

export function EditorColorPickerButton({ onApply, onPrepare, disabled }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("#534AB7");
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

  const applyColor = (color) => {
    const safe = sanitizeColor(color);
    if (!safe) return;
    onApply(safe);
    setHex(safe);
    setOpen(false);
  };

  return (
    <div className="editor-toolbar-color" ref={rootRef}>
      <button
        type="button"
        className="editor-toolbar-color__trigger"
        disabled={disabled}
        title="Color de texto"
        aria-label="Color de texto"
        aria-expanded={open}
        onMouseDown={(event) => {
          onPrepare?.();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <IconPalette size={13} />
        <span className="editor-toolbar-color__bar" style={{ background: hex }} />
      </button>
      {open && (
        <div
          className="editor-toolbar-color__panel"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="editor-toolbar-color__swatches">
            {TEXT_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`editor-toolbar-color__swatch${hex === color ? " editor-toolbar-color__swatch--active" : ""}`}
                style={{ background: color }}
                title={color}
                aria-label={`Color ${color}`}
                onClick={() => applyColor(color)}
              />
            ))}
          </div>
          <div className="editor-toolbar-color__hex-row">
            <input
              type="text"
              className="editor-toolbar-color__hex-input"
              value={hex}
              placeholder="#534AB7"
              onChange={(event) => setHex(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyColor(hex);
                }
              }}
            />
            <button
              type="button"
              className="editor-toolbar-color__apply"
              onClick={() => applyColor(hex)}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
