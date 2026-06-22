import { IconTrash, IconPlus } from "@tabler/icons-react";
import { PHASE_COLORS } from "../../../utils/constants";

export function PhysicalResourceEditor({ label, items = [], onChange, help }) {
  const addItem = () => {
    onChange([...items, { item: "", description: "", image_url: "" }]);
  };

  const updateItem = (idx, key, val) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };

  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      {help && <p className="field__help">{help}</p>}
      <div className="physical-editor">
        {items.map((item, idx) => (
          <div key={idx} className="physical-editor__card">
            <div className="physical-editor__preview">
              {item.image_url ? (
                <img src={item.image_url} alt={item.item || "Recurso"} className="physical-editor__thumb" />
              ) : (
                <div className="physical-editor__thumb-placeholder">Sin imagen</div>
              )}
            </div>
            <div className="physical-editor__fields">
              <input
                className="input input--sm"
                value={item.item || ""}
                onChange={(e) => updateItem(idx, "item", e.target.value)}
                placeholder="Nombre del componente (ej: Protoboard 400 pines)"
              />
              <input
                className="input input--sm"
                value={item.description || ""}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
                placeholder="Para qué lo usamos en esta sesión"
              />
              <input
                className="input input--sm"
                value={item.image_url || ""}
                onChange={(e) => updateItem(idx, "image_url", e.target.value)}
                placeholder="URL de imagen (opcional)"
              />
            </div>
            <button className="btn-icon btn-icon--danger" onClick={() => removeItem(idx)}>
              <IconTrash size={14} />
            </button>
          </div>
        ))}
        <button className="btn-add" onClick={addItem} style={{ color: PHASE_COLORS.A }}>
          <IconPlus size={14} /> Agregar recurso físico
        </button>
      </div>
    </div>
  );
}
