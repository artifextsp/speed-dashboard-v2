import { useEffect, useMemo, useState } from "react";
import { IconTrash, IconX } from "@tabler/icons-react";
import { getPhaseColor } from "../../utils/constants";

const PRESET_COLORS = [
  "#534AB7",
  "#1D9E75",
  "#D85A30",
  "#185FA5",
  "#9B59B6",
  "#E67E22",
  "#2ECC71",
  "#3498DB",
  "#E74C3C",
  "#34495E",
];

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  color: "#534AB7",
  sort_order: "",
};

function phaseToForm(phase, phases) {
  if (!phase) {
    const nextOrder =
      phases.reduce(
        (max, p) => Math.max(max, p.sort_order ?? p.phase_number ?? 0),
        0
      ) + 1;
    return { ...EMPTY_FORM, sort_order: String(nextOrder) };
  }
  return {
    title: phase.title || "",
    subtitle: phase.subtitle || "",
    color: getPhaseColor(phase),
    sort_order: String(phase.sort_order ?? phase.phase_number ?? ""),
  };
}

export function PhaseMetaModal({
  mode,
  phase,
  phases,
  sessions = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(() => phaseToForm(phase, phases));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sessionCount = useMemo(
    () => sessions.filter((s) => s.phase_id === phase?.id).length,
    [sessions, phase?.id]
  );

  useEffect(() => {
    setForm(phaseToForm(phase, phases));
    setError("");
  }, [phase, mode, phases]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave({
        ...form,
        id: phase?.id,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      sessionCount > 0
        ? `¿Eliminar el bloque "${phase.title}"?\n\n${sessionCount} clase(s) quedarán sin bloque asignado.`
        : `¿Eliminar el bloque "${phase.title}"?`
    );
    if (!ok) return;
    setLoading(true);
    try {
      await onDelete(phase.id);
      onClose();
    } catch (err) {
      setError(err.message || "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === "create" ? "Nuevo bloque didáctico" : "Editar bloque didáctico"}
          </h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <p className="modal-hint">
          Los bloques agrupan clases del temario. Son opcionales: puedes dejar clases sin bloque.
          El listado de clases siempre se ordena por fecha.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field__label">Nombre del bloque *</label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Ej: Análisis, Diseño, Introducción…"
            required
          />

          <label className="field__label">Descripción corta</label>
          <input
            type="text"
            className="input"
            value={form.subtitle}
            onChange={(e) => set("subtitle")(e.target.value)}
            placeholder="Ej: Pensar antes de construir"
          />

          <div className="form-row">
            <div className="form-row__col">
              <label className="field__label">Posición en la secuencia *</label>
              <input
                type="number"
                className="input"
                min="1"
                value={form.sort_order}
                onChange={(e) => set("sort_order")(e.target.value)}
                placeholder="1, 2, 3…"
                required
              />
              <p className="field__help">
                Orden de los bloques en el temario. No afecta el orden cronológico de las clases.
              </p>
            </div>
            <div className="form-row__col">
              <label className="field__label">Color temático *</label>
              <div className="color-picker-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${form.color === c ? "color-swatch--active" : ""}`}
                    style={{ background: c }}
                    title={c}
                    onClick={() => set("color")(c)}
                  />
                ))}
                <input
                  type="color"
                  className="color-input-native"
                  value={form.color}
                  onChange={(e) => set("color")(e.target.value)}
                  title="Color personalizado"
                />
              </div>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <div className="modal-actions">
            {mode === "edit" && (
              <button
                type="button"
                className="btn btn--danger btn--ghost"
                onClick={handleDelete}
                disabled={loading}
              >
                <IconTrash size={15} /> Eliminar bloque
              </button>
            )}
            <span className="modal-actions__spacer" />
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
              style={{ background: form.color }}
            >
              {loading
                ? "Guardando..."
                : mode === "create"
                  ? "Crear bloque"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
