import { STATUS_OPTIONS, getStatusConfig } from "../../../kernel/statusManager";
import { StatusBadge } from "../../ui/StatusBadge";

export function ClassStatusControl({ status, onChange, readOnly = false }) {
  const cfg = getStatusConfig(status);

  return (
    <div className="class-status-control">
      <label className="class-status-control__label">Estado de la clase</label>
      <div className="class-status-control__row">
        <StatusBadge status={status} />
        {readOnly ? (
          <span className="class-status-control__hint">Solo lectura — no puedes cambiar el estado</span>
        ) : (
          <select
            className="select class-status-control__select"
            value={status}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderColor: cfg.border }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="class-status-control__help">
        <strong style={{ color: cfg.color }}>{cfg.label}</strong>
        {" — "}
        {status === "borrador" && "La clase está planificada pero aún no se está desarrollando."}
        {status === "en_revision" && "La clase está en desarrollo activo."}
        {status === "publicado" && "La clase ya fue dictada o está lista para los estudiantes."}
      </p>
    </div>
  );
}
