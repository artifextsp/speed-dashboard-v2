export const PHASE_COLORS = {
  A: "#534AB7",
  D: "#1D9E75",
  C: "#D85A30",
  E: "#185FA5",
};

export const PHASE_BG = {
  A: "#EEEDFE",
  D: "#E1F5EE",
  C: "#FAECE7",
  E: "#E6F1FB",
};

/** Color temático del bloque didáctico (BD primero, fallback ADCE). */
export function getPhaseColor(phase) {
  if (!phase) return "#888888";
  if (phase.color) return phase.color;
  return PHASE_COLORS[phase.code] || "#888888";
}

/** Fondo suave para tarjetas de bloque. */
export function getPhaseBg(phase) {
  if (!phase) return "#f5f5f0";
  if (phase.code && PHASE_BG[phase.code]) return PHASE_BG[phase.code];
  const color = getPhaseColor(phase);
  return `color-mix(in srgb, ${color} 12%, white)`;
}

/** Etiqueta corta para listados (nº de secuencia o código). */
export function getPhaseBadge(phase) {
  if (!phase) return null;
  if (phase.code && phase.code.length <= 3) return phase.code;
  const order = phase.sort_order ?? phase.phase_number;
  return order != null ? String(order) : "·";
}

/** Nombre legible del bloque didáctico. */
export function getPhaseLabel(phase) {
  if (!phase) return null;
  return phase.title || `Bloque ${phase.sort_order ?? phase.phase_number ?? ""}`.trim();
}

export const UNASSIGNED_BLOCK_FILTER = "__none__";

export const MODALITY_LABELS = {
  virtual: "Virtual",
  presencial: "Presencial",
  autonomo: "Autónomo",
  hibrido: "Híbrido",
};

export const TYPE_ICONS = {
  sesion: "IconBook",
  actividad: "IconCalendarEvent",
  encuentro: "IconUsers",
};

export { STATUS_CONFIG } from "../kernel/statusManager";
export { getSessionProgress, resolveClassComponents, usesDynamicComponents } from "../kernel/legacyMigration";

export function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
