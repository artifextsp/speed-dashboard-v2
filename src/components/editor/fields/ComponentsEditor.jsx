import { IconPlus, IconLayoutList } from "@tabler/icons-react";
import {
  addComponent,
  updateComponent,
  removeComponent,
  moveComponent,
  withDisplayNumbers,
} from "../../../kernel/componentManager";
import { ClassComponentCard } from "./ClassComponentCard";

export function ComponentsEditor({
  components,
  onChange,
  phaseColor,
  readOnly = false,
}) {
  const numbered = withDisplayNumbers(components);

  const handleAdd = () => {
    onChange(addComponent(components));
  };

  return (
    <section className="components-editor">
      <div className="components-editor__head">
        <h3 className="components-editor__title">
          <IconLayoutList size={20} style={{ color: phaseColor }} />
          Componentes de la clase
          {numbered.length > 0 && (
            <span className="components-editor__count">({numbered.length})</span>
          )}
        </h3>
        <p className="components-editor__help">
          Crea los bloques que necesites. Cada uno tiene nombre, descripción y contenido.
          Se numeran automáticamente en el orden que definas.
        </p>
      </div>

      {numbered.length === 0 ? (
        <div className="components-editor__empty">
          <p>Esta clase aún no tiene componentes.</p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleAdd}
            >
              <IconPlus size={16} /> Agregar primer componente
            </button>
          )}
        </div>
      ) : (
        <div className="components-editor__list">
          {numbered.map((comp, index) => (
            <ClassComponentCard
              key={comp.id}
              component={comp}
              displayNumber={comp.displayNumber}
              phaseColor={phaseColor}
              readOnly={readOnly}
              isFirst={index === 0}
              isLast={index === numbered.length - 1}
              onChange={(updated) =>
                onChange(updateComponent(components, comp.id, updated))
              }
              onRemove={() => onChange(removeComponent(components, comp.id))}
              onMoveUp={() => onChange(moveComponent(components, comp.id, "up"))}
              onMoveDown={() =>
                onChange(moveComponent(components, comp.id, "down"))
              }
            />
          ))}
        </div>
      )}

      {!readOnly && numbered.length > 0 && (
        <button
          type="button"
          className="btn btn--secondary components-editor__add"
          onClick={handleAdd}
        >
          <IconPlus size={16} /> Agregar componente
        </button>
      )}
    </section>
  );
}
