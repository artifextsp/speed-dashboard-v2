import { useState, useMemo } from "react";
import { IconLogout, IconEye, IconKey } from "@tabler/icons-react";
import { PHASE_COLORS } from "../../utils/constants";
import { getClassPermissions } from "../../kernel/permissions";
import { sortSessionsByDate } from "../../kernel/sortByDate";
import { PhaseCard } from "./PhaseCard";
import { SessionRow } from "./SessionRow";
import { StatsBar } from "./StatsBar";
import { ChangePasswordModal } from "../ui/ChangePasswordModal";
import { PublishButton } from "../publish/PublishButton";

export function DashboardView({ phases, sessions, user, onSignOut, onEditSession, onChangePassword, onPublishResult }) {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const permissions = getClassPermissions(user?.role);

  const sortedSessions = useMemo(
    () => sortSessionsByDate(sessions),
    [sessions]
  );

  const sessionsByPhase = useMemo(() => {
    const map = {};
    phases.forEach((p) => (map[p.id] = []));
    sortedSessions.forEach((s) => {
      if (map[s.phase_id]) map[s.phase_id].push(s);
    });
    return map;
  }, [phases, sortedSessions]);

  const filteredSessions = selectedPhase
    ? sortedSessions.filter((s) => s.phase_id === selectedPhase)
    : sortedSessions;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
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

      {isAdmin && (
        <PublishButton
          phases={phases}
          sessions={sortedSessions}
          onResult={(msg, isError, meta) => {
            onPublishResult?.(msg, isError, meta);
          }}
        />
      )}

      <div className="phase-grid">
        {phases.map((p) => (
          <PhaseCard
            key={p.id}
            phase={p}
            sessions={sessionsByPhase[p.id] || []}
            isActive={selectedPhase === p.id}
            onSelect={() =>
              setSelectedPhase(selectedPhase === p.id ? null : p.id)
            }
          />
        ))}
      </div>

      <div className="session-list">
        {filteredSessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            phase={phases.find((p) => p.id === s.phase_id)}
            onClick={() => onEditSession(s)}
            readOnly={permissions.readOnly}
          />
        ))}
      </div>
    </div>
  );
}
