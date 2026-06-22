import { useMemo } from "react";
import {
  IconBook,
  IconCalendarEvent,
  IconUsers,
  IconFile,
  IconPencil,
} from "@tabler/icons-react";
import {
  PHASE_COLORS,
  MODALITY_LABELS,
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

export function SessionRow({ session, phase, onClick }) {
  const color = PHASE_COLORS[phase?.code] || "#888";
  const Icon = TYPE_ICON_MAP[session.session_type] || IconFile;
  const progress = useMemo(() => getSessionProgress(session), [session]);
  const editorName = getShortName(session.last_edited_by);
  const statusCfg = getStatusConfig(session.status);

  return (
    <button
      className="session-row"
      data-status={session.status}
      style={{ borderLeftColor: statusCfg.border }}
      onClick={onClick}
    >
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
        <div className="session-row__meta">
          <span>{MODALITY_LABELS[session.modality]}</span>
          <span>·</span>
          <span>{session.scheduled_date}</span>
          {editorName && (
            <>
              <span>·</span>
              <span className="session-row__editor" title={`Editado por ${session.last_edited_by}`}>
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
  );
}
