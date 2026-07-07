import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCheck, IconClipboardList, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useAttendance } from "../../hooks/useAttendance";
import { useStudents } from "../../hooks/useStudents";
import {
  ATTENDANCE_STATUSES,
  formatAttendanceDateTime,
  getAttendanceStatusConfig,
  computeAttendanceStats,
} from "../../kernel/attendanceConstants";

export function SessionAttendanceModal({
  session,
  user,
  readOnly,
  onClose,
  onNotify,
}) {
  const { activeStudents } = useStudents(user);
  const {
    rollCalls,
    loading,
    loadRollCallsForSession,
    loadRecordsForRollCall,
    createRollCall,
    syncRollCallRecords,
    updateRecordsStatusBulk,
    deleteRollCall,
    updateRollCallLabel,
  } = useAttendance(user);

  const [selectedRollCallId, setSelectedRollCallId] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [saving, setSaving] = useState(false);

  const sessionTitle = session.session_number
    ? `Sesión ${session.session_number}: ${session.title}`
    : session.title;

  useEffect(() => {
    loadRollCallsForSession(session.id);
  }, [session.id, loadRollCallsForSession]);

  const refreshRecords = useCallback(
    async (rollCallId) => {
      if (!rollCallId) {
        setRecords([]);
        return;
      }
      setRecordsLoading(true);
      try {
        try {
          await syncRollCallRecords({
            rollCallId,
            studentIds: activeStudents.map((s) => s.id),
            recordedBy: user?.email,
          });
        } catch {
          // La sincronización es best-effort; si falla, igual mostramos lo que exista.
        }
        const rows = await loadRecordsForRollCall(rollCallId);
        setRecords(rows);
      } catch (err) {
        onNotify?.(err.message || "Error al cargar asistencia", true);
      } finally {
        setRecordsLoading(false);
      }
    },
    [loadRecordsForRollCall, syncRollCallRecords, activeStudents, user?.email, onNotify]
  );

  useEffect(() => {
    if (selectedRollCallId) refreshRecords(selectedRollCallId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRollCallId]);

  useEffect(() => {
    if (!selectedRollCallId && rollCalls.length > 0) {
      setSelectedRollCallId(rollCalls[0].id);
    }
  }, [rollCalls, selectedRollCallId]);

  const selectedRollCall = useMemo(
    () => rollCalls.find((rc) => rc.id === selectedRollCallId) || null,
    [rollCalls, selectedRollCallId]
  );

  useEffect(() => {
    const map = {};
    for (const r of records) map[r.id] = r.status;
    setPendingStatuses(map);
  }, [records]);

  const stats = useMemo(
    () =>
      computeAttendanceStats(
        records.map((r) => ({ status: pendingStatuses[r.id] || r.status }))
      ),
    [records, pendingStatuses]
  );

  const hasChanges = records.some((r) => pendingStatuses[r.id] !== r.status);

  const handleCreateRollCall = async () => {
    if (activeStudents.length === 0) {
      onNotify?.("Registra estudiantes antes de crear un llamado a lista", true);
      return;
    }
    setCreating(true);
    try {
      const rollCall = await createRollCall({
        sessionId: session.id,
        label: newLabel || `Encuentro ${rollCalls.length + 1}`,
        studentIds: activeStudents.map((s) => s.id),
        recordedBy: user?.email,
      });
      setNewLabel("");
      await loadRollCallsForSession(session.id);
      setSelectedRollCallId(rollCall.id);
      onNotify?.("Llamado a lista creado");
    } catch (err) {
      onNotify?.(err.message || "Error al crear llamado", true);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRollCall = async (rollCall, event) => {
    event.stopPropagation();
    const ok = window.confirm(
      `¿Eliminar el llamado "${rollCall.label || "Llamado a lista"}" del ${formatAttendanceDateTime(
        rollCall.taken_at
      )}?\n\nSe borrarán todos los registros de asistencia de ese encuentro. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await deleteRollCall(rollCall.id);
      if (selectedRollCallId === rollCall.id) {
        setSelectedRollCallId(null);
        setRecords([]);
      }
      await loadRollCallsForSession(session.id);
      onNotify?.("Llamado a lista eliminado");
    } catch (err) {
      onNotify?.(err.message || "Error al eliminar el llamado", true);
    }
  };

  const handleSelectStatus = (recordId, status) => {
    if (readOnly) return;
    setPendingStatuses((prev) => ({ ...prev, [recordId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (readOnly) return;
    const changed = records.filter(
      (r) => pendingStatuses[r.id] && pendingStatuses[r.id] !== r.status
    );
    if (changed.length === 0) {
      onNotify?.("No hay cambios para registrar");
      return;
    }

    const previousRecords = records;
    const now = new Date().toISOString();

    // Actualización optimista: se ve instantáneo, sin esperar la red.
    setRecords((prev) =>
      prev.map((r) =>
        pendingStatuses[r.id] && pendingStatuses[r.id] !== r.status
          ? { ...r, status: pendingStatuses[r.id], updated_at: now }
          : r
      )
    );
    onNotify?.(`Asistencia registrada: ${changed.length} estudiante(s) actualizados`);

    setSaving(true);
    try {
      const rows = changed.map((r) => ({
        id: r.id,
        roll_call_id: r.roll_call_id,
        student_id: r.student_id,
        status: pendingStatuses[r.id],
      }));
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("La operación tardó demasiado. Verifica tu conexión e intenta de nuevo.")),
          20000
        )
      );
      await Promise.race([updateRecordsStatusBulk(rows, user?.email), timeout]);
    } catch (err) {
      // Revierte la actualización optimista si el guardado real falló.
      setRecords(previousRecords);
      onNotify?.(err.message || "Error al registrar asistencia, se deshicieron los cambios", true);
    } finally {
      setSaving(false);
    }
  };

  const handleLabelSave = async () => {
    if (!selectedRollCall || readOnly) return;
    try {
      await updateRollCallLabel(selectedRollCall.id, newLabel || selectedRollCall.label);
      await loadRollCallsForSession(session.id);
      onNotify?.("Etiqueta actualizada");
    } catch (err) {
      onNotify?.(err.message || "Error al guardar etiqueta", true);
    }
  };

  useEffect(() => {
    setNewLabel(selectedRollCall?.label || "");
  }, [selectedRollCall]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide attendance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>
              <IconClipboardList size={22} /> Llamado a lista
            </h2>
            <p className="modal__subtitle">{sessionTitle}</p>
            <p className="modal__hint">
              Una clase puede tener varios llamados (encuentros). Los estudiantes ven solo su código
              en proyectospeed.com/asistencia.html
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className="attendance-modal__layout">
          <aside className="attendance-modal__sidebar">
            <div className="attendance-modal__sidebar-head">
              <strong>Llamados de esta clase</strong>
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleCreateRollCall}
                  disabled={creating}
                >
                  <IconPlus size={14} /> {creating ? "Creando…" : "Nuevo"}
                </button>
              )}
            </div>
            {!readOnly && (
              <input
                className="attendance-modal__label-input"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Etiqueta del próximo encuentro (opcional)"
              />
            )}
            {loading ? (
              <p className="attendance-empty">Cargando…</p>
            ) : rollCalls.length === 0 ? (
              <p className="attendance-empty">Sin llamados aún.</p>
            ) : (
              <ul className="attendance-roll-list">
                {rollCalls.map((rc) => (
                  <li key={rc.id} className="attendance-roll-list__row">
                    <button
                      type="button"
                      className={`attendance-roll-list__item${
                        rc.id === selectedRollCallId ? " is-active" : ""
                      }`}
                      onClick={() => setSelectedRollCallId(rc.id)}
                    >
                      <span>{rc.label || "Llamado a lista"}</span>
                      <small>{formatAttendanceDateTime(rc.taken_at)}</small>
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn-icon btn-icon--danger attendance-roll-list__delete"
                        title="Eliminar este llamado"
                        onClick={(e) => handleDeleteRollCall(rc, e)}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="attendance-modal__main">
            {!selectedRollCall ? (
              <p className="attendance-empty">Selecciona o crea un llamado a lista.</p>
            ) : (
              <>
                <div className="attendance-modal__meta">
                  <div>
                    <strong>{selectedRollCall.label || "Llamado a lista"}</strong>
                    <p>Fecha y hora: {formatAttendanceDateTime(selectedRollCall.taken_at)}</p>
                    {!readOnly && (
                      <div className="attendance-modal__label-edit">
                        <input
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder="Renombrar encuentro"
                        />
                        <button type="button" className="btn btn--secondary btn--sm" onClick={handleLabelSave}>
                          Guardar nombre
                        </button>
                      </div>
                    )}
                    <p className="attendance-modal__small-hint">
                      "Guardar nombre" solo cambia la etiqueta de este encuentro (ej. "Clase 1"). Para
                      marcar presente/ausente usa los botones de abajo y luego "Registrar asistencia".
                    </p>
                  </div>
                  <div className="attendance-stats-inline">
                    <span className="att-stat att-stat--present">{stats.present} presentes</span>
                    <span className="att-stat att-stat--absent">{stats.absent} ausentes</span>
                    <span className="att-stat att-stat--excused">{stats.excused} excusa</span>
                    <span className="att-stat">{stats.rate}% asistencia</span>
                  </div>
                </div>

                {recordsLoading ? (
                  <p className="attendance-empty">Cargando registros…</p>
                ) : (
                  <>
                    <div className="attendance-table-scroll">
                      <table className="attendance-table attendance-table--sticky">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Estudiante</th>
                            <th>Identificación</th>
                            <th>Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((row) => {
                            const currentStatus = pendingStatuses[row.id] || row.status;
                            return (
                              <tr key={row.id}>
                                <td>
                                  <span className="attendance-code">{row.students?.student_code}</span>
                                </td>
                                <td>{row.students?.full_name}</td>
                                <td>{row.students?.id_number}</td>
                                <td>
                                  {readOnly ? (
                                    (() => {
                                      const cfg = getAttendanceStatusConfig(currentStatus);
                                      return (
                                        <span
                                          className="attendance-pill"
                                          style={{
                                            color: cfg.color,
                                            background: cfg.bg,
                                            borderColor: cfg.border,
                                          }}
                                        >
                                          {cfg.label}
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    <div className="attendance-status-options">
                                      {ATTENDANCE_STATUSES.map((status) => {
                                        const cfg = getAttendanceStatusConfig(status);
                                        const isActive = currentStatus === status;
                                        return (
                                          <button
                                            key={status}
                                            type="button"
                                            className={`attendance-status-option${
                                              isActive ? " is-active" : ""
                                            }`}
                                            style={
                                              isActive
                                                ? {
                                                    color: cfg.color,
                                                    background: cfg.bg,
                                                    borderColor: cfg.border,
                                                  }
                                                : undefined
                                            }
                                            onClick={() => handleSelectStatus(row.id, status)}
                                          >
                                            {cfg.shortLabel} · {cfg.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {!readOnly && (
                      <div className="attendance-modal__save-bar">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={handleSaveAttendance}
                          disabled={!hasChanges}
                        >
                          <IconCheck size={16} />
                          Registrar asistencia
                        </button>
                        {hasChanges && (
                          <span className="attendance-modal__save-hint">
                            Hay cambios sin guardar
                          </span>
                        )}
                        {saving && (
                          <span className="attendance-modal__save-hint attendance-modal__save-hint--sync">
                            Sincronizando…
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
