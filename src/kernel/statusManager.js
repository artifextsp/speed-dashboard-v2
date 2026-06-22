/** Valores en BD (sin migración). Etiquetas pedagógicas en UI. */
export const CLASS_STATUSES = ["borrador", "en_revision", "publicado"];

export const STATUS_CONFIG = {
  borrador: {
    key: "borrador",
    label: "Planeada",
    color: "#BA7517",
    bg: "#FAEEDA",
    border: "#E5A017",
    preview: {
      bg: "#FAEEDA",
      title: "#4A3A10",
      muted: "#7A6220",
      accent: "#BA7517",
    },
  },
  en_revision: {
    key: "en_revision",
    label: "En desarrollo",
    color: "#639922",
    bg: "#EAF3DE",
    border: "#4A7A18",
    preview: {
      bg: "#EAF3DE",
      title: "#1F3D12",
      muted: "#3D6B24",
      accent: "#4A7A18",
    },
  },
  publicado: {
    key: "publicado",
    label: "Dictada",
    color: "#185FA5",
    bg: "#E6F1FB",
    border: "#0F4A82",
    preview: {
      bg: "#E6F1FB",
      title: "#0A3D6E",
      muted: "#185FA5",
      accent: "#0F4A82",
    },
  },
};

export const STATUS_OPTIONS = CLASS_STATUSES.map((key) => ({
  value: key,
  label: STATUS_CONFIG[key].label,
}));

const ALLOWED_TRANSITIONS = {
  borrador: ["en_revision", "publicado"],
  en_revision: ["borrador", "publicado"],
  publicado: ["en_revision", "borrador"],
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.borrador;
}

/** Estudiantes pueden abrir la clase solo en estos estados. */
export function canStudentAccessSession(status) {
  return status === "en_revision" || status === "publicado";
}

export function canTransitionStatus(current, next) {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

export function validateStatusTransition(current, next) {
  if (!CLASS_STATUSES.includes(next)) {
    return { ok: false, error: "Estado no válido" };
  }
  if (!canTransitionStatus(current, next)) {
    return { ok: false, error: "Transición de estado no permitida" };
  }
  return { ok: true };
}
