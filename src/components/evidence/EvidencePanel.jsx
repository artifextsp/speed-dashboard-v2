import { useMemo, useState } from "react";
import {
  IconCheck,
  IconClock,
  IconDownload,
  IconNotebook,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEvidence } from "../../hooks/useEvidence";

const STATUS_META = {
  pendiente: { label: "Pendiente", className: "evidence-status--pending" },
  aprobada: { label: "Aprobada", className: "evidence-status--approved" },
  rechazada: { label: "Rechazada", className: "evidence-status--rejected" },
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSize(bytes) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function EvidencePanel({ user, readOnly, onClose, onNotify }) {
  const { evidence, loading, updateStatus, deleteEvidence, getSignedUrl } =
    useEvidence(user);
  const [statusFilter, setStatusFilter] = useState("all");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return evidence;
    return evidence.filter((e) => e.status === statusFilter);
  }, [evidence, statusFilter]);

  const counts = useMemo(() => {
    const c = { pendiente: 0, aprobada: 0, rechazada: 0 };
    for (const e of evidence) c[e.status] = (c[e.status] || 0) + 1;
    return c;
  }, [evidence]);

  const handleDownload = async (item) => {
    try {
      const url = await getSignedUrl(item.file_path);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      onNotify?.(err.message || "No se pudo generar el enlace de descarga", true);
    }
  };

  const handleStatusChange = async (item, status) => {
    if (readOnly) return;
    setBusyId(item.id);
    try {
      const comment = commentDrafts[item.id] ?? item.reviewer_comment ?? "";
      await updateStatus(item.id, status, comment, user?.email);
      onNotify?.(
        status === "aprobada" ? "Evidencia aprobada" : "Evidencia marcada como rechazada"
      );
    } catch (err) {
      onNotify?.(err.message || "No se pudo actualizar el estado", true);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item) => {
    if (readOnly) return;
    const ok = window.confirm(
      `¿Eliminar la evidencia "${item.file_name}" de ${item.students?.full_name || "este estudiante"}?`
    );
    if (!ok) return;
    setBusyId(item.id);
    try {
      await deleteEvidence(item.id, item.file_path);
      onNotify?.("Evidencia eliminada");
    } catch (err) {
      onNotify?.(err.message || "No se pudo eliminar", true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide quiz-manager" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-editor__banner quiz-manager__banner">
          <div>
            <span className="quiz-editor__eyebrow">Bitácora digital</span>
            <h2>
              <IconNotebook size={20} stroke={1.8} /> Evidencias de estudiantes
            </h2>
            <p className="quiz-editor__intro">
              Los estudiantes suben evidencias (PDF o imagen) desde proyectospeed.com/bitacora.html
              con su código de 4 dígitos. Revísalas y márcalas como aprobadas o rechazadas.
            </p>
          </div>
          <button type="button" className="btn-icon btn-icon--on-dark" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className="quiz-manager__toolbar evidence-toolbar">
          <div className="evidence-filter-group">
            <button
              type="button"
              className={`evidence-filter-btn ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Todas ({evidence.length})
            </button>
            <button
              type="button"
              className={`evidence-filter-btn ${statusFilter === "pendiente" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("pendiente")}
            >
              Pendientes ({counts.pendiente || 0})
            </button>
            <button
              type="button"
              className={`evidence-filter-btn ${statusFilter === "aprobada" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("aprobada")}
            >
              Aprobadas ({counts.aprobada || 0})
            </button>
            <button
              type="button"
              className={`evidence-filter-btn ${statusFilter === "rechazada" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("rechazada")}
            >
              Rechazadas ({counts.rechazada || 0})
            </button>
          </div>
        </div>

        <div className="quiz-manager__list evidence-list">
          {loading ? (
            <p className="quiz-empty">Cargando evidencias…</p>
          ) : filtered.length === 0 ? (
            <p className="quiz-empty">No hay evidencias en este filtro.</p>
          ) : (
            <div className="evidence-cards">
              {filtered.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.pendiente;
                return (
                  <article key={item.id} className="evidence-card">
                    <div className="evidence-card__head">
                      <div>
                        <strong>{item.students?.full_name || "Estudiante"}</strong>
                        <span className="attendance-code">{item.students?.student_code}</span>
                      </div>
                      <span className={`evidence-status ${meta.className}`}>{meta.label}</span>
                    </div>

                    <div className="evidence-card__body">
                      <p className="evidence-card__file">
                        {item.title || item.file_name}
                        <span className="evidence-card__meta">
                          {" "}· {formatSize(item.file_size)} · {formatDate(item.created_at)}
                        </span>
                      </p>
                      {item.description && (
                        <p className="evidence-card__desc">{item.description}</p>
                      )}
                      <button
                        type="button"
                        className="btn btn--secondary evidence-download-btn"
                        onClick={() => handleDownload(item)}
                      >
                        <IconDownload size={16} /> Ver / descargar
                      </button>
                    </div>

                    {!readOnly && (
                      <div className="evidence-card__review">
                        <textarea
                          className="input input--area"
                          rows={2}
                          placeholder="Comentario para el estudiante (opcional)"
                          value={commentDrafts[item.id] ?? item.reviewer_comment ?? ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                        />
                        <div className="evidence-card__actions">
                          <button
                            type="button"
                            className="btn-icon evidence-approve-btn"
                            title="Aprobar"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item, "aprobada")}
                          >
                            <IconCheck size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon evidence-reject-btn"
                            title="Rechazar"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item, "rechazada")}
                          >
                            <IconX size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Marcar pendiente"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item, "pendiente")}
                          >
                            <IconClock size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon--danger"
                            title="Eliminar"
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item)}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                        {item.reviewed_at && (
                          <p className="evidence-card__reviewed">
                            Revisado {formatDate(item.reviewed_at)}
                            {item.reviewed_by ? ` por ${item.reviewed_by}` : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
