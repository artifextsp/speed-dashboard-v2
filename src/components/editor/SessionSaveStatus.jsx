import { IconAlertCircle, IconCheck, IconCloudUpload, IconPencil } from "@tabler/icons-react";

const STATUS_CONFIG = {
  saved: {
    label: "Guardado",
    className: "session-save-status--saved",
    icon: IconCheck,
  },
  unsaved: {
    label: "Cambios pendientes…",
    className: "session-save-status--unsaved",
    icon: IconPencil,
  },
  saving: {
    label: "Guardando…",
    className: "session-save-status--saving",
    icon: IconCloudUpload,
  },
  error: {
    label: "Error al guardar",
    className: "session-save-status--error",
    icon: IconAlertCircle,
  },
};

export function SessionSaveStatus({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.saved;
  const Icon = config.icon;

  return (
    <span className={`session-save-status ${config.className}`} role="status" aria-live="polite">
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}
