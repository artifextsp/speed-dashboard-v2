import { useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { usePhases } from "./hooks/usePhases";
import { useSessions } from "./hooks/useSessions";
import { LoginScreen } from "./components/auth/LoginScreen";
import { DashboardView } from "./components/dashboard/DashboardView";
import { SessionEditor } from "./components/editor/SessionEditor";
import { Toast } from "./components/ui/Toast";
import { getClassPermissions } from "./kernel/permissions";
import { downloadSessionPdf } from "./utils/sessionPdfExporter";
import {
  downloadSyllabusDocx,
  downloadSyllabusPdf,
} from "./utils/syllabusExporter";

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut, changePassword } = useAuth();
  const { phases, error: phasesError, createPhase, updatePhase, deletePhase } = usePhases(user);
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    saveSession,
    createSession,
    updateSessionMetadata,
    deleteSession,
    getVideos,
    fetchFreshSessions,
  } = useSessions(user);

  const [editingSession, setEditingSession] = useState(null);
  const [editingVideos, setEditingVideos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback(
    (msg, isError = false) => setToast({ msg, isError }),
    []
  );

  const handleLogin = async (email, password, mode) => {
    if (mode === "signup") {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  };

  const handleEditSession = useCallback(
    async (session) => {
      setLoadingEditor(true);
      try {
        const vids = await getVideos(session.id);
        setEditingVideos(vids);
        setEditingSession(session);
      } catch (err) {
        setToast({ msg: err.message || "Error al cargar la sesión", isError: true });
      } finally {
        setLoadingEditor(false);
      }
    },
    [getVideos]
  );

  const handleSave = async (formData, options = {}) => {
    const { silent = false } = options;
    if (getClassPermissions(user?.role).readOnly) {
      if (!silent) showToast("No tienes permiso para editar clases", true);
      return false;
    }
    setSaving(true);
    try {
      await saveSession(formData, editingVideos, user?.email);
      setEditingSession({ ...formData });
      if (!silent) {
        showToast("Sesión guardada correctamente");
      }
      return true;
    } catch (err) {
      showToast(err.message || "Error al guardar", true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = useCallback(
    async (session) => {
      try {
        const phase = phases.find((p) => p.id === session.phase_id);
        const videos = await getVideos(session.id);
        const filename = await downloadSessionPdf(session, phase, videos);
        showToast(`PDF descargado: ${filename}`);
      } catch (err) {
        showToast(err.message || "Error al generar el PDF", true);
      }
    },
    [phases, getVideos, showToast]
  );

  const handleExportSyllabusPdf = useCallback(
    async (phaseFilterId) => {
      try {
        const filename = await downloadSyllabusPdf({
          phases,
          sessions,
          phaseFilterId,
        });
        showToast(`Temario PDF descargado: ${filename}`);
      } catch (err) {
        showToast(err.message || "Error al exportar el temario PDF", true);
      }
    },
    [phases, sessions, showToast]
  );

  const handleExportSyllabusDocx = useCallback(
    async (phaseFilterId) => {
      try {
        const filename = await downloadSyllabusDocx({
          phases,
          sessions,
          phaseFilterId,
        });
        showToast(`Temario Word descargado: ${filename}`);
      } catch (err) {
        showToast(err.message || "Error al exportar el temario DOCX", true);
      }
    },
    [phases, sessions, showToast]
  );

  if (authLoading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const dataError = phasesError || sessionsError;

  const permissions = getClassPermissions(user?.role);

  return (
    <div className="app">
      {toast && (
        <Toast
          message={toast.msg}
          isError={toast.isError}
          onClose={() => setToast(null)}
        />
      )}

      {dataError && (
        <div className="toast toast--error" style={{ position: "relative", margin: "16px auto", maxWidth: 600 }}>
          Error al cargar datos: {dataError}
        </div>
      )}

      {loadingEditor && (
        <div className="loading-screen">Cargando editor...</div>
      )}

      {editingSession && !loadingEditor ? (
        <div className="container">
          <SessionEditor
            key={editingSession.id}
            session={editingSession}
            phase={phases.find((p) => p.id === editingSession.phase_id)}
            videos={editingVideos}
            onSave={handleSave}
            onBack={() => setEditingSession(null)}
            saving={saving}
            readOnly={permissions.readOnly}
          />
        </div>
      ) : !loadingEditor ? (
        <DashboardView
          phases={phases}
          sessions={sessions}
          user={user}
          onSignOut={signOut}
          onEditSession={handleEditSession}
          onChangePassword={changePassword}
          onPublishResult={(msg, isError) => showToast(msg, isError)}
          fetchFreshSessions={fetchFreshSessions}
          onCreateSession={(data) => createSession(data, user?.email)}
          onUpdateSessionMetadata={(data) =>
            updateSessionMetadata(data, user?.email)
          }
          onDeleteSession={(id) => deleteSession(id, user?.email)}
          onDownloadPdf={handleDownloadPdf}
          onExportSyllabusPdf={handleExportSyllabusPdf}
          onExportSyllabusDocx={handleExportSyllabusDocx}
          onCreatePhase={(data) => createPhase(data)}
          onUpdatePhase={(data) => updatePhase(data)}
          onDeletePhase={(id) => deletePhase(id)}
        />
      ) : null}
    </div>
  );
}
