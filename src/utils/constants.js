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
