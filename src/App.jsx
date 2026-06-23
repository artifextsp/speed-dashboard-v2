import { useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { usePhases } from "./hooks/usePhases";
import { useSessions } from "./hooks/useSessions";
import { LoginScreen } from "./components/auth/LoginScreen";
import { DashboardView } from "./components/dashboard/DashboardView";
import { SessionEditor } from "./components/editor/SessionEditor";
import { Toast } from "./components/ui/Toast";
import { getClassPermissions } from "./kernel/permissions";

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut, changePassword } = useAuth();
  const { phases, error: phasesError } = usePhases(user);
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    saveSession,
    createSession,
    updateSessionMetadata,
    deleteSession,
    getVideos,
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

  const handleSave = async (formData) => {
    if (getClassPermissions(user?.role).readOnly) {
      showToast("No tienes permiso para editar clases", true);
      return;
    }
    setSaving(true);
    try {
      await saveSession(formData, [], user?.email);
      setEditingSession({ ...formData });
      setEditingVideos([]);
      showToast("Sesión guardada correctamente");
    } catch (err) {
      showToast(err.message || "Error al guardar", true);
    } finally {
      setSaving(false);
    }
  };

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
          onCreateSession={(data) => createSession(data, user?.email)}
          onUpdateSessionMetadata={(data) =>
            updateSessionMetadata(data, user?.email)
          }
          onDeleteSession={(id) => deleteSession(id, user?.email)}
        />
      ) : null}
    </div>
  );
}
