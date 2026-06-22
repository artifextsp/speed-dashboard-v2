import { STATUS_CONFIG } from "../../kernel/statusManager";

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.borrador;
  return (
    <span
      className="status-badge"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="status-dot"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
