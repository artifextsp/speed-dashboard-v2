import { useEffect, useMemo, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { MODALITY_LABELS, getPhaseColor, getPhaseLabel } from "../../utils/constants";
import { getDateInputValue } from "../../kernel/sortByDate";

const SESSION_TYPES = [
  { value: "sesion", label: "Sesión" },
  { value: "actividad", label: "Actividad" },
  { value: "encuentro", label: "Encuentro presencial" },
];

const EMPTY_FORM = {
  title: "",
  phase_id: "",
  scheduled_date_iso: "",
  modality: "virtual",
  session_type: "sesion",
  session_number: "",
  duration_estimate: "",
  learning_goal: "",
};

function sessionToForm(session) {
  if (!session) return { ...EMPTY_FORM };
  return {
    title: session.title || "",
    phase_id: session.phase_id || "",
    scheduled_date_iso: getDateInputValue(session),
    modality: session.modality || "virtual",
    session_type: session.session_type || "sesion",
    session_number: session.session_number ?? "",
    duration_estimate: session.duration_estimate || "",
    learning_goal: session.learning_goal || "",
  };
}

function suggestSessionNumber(sessions, phaseId, sessionType) {
  if (sessionType !== "sesion" || !phaseId) return "";
  const numbers = sessions
    .filter((s) => s.phase_id === phaseId && s.session_type === "sesion")
    .map((s) => s.session_number)
    .filter((n) => typeof n === "number");
  if (numbers.length === 0) return "";
  return String(Math.max(...numbers) + 1);
}

export function SessionMetaModal({
  mode,
  session,
  phases,
  sessions,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => sessionToForm(session));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sortedPhases = useMemo(
    () =>
      [...phases].sort(
        (a, b) =>
          (a.sort_order ?? a.phase_number) - (b.sort_order ?? b.phase_number)
      ),
    [phases]
  );

  useEffect(() => {
    setForm(sessionToForm(session));
    setError("");
  }, [session, mode]);

  const set = (key) => (value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (mode === "create" && key === "phase_id" && !prev.session_number) {
        next.session_number = suggestSessionNumber(
          sessions,
          value,
          next.session_type
        );
      }
      if (mode === "create" && key === "session_type" && value !== "sesion") {
        next.session_number = "";
      }
      if (mode === "create" && key === "session_type" && value === "sesion") {
        next.session_number = suggestSessionNumber(
          sessions,
          next.phase_id,
          value
        );
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave({
        ...form,
        id: session?.id,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const selectedPhase = phases.find((p) => p.id === form.phase_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === "create" ? "Nueva clase" : "Editar datos de la clase"}
          </h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <p className="modal-hint">
          Define la clase en el temario: bloque didáctico (opcional), fecha y tipo.
          El listado se ordena automáticamente por fecha.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field__label">Título *</label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Ej: Electrónica de fundamentos"
            required
          />

          <label className="field__label">Bloque didáctico</label>
          <select
            className="input"
            value={form.phase_id}
            onChange={(e) => set("phase_id")(e.target.value)}
          >
            <option value="">Sin bloque (clase independiente)</option>
            {sortedPhases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sort_order ?? p.phase_number}. {p.title}
              </option>
            ))}
          </select>

          {selectedPhase && (
            <p
              className="field__help"
              style={{ color: getPhaseColor(selectedPhase) }}
            >
              {selectedPhase.subtitle || getPhaseLabel(selectedPhase)}
            </p>
          )}

          <div className="form-row">
            <div className="form-row__col">
              <label className="field__label">Fecha programada *</label>
              <input
                type="date"
                className="input"
                value={form.scheduled_date_iso}
                onChange={(e) => set("scheduled_date_iso")(e.target.value)}
                required
              />
            </div>
            <div className="form-row__col">
              <label className="field__label">Modalidad *</label>
              <select
                className="input"
                value={form.modality}
                onChange={(e) => set("modality")(e.target.value)}
                required
              >
                {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-row__col">
              <label className="field__label">Tipo de ítem</label>
              <select
                className="input"
                value={form.session_type}
                onChange={(e) => set("session_type")(e.target.value)}
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row__col">
              <label className="field__label">Nº de sesión</label>
              <input
                type="number"
                className="input"
                min="1"
                value={form.session_number}
                onChange={(e) => set("session_number")(e.target.value)}
                placeholder={form.session_type === "sesion" ? "Ej: 4" : "Opcional"}
                disabled={form.session_type !== "sesion"}
              />
            </div>
          </div>

          <label className="field__label">Duración estimada</label>
          <input
            type="text"
            className="input"
            value={form.duration_estimate}
            onChange={(e) => set("duration_estimate")(e.target.value)}
            placeholder="2 horas"
          />

          <label className="field__label">Descripción / objetivo</label>
          <textarea
            className="input input--area"
            rows={2}
            value={form.learning_goal}
            onChange={(e) => set("learning_goal")(e.target.value)}
            placeholder="Breve descripción visible en la tarjeta del temario (opcional)"
          />

          {error && <p className="login-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading
                ? "Guardando..."
                : mode === "create"
                  ? "Crear clase"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
