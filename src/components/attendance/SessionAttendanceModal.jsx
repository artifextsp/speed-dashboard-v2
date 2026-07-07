import { useCallback, useEffect, useMemo, useState } from "react";
import { IconClipboardList, IconPlus, IconX } from "@tabler/icons-react";
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
    updateRecordStatus,
    updateRollCallLabel,
  } = useAttendance(user);

  const [selectedRollCallId, setSelectedRollCallId] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const sessionTitle = session.session_number
    ? `Sesión ${session.session_number}: ${session.title}`
    : session.title;

  useEffect(() => {
    loadRollCallsForSession(session.id);
  }, [session.id, loadRollCallsForSession]);

  const refreshRecords = useCallback(async (rollCallId) => {
    if (!rollCallId) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    try {
      const rows = await loadRecordsForRollCall(rollCallId);
      setRecords(rows);
    } catch (err) {
      onNotify?.(err.message || "Error al cargar asistencia", true);
    } finally {
      setRecordsLoading(false);
    }
  }, [loadRecordsForRollCall, onNotify]);

  useEffect(() => {
    if (selectedRollCallId) refreshRecords(selectedRollCallId);
  }, [selectedRollCallId, refreshRecords]);

  useEffect(() => {
    if (!selectedRollCallId && rollCalls.length > 0) {
      setSelectedRollCallId(rollCalls[0].id);
    }
  }, [rollCalls, selectedRollCallId]);

  const selectedRollCall = useMemo(
    () => rollCalls.find((rc) => rc.id === selectedRollCallId) || null,
    [rollCalls, selectedRollCallId]
  );

  const stats = useMemo(() => computeAttendanceStats(records), [records]);

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

  const handleStatusChange = async (recordId, status) => {
    if (readOnly) return;
    try {
      await updateRecordStatus({
        recordId,
        status,
        updatedBy: user?.email,
      });
      await refreshRecords(selectedRollCallId);
    } catch (err) {
      onNotify?.(err.message || "Error al actualizar asistencia", true);
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
                  <IconPlus size={14} /> Nuevo
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
                  <li key={rc.id}>
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
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Estudiante</th>
                        <th>Identificación</th>
                        <th>Estado</th>
                        <th>Última modificación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((row) => {
                        const cfg = getAttendanceStatusConfig(row.status);
                        return (
                          <tr key={row.id}>
                            <td>
                              <span className="attendance-code">{row.students?.student_code}</span>
                            </td>
                            <td>{row.students?.full_name}</td>
                            <td>{row.students?.id_number}</td>
                            <td>
                              {readOnly ? (
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
                              ) : (
                                <select
                                  className="attendance-status-select"
                                  value={row.status}
                                  onChange={(e) => handleStatusChange(row.id, e.target.value)}
                                >
                                  {ATTENDANCE_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {getAttendanceStatusConfig(status).label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td>{formatAttendanceDateTime(row.updated_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
