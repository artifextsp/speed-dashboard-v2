import { IconTrash, IconPlus } from "@tabler/icons-react";
import { PHASE_COLORS } from "../../../utils/constants";

export function ListEditor({ label, items = [], onChange, fields, help }) {
  const addItem = () => {
    const newItem = {};
    fields.forEach((f) => (newItem[f.key] = f.default || ""));
    onChange([...items, newItem]);
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
      <div className="list-editor">
        {items.map((item, idx) => (
          <div key={idx} className="list-editor__row">
            {fields.map((f) => (
              <input
                key={f.key}
                className="input input--sm"
                value={item[f.key] || ""}
                onChange={(e) => updateItem(idx, f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ flex: f.flex || 1 }}
              />
            ))}
            <button
              className="btn-icon btn-icon--danger"
              onClick={() => removeItem(idx)}
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}
        <button
          className="btn-add"
          onClick={addItem}
          style={{ color: PHASE_COLORS.A }}
        >
          <IconPlus size={14} /> Agregar
        </button>
      </div>
    </div>
  );
}
