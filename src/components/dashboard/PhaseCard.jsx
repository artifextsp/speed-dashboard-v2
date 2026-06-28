import { IconPencil } from "@tabler/icons-react";
import { getPhaseBadge, getPhaseBg, getPhaseColor } from "../../utils/constants";

export function PhaseCard({
  phase,
  sessions,
  onSelect,
  isActive,
  onEdit,
  canEdit = false,
}) {
  const total = sessions.length;
  const published = sessions.filter((s) => s.status === "publicado").length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;
  const color = getPhaseColor(phase);
  const bg = getPhaseBg(phase);
  const badge = getPhaseBadge(phase);

  return (
    <div
      className={`phase-card-wrap ${isActive ? "phase-card-wrap--active" : ""}`}
      style={{ "--phase-color": color }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`phase-card ${isActive ? "phase-card--active" : ""}`}
        style={{
          background: bg,
          borderColor: isActive ? color : `${color}22`,
          "--phase-color": color,
        }}
      >
        <div className="phase-card__header">
          <span className="phase-card__badge" style={{ background: color }}>
            {badge}
          </span>
          <span className="phase-card__title" style={{ color }}>
            {phase.title}
          </span>
        </div>
        {phase.subtitle && (
          <div className="phase-card__subtitle">{phase.subtitle}</div>
        )}
        <div className="phase-card__progress">
          <div className="progress-bar" style={{ background: `${color}22` }}>
            <div
              className="progress-bar__fill"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
          <span className="phase-card__count" style={{ color }}>
            {published}/{total}
          </span>
        </div>
      </button>
      {canEdit && onEdit && (
        <button
          type="button"
          className="phase-card__edit"
          title="Editar bloque didáctico"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(phase);
          }}
        >
          <IconPencil size={14} />
        </button>
      )}
    </div>
  );
}

export function UnassignedBlockCard({ sessions, isActive, onSelect }) {
  const total = sessions.length;
  const color = "#888888";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`phase-card phase-card--unassigned ${isActive ? "phase-card--active" : ""}`}
      style={{
        background: "#f5f5f0",
        borderColor: isActive ? color : `${color}33`,
        "--phase-color": color,
      }}
    >
      <div className="phase-card__header">
        <span className="phase-card__badge phase-card__badge--muted">—</span>
        <span className="phase-card__title" style={{ color }}>
          Sin bloque
        </span>
      </div>
      <div className="phase-card__subtitle">Clases no agrupadas</div>
      <div className="phase-card__progress">
        <span className="phase-card__count" style={{ color }}>
          {total} clase{total !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}

export function AddBlockCard({ onClick }) {
  return (
    <button type="button" className="phase-card phase-card--add" onClick={onClick}>
      <span className="phase-card--add__icon">+</span>
      <span className="phase-card--add__label">Bloque Didáctico</span>
    </button>
  );
}
