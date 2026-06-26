import { useState } from "react";
import {
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { FieldInput } from "./FieldInput";
import { RichEditor } from "./RichEditor";

export function ClassComponentCard({
  component,
  displayNumber,
  phaseColor,
  readOnly,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className={`class-component ${open ? "class-component--open" : ""}`}
      data-component-id={component.id}
    >
      <div className="class-component__toolbar">
        <button
          type="button"
          className="class-component__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span
            className="class-component__number"
            style={{ background: phaseColor }}
          >
            {displayNumber}
          </span>
          <div className="class-component__summary">
            <span className="class-component__summary-title">
              {component.name || `Componente ${displayNumber}`}
            </span>
            {component.description && (
              <span className="class-component__summary-desc">
                {component.description}
              </span>
            )}
          </div>
          <span className="class-component__chevron">
            {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          </span>
        </button>
        {!readOnly && (
          <div className="class-component__actions">
            <button
              type="button"
              className="btn-icon"
              onClick={onMoveUp}
              disabled={isFirst}
              title="Subir"
            >
              <IconChevronUp size={16} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onMoveDown}
              disabled={isLast}
              title="Bajar"
            >
              <IconChevronDown size={16} />
            </button>
            <button
              type="button"
              className="btn-icon btn-icon--danger"
              onClick={onRemove}
              title="Eliminar componente"
            >
              <IconTrash size={16} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <>
          <div className="class-component__header">
            <div className="class-component__header-fields">
              <FieldInput
                label="Nombre del componente"
                value={component.name}
                onChange={(name) => onChange({ ...component, name })}
                placeholder="Ej: Fundamento conceptual, Actividad práctica..."
                disabled={readOnly}
              />
              <FieldInput
                label="Descripción breve"
                value={component.description}
                onChange={(description) => onChange({ ...component, description })}
                placeholder="Para qué sirve este componente en la clase"
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="class-component__body">
            <RichEditor
              label="Contenido"
              value={component.content}
              onChange={(content) => onChange({ ...component, content })}
              height={360}
              help="Texto enriquecido: formato, enlaces, imágenes en tarjeta, videos y listas. Los enters extra crean espacio vertical; usa ↕ en la barra para un espaciador."
              readOnly={readOnly}
            />
          </div>
        </>
      )}
    </article>
  );
}
