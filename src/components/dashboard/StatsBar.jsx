import { STATUS_CONFIG } from "../../kernel/statusManager";

export function StatsBar({ sessions }) {
  const total = sessions.length;
  const delivered = sessions.filter((s) => s.status === "publicado").length;
  const inDevelopment = sessions.filter((s) => s.status === "en_revision").length;
  const planned = sessions.filter((s) => s.status === "borrador").length;

  const items = [
    { label: "Total", value: total, color: "var(--color-text-primary)" },
    {
      label: STATUS_CONFIG.publicado.label,
      value: delivered,
      color: STATUS_CONFIG.publicado.color,
    },
    {
      label: STATUS_CONFIG.en_revision.label,
      value: inDevelopment,
      color: STATUS_CONFIG.en_revision.color,
    },
    {
      label: STATUS_CONFIG.borrador.label,
      value: planned,
      color: STATUS_CONFIG.borrador.color,
    },
  ];

  return (
    <div className="stats-bar">
      {items.map((s) => (
        <div key={s.label} className="stats-bar__item">
          <div className="stats-bar__value" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="stats-bar__label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
