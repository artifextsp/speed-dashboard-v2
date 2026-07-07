import { useState, useMemo } from "react";
import { IconLogout, IconEye, IconKey, IconPlus, IconUsers, IconChartBar } from "@tabler/icons-react";
import { PHASE_COLORS, UNASSIGNED_BLOCK_FILTER } from "../../utils/constants";
import { getClassPermissions } from "../../kernel/permissions";
import { sortSessionsByDate } from "../../kernel/sortByDate";
import {
  PhaseCard,
  UnassignedBlockCard,
} from "./PhaseCard";
import { PhaseMetaModal } from "./PhaseMetaModal";
import { SessionRow } from "./SessionRow";
import { SessionMetaModal } from "./SessionMetaModal";
import { SyllabusExportButtons } from "./SyllabusExportButtons";
import { StatsBar } from "./StatsBar";
import { ChangePasswordModal } from "../ui/ChangePasswordModal";
import { PublishButton } from "../publish/PublishButton";
import { InstitutionLogos } from "../ui/InstitutionLogos";
import { StudentsAdminPanel } from "../attendance/StudentsAdminPanel";
import { AttendanceStatsPanel } from "../attendance/AttendanceStatsPanel";
import { SessionAttendanceModal } from "../attendance/SessionAttendanceModal";

