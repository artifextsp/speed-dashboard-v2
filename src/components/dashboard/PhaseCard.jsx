import { PHASE_COLORS, PHASE_BG } from "../../utils/constants";

export function PhaseCard({ phase, sessions, onSelect, isActive }) {
  const total = sessions.length;
  const published = sessions.filter((s) => s.status === "publicado").length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;
  const color = PHASE_COLORS[phase.code] || "#888";
  const bg = PHASE_BG[phase.code] || "#f5f5f0";

  return (
    <button
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
          {phase.code}
        </span>
        <span className="phase-card__title" style={{ color }}>
          {phase.title}
        </span>
      </div>
      <div className="phase-card__subtitle">{phase.subtitle}</div>
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
  );
}
