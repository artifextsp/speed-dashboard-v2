import { useMemo } from "react";
import {
  IconBook,
  IconCalendarEvent,
  IconUsers,
  IconFile,
  IconPencil,
  IconSettings,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react";
import {
  MODALITY_LABELS,
  getPhaseColor,
  getPhaseLabel,
  getSessionProgress,
  formatRelativeTime,
} from "../../utils/constants";
import { getStatusConfig } from "../../kernel/statusManager";
import { StatusBadge } from "../ui/StatusBadge";

const TYPE_ICON_MAP = {
  sesion: IconBook,
  actividad: IconCalendarEvent,
  encuentro: IconUsers,
};

function getShortName(email) {
  if (!email) return null;
  const name = email.split("@")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function truncateText(text, max = 140) {
  if (!text) return "";
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export function SessionRow({
  session,
  phase,
  onClick,
  onEditMeta,
  onDelete,
  onDownloadPdf,
  readOnly,
  canDownloadPdf = false,
}) {
  const color = getPhaseColor(phase);
  const Icon = TYPE_ICON_MAP[session.session_type] || IconFile;
  const progress = useMemo(() => getSessionProgress(session), [session]);
  const editorName = getShortName(session.last_edited_by);
  const statusCfg = getStatusConfig(session.status);
  const blockLabel = phase ? getPhaseLabel(phase) : "Sin bloque";
  const description = truncateText(session.learning_goal);

  return (
    <div
      className="session-row-wrap"
      data-status={session.status}
      style={{ borderLeftColor: statusCfg.border }}
    >
      <button type="button" className="session-row" onClick={onClick}>
        <span
          className="session-row__icon"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </span>
        <div className="session-row__info">
          <div className="session-row__title">
            {session.session_number
              ? `Sesión ${session.session_number}: `
              : ""}
            {session.title}
          </div>
          {description && (
            <p className="session-row__description">{description}</p>
          )}
          <div className="session-row__meta">
            <span>{blockLabel}</span>
            <span>·</span>
            <span>{MODALITY_LABELS[session.modality]}</span>
            <span>·</span>
            <span>{session.scheduled_date || "Sin fecha"}</span>
            {editorName && (
              <>
                <span>·</span>
                <span
                  className="session-row__editor"
                  title={`Editado por ${session.last_edited_by}`}
                >
                  <IconPencil size={11} />
                  {editorName} · {formatRelativeTime(session.last_edited_at)}
                </span>
              </>
            )}
          </div>
          {progress.total > 0 && (
            <div className="session-row__progress">
              <div className="session-row__progress-dots">
                {progress.sections.map((sec) => (
                  <span
                    key={sec.id}
                    className={`progress-dot ${
                      sec.skipped
                        ? "progress-dot--skipped"
                        : sec.done
                          ? "progress-dot--done"
                          : ""
                    }`}
                    style={sec.done ? { background: color } : undefined}
                    title={`${sec.label}: ${sec.skipped ? "N/A" : sec.done ? "✓" : "Pendiente"}`}
                  />
                ))}
              </div>
              <span
                className="session-row__progress-text"
                style={{ color }}
              >
                {progress.filled}/{progress.total} comp.
              </span>
            </div>
          )}
        </div>
        <StatusBadge status={session.status} />
      </button>

      {!readOnly && (
        <div className="session-row__actions">
          {canDownloadPdf && (
            <button
              type="button"
              className="btn-icon session-row__action"
              title="Descargar PDF"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadPdf?.(session);
              }}
            >
              <IconDownload size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn-icon session-row__action"
            title="Editar bloque, fecha y datos"
            onClick={(e) => {
              e.stopPropagation();
              onEditMeta?.(session);
            }}
          >
            <IconSettings size={16} />
          </button>
          <button
            type="button"
            className="btn-icon session-row__action session-row__action--danger"
            title="Eliminar clase"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(session);
            }}
          >
            <IconTrash size={16} />
          </button>
        </div>
      )}
      {readOnly && canDownloadPdf && (
        <div className="session-row__actions">
          <button
            type="button"
            className="btn-icon session-row__action"
            title="Descargar PDF"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadPdf?.(session);
            }}
          >
            <IconDownload size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