export function DashboardView({
  phases,
  sessions,
  user,
  onSignOut,
  onEditSession,
  onChangePassword,
  onPublishResult,
  fetchFreshSessions,
  onCreateSession,
  onUpdateSessionMetadata,
  onDeleteSession,
  onDownloadPdf,
  onExportSyllabusPdf,
  onExportSyllabusDocx,
  onCreatePhase,
  onUpdatePhase,
  onDeletePhase,
}) {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [metaModal, setMetaModal] = useState(null);
  const [phaseModal, setPhaseModal] = useState(null);
  const [showStudentsAdmin, setShowStudentsAdmin] = useState(false);
  const [showAttendanceStats, setShowAttendanceStats] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const permissions = getClassPermissions(user?.role);

  const sortedPhases = useMemo(
    () =>
      [...phases].sort(
        (a, b) =>
          (a.sort_order ?? a.phase_number ?? 0) -
          (b.sort_order ?? b.phase_number ?? 0)
      ),
    [phases]
  );

  const sortedSessions = useMemo(
    () => sortSessionsByDate(sessions),
    [sessions]
  );

  const unassignedSessions = useMemo(
    () => sortedSessions.filter((s) => !s.phase_id),
    [sortedSessions]
  );

  const sessionsByPhase = useMemo(() => {
    const map = {};
    phases.forEach((p) => {
      map[p.id] = [];
    });
    sortedSessions.forEach((s) => {
      if (s.phase_id && map[s.phase_id]) map[s.phase_id].push(s);
    });
    return map;
  }, [phases, sortedSessions]);

  const filteredSessions = useMemo(() => {
    if (!selectedPhase) return sortedSessions;
    if (selectedPhase === UNASSIGNED_BLOCK_FILTER) return unassignedSessions;
    return sortedSessions.filter((s) => s.phase_id === selectedPhase);
  }, [selectedPhase, sortedSessions, unassignedSessions]);

  const handleDelete = async (session) => {
    const label = session.session_number
      ? `Sesión ${session.session_number}: ${session.title}`
      : session.title;
    const ok = window.confirm(
      `¿Eliminar "${label}"?\n\nSe borrará la clase y su contenido. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await onDeleteSession(session.id);
      onPublishResult?.("Clase eliminada", false);
    } catch (err) {
      onPublishResult?.(err.message || "Error al eliminar", true);
    }
  };

  const handleMetaSave = async (form) => {
    if (metaModal?.mode === "create") {
      await onCreateSession(form);
      onPublishResult?.("Clase creada correctamente", false);
    } else {
      await onUpdateSessionMetadata(form);
      onPublishResult?.("Datos de la clase actualizados", false);
    }
  };

  const handlePhaseSave = async (form) => {
    if (phaseModal?.mode === "create") {
      await onCreatePhase(form);
      onPublishResult?.("Bloque didáctico creado", false);
    } else {
      await onUpdatePhase(form);
      onPublishResult?.("Bloque didáctico actualizado", false);
    }
  };

  const handlePhaseDelete = async (phaseId) => {
    await onDeletePhase(phaseId);
    if (selectedPhase === phaseId) setSelectedPhase(null);
    onPublishResult?.("Bloque eliminado. Las clases quedaron sin bloque.", false);
  };

  const togglePhaseFilter = (phaseId) => {
    setSelectedPhase((current) => (current === phaseId ? null : phaseId));
  };

  const blockFilterLabel = useMemo(() => {
    if (!selectedPhase) return null;
    if (selectedPhase === UNASSIGNED_BLOCK_FILTER) return "Sin bloque";
    const phase = phases.find((p) => p.id === selectedPhase);
    return phase?.title || null;
  }, [selectedPhase, phases]);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-main">
          <div>
            <h1 className="dashboard__title">
              <span style={{ color: PHASE_COLORS.A }}>SPEED</span> Dashboard
            </h1>
            <p className="dashboard__subtitle">
              Piloto de robótica educativa · Uniminuto 2026
              {isSupervisor
                ? " · Modo supervisión (solo lectura)"
                : " · Planifica y diseña las clases del curso"}
            </p>
          </div>
          <InstitutionLogos className="dashboard__logos" />
        </div>
        <div className="dashboard__user">
          <div className="dashboard__user-info">
            <span className="dashboard__email">{user.displayName || user.email}</span>
            {isSupervisor && (
              <span className="role-badge role-badge--supervisor">
                <IconEye size={11} /> Supervisor
              </span>
            )}
          </div>
          <button className="btn-icon" onClick={() => setShowChangePassword(true)} title="Cambiar contraseña">
            <IconKey size={16} />
          </button>
          <button className="btn-icon btn-icon--danger" onClick={onSignOut}>
            <IconLogout size={16} /> Salir
          </button>
        </div>
        {showChangePassword && (
          <ChangePasswordModal
            onClose={() => setShowChangePassword(false)}
            onSave={onChangePassword}
          />
        )}
      </header>

      <StatsBar sessions={sortedSessions} />

      {(permissions.canManageStudents || permissions.canViewAttendance) && (
        <div className="dashboard__attendance-bar">
          {permissions.canManageStudents && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowStudentsAdmin(true)}
            >
              <IconUsers size={16} /> Estudiantes del piloto
            </button>
          )}
          {permissions.canViewAttendance && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowAttendanceStats(true)}
            >
              <IconChartBar size={16} /> Estadísticas de asistencia
            </button>
          )}
        </div>
      )}

      {isAdmin && (
        <PublishButton
          phases={phases}
          sessions={sortedSessions}
          fetchFreshSessions={fetchFreshSessions}
          onResult={(msg, isError, meta) => {
            onPublishResult?.(msg, isError, meta);
          }}
        />
      )}

      <div className="phase-section">
        <div className="phase-section__toolbar">
          <span className="phase-section__heading">Bloques didácticos</span>
          {permissions.canEdit && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setPhaseModal({ mode: "create" })}
            >
              <IconPlus size={16} /> Bloque didáctico
            </button>
          )}
        </div>
        <div className="phase-grid">
          {sortedPhases.map((p) => (
            <PhaseCard
              key={p.id}
              phase={p}
              sessions={sessionsByPhase[p.id] || []}
              isActive={selectedPhase === p.id}
              onSelect={() => togglePhaseFilter(p.id)}
              onEdit={(phase) => setPhaseModal({ mode: "edit", phase })}
              canEdit={permissions.canEdit}
            />
          ))}
          {unassignedSessions.length > 0 && (
            <UnassignedBlockCard
              sessions={unassignedSessions}
              isActive={selectedPhase === UNASSIGNED_BLOCK_FILTER}
              onSelect={() => togglePhaseFilter(UNASSIGNED_BLOCK_FILTER)}
            />
          )}
        </div>
      </div>

      <div className="session-list">
        <div className="session-list__toolbar">
          <span className="session-list__heading">
            {blockFilterLabel
              ? `Clases — ${blockFilterLabel} (ordenadas por fecha)`
              : "Temario completo (ordenado por fecha)"}
          </span>
          <div className="session-list__toolbar-actions">
            {permissions.canDownloadPdf && (
              <SyllabusExportButtons
                disabled={filteredSessions.length === 0}
                onExportPdf={() => onExportSyllabusPdf?.(selectedPhase)}
                onExportDocx={() => onExportSyllabusDocx?.(selectedPhase)}
              />
            )}
            {permissions.canEdit && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setMetaModal({ mode: "create" })}
              >
                <IconPlus size={16} /> Nueva clase
              </button>
            )}
          </div>
        </div>

        {filteredSessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            phase={phases.find((p) => p.id === s.phase_id)}
            onClick={() => onEditSession(s)}
            onEditMeta={(session) =>
              setMetaModal({ mode: "edit", session })
            }
            onDelete={handleDelete}
            onDownloadPdf={onDownloadPdf}
            onAttendance={
              permissions.canViewAttendance
                ? (session) => setAttendanceSession(session)
                : undefined
            }
            canDownloadPdf={permissions.canDownloadPdf}
            readOnly={permissions.readOnly}
          />
        ))}
      </div>

      {metaModal && (
        <SessionMetaModal
          mode={metaModal.mode}
          session={metaModal.session}
          phases={sortedPhases}
          sessions={sessions}
          onClose={() => setMetaModal(null)}
          onSave={handleMetaSave}
        />
      )}

      {phaseModal && (
        <PhaseMetaModal
          mode={phaseModal.mode}
          phase={phaseModal.phase}
          phases={sortedPhases}
          sessions={sessions}
          onClose={() => setPhaseModal(null)}
          onSave={handlePhaseSave}
          onDelete={handlePhaseDelete}
        />
      )}

      {showStudentsAdmin && (
        <StudentsAdminPanel
          user={user}
          onClose={() => setShowStudentsAdmin(false)}
          onNotify={onPublishResult}
        />
      )}

      {showAttendanceStats && (
        <AttendanceStatsPanel
          user={user}
          sessions={sortedSessions}
          onClose={() => setShowAttendanceStats(false)}
        />
      )}

      {attendanceSession && (
        <SessionAttendanceModal
          session={attendanceSession}
          user={user}
          readOnly={!permissions.canRecordAttendance}
          onClose={() => setAttendanceSession(null)}
          onNotify={onPublishResult}
        />
      )}
    </div>
  );
}
