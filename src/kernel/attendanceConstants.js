export const ATTENDANCE_STATUSES = ["presente", "ausente", "ausente_excusa"];

export const ATTENDANCE_STATUS_CONFIG = {
  presente: {
    key: "presente",
    label: "Presente",
    shortLabel: "P",
    color: "#1D9E75",
    bg: "#EAF7F1",
    border: "#1D9E75",
  },
  ausente: {
    key: "ausente",
    label: "Ausente",
    shortLabel: "A",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#DC2626",
  },
  ausente_excusa: {
    key: "ausente_excusa",
    label: "Ausente con excusa",
    shortLabel: "E",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#D97706",
  },
};

export function getAttendanceStatusConfig(status) {
  return ATTENDANCE_STATUS_CONFIG[status] || ATTENDANCE_STATUS_CONFIG.ausente;
}

export function formatAttendanceDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function computeAttendanceStats(records = []) {
  const total = records.length;
  const present = records.filter((r) => r.status === "presente").length;
  const absent = records.filter((r) => r.status === "ausente").length;
  const excused = records.filter((r) => r.status === "ausente_excusa").length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, excused, rate };
}
