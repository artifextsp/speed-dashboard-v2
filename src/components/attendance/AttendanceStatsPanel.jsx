import { useEffect, useMemo, useState } from "react";
import { IconChartBar, IconX } from "@tabler/icons-react";
import { supabase } from "../../lib/supabase";
import {
  computeAttendanceStats,
  formatAttendanceDateTime,
  getAttendanceStatusConfig,
} from "../../kernel/attendanceConstants";

export function AttendanceStatsPanel({ user, sessions, onClose }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          "status, updated_at, students(full_name, student_code, id_number), attendance_roll_calls(id, label, taken_at, session_id, sessions(title, session_number))"
        );
      if (cancelled) return;
      if (error) {
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }
    if (user) load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const overall = useMemo(() => computeAttendanceStats(rows), [rows]);

  const byStudent = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const student = row.students;
      if (!student) continue;
      const key = student.student_code;
      if (!map.has(key)) {
        map.set(key, { student, records: [] });
      }
      map.get(key).records.push(row);
    }
    return [...map.values()]
      .map(({ student, records }) => ({
        student,
        ...computeAttendanceStats(records),
        rollCallCount: records.length,
      }))
      .sort((a, b) => a.student.full_name.localeCompare(b.student.full_name, "es"));
  }, [rows]);

  const bySession = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const rc = row.attendance_roll_calls;
      if (!rc?.session_id) continue;
      const session = rc.sessions;
      const key = rc.session_id;
      if (!map.has(key)) {
        map.set(key, {
          sessionId: key,
          title: session?.session_number
            ? `Sesión ${session.session_number}: ${session.title}`
            : session?.title || "Clase",
          rollCalls: new Set(),
          records: [],
        });
      }
      const entry = map.get(key);
      entry.rollCalls.add(rc.id);
      entry.records.push(row);
    }
    return [...map.values()]
      .map((entry) => ({
        ...entry,
        rollCallCount: entry.rollCalls.size,
        ...computeAttendanceStats(entry.records),
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [rows]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide attendance-stats" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>
              <IconChartBar size={22} /> Estadísticas de asistencia
            </h2>
            <p className="modal__subtitle">
              Resumen del piloto · {sessions.length} clases en el temario
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        {loading ? (
          <p className="attendance-empty">Calculando estadísticas…</p>
        ) : (
          <>
            <div className="attendance-stats__summary">
              <div className="attendance-kpi">
                <span className="attendance-kpi__value">{overall.total}</span>
                <span className="attendance-kpi__label">Registros totales</span>
              </div>
              <div className="attendance-kpi att-kpi--present">
                <span className="attendance-kpi__value">{overall.present}</span>
                <span className="attendance-kpi__label">Presentes</span>
              </div>
              <div className="attendance-kpi att-kpi--absent">
                <span className="attendance-kpi__value">{overall.absent}</span>
                <span className="attendance-kpi__label">Ausentes</span>
              </div>
              <div className="attendance-kpi att-kpi--excused">
                <span className="attendance-kpi__value">{overall.excused}</span>
                <span className="attendance-kpi__label">Con excusa</span>
              </div>
              <div className="attendance-kpi">
                <span className="attendance-kpi__value">{overall.rate}%</span>
                <span className="attendance-kpi__label">Asistencia global</span>
              </div>
            </div>

            <h3 className="attendance-stats__section-title">Por estudiante</h3>
            {byStudent.length === 0 ? (
              <p className="attendance-empty">Sin datos de asistencia aún.</p>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Estudiante</th>
                    <th>Llamados</th>
                    <th>Presente</th>
                    <th>Ausente</th>
                    <th>Excusa</th>
                    <th>% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {byStudent.map(({ student, rollCallCount, present, absent, excused, rate }) => (
                    <tr key={student.student_code}>
                      <td>
                        <span className="attendance-code">{student.student_code}</span>
                      </td>
                      <td>{student.full_name}</td>
                      <td>{rollCallCount}</td>
                      <td>{present}</td>
                      <td>{absent}</td>
                      <td>{excused}</td>
                      <td>{rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 className="attendance-stats__section-title">Por clase</h3>
            {bySession.length === 0 ? (
              <p className="attendance-empty">Sin llamados registrados por clase.</p>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Clase</th>
                    <th>Encuentros</th>
                    <th>Presente</th>
                    <th>Ausente</th>
                    <th>Excusa</th>
                    <th>% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {bySession.map((entry) => (
                    <tr key={entry.sessionId}>
                      <td>{entry.title}</td>
                      <td>{entry.rollCallCount}</td>
                      <td>{entry.present}</td>
                      <td>{entry.absent}</td>
                      <td>{entry.excused}</td>
                      <td>{entry.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 className="attendance-stats__section-title">Últimos registros</h3>
            <table className="attendance-table attendance-table--compact">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                  .slice(0, 15)
                  .map((row, index) => {
                    const cfg = getAttendanceStatusConfig(row.status);
                    return (
                      <tr key={`${row.attendance_roll_calls?.id}-${row.students?.student_code}-${index}`}>
                        <td>{formatAttendanceDateTime(row.updated_at)}</td>
                        <td>
                          <span className="attendance-code">{row.students?.student_code}</span>
                        </td>
                        <td>
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
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
