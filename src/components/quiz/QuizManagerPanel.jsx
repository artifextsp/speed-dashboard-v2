import { useState } from "react";
import {
  IconChartBar,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuizzes } from "../../hooks/useQuizzes";
import { QuizEditorModal } from "./QuizEditorModal";
import { QuizGameController } from "./QuizGameController";
import { QuizResultsPanel } from "./QuizResultsPanel";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function QuizManagerPanel({ user, readOnly, onClose, onNotify }) {
  const {
    quizzes,
    loading,
    loadQuizQuestions,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    launchGame,
    loadGameSessions,
  } = useQuizzes(user);

  const [editorQuiz, setEditorQuiz] = useState(null);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [resultsGame, setResultsGame] = useState(null);
  const [launchingId, setLaunchingId] = useState(null);

  const openCreate = () => setEditorQuiz({ mode: "create" });

  const openEdit = async (quiz) => {
    setLoadingEditor(true);
    try {
      const questions = await loadQuizQuestions(quiz.id);
      setEditorQuiz({ mode: "edit", quiz: { ...quiz, questions } });
    } catch (err) {
      onNotify?.(err.message || "No se pudieron cargar las preguntas", true);
    } finally {
      setLoadingEditor(false);
    }
  };

  const handleSave = async ({
    title,
    description,
    questions,
    auto_advance,
    auto_advance_delay_seconds,
  }) => {
    if (editorQuiz?.mode === "create") {
      await createQuiz({
        title,
        description,
        questions,
        auto_advance,
        auto_advance_delay_seconds,
        createdBy: user?.email,
      });
      onNotify?.("Cuestionario creado");
    } else {
      await updateQuiz(editorQuiz.quiz.id, {
        title,
        description,
        questions,
        auto_advance,
        auto_advance_delay_seconds,
      });
      onNotify?.("Cuestionario actualizado");
    }
  };

  const handleDelete = async (quiz) => {
    const ok = window.confirm(
      `¿Eliminar "${quiz.title}"?\n\nSe borrarán sus preguntas y juegos asociados.`
    );
    if (!ok) return;
    try {
      await deleteQuiz(quiz.id);
      onNotify?.("Cuestionario eliminado");
    } catch (err) {
      onNotify?.(err.message || "Error al eliminar", true);
    }
  };

  const handleLaunch = async (quiz) => {
    if (readOnly) return;
    setLaunchingId(quiz.id);
    try {
      const game = await launchGame({ quizId: quiz.id, createdBy: user?.email });
      const questions = await loadQuizQuestions(quiz.id);
      setActiveGame({
        ...game,
        quiz_title: quiz.title,
        questions,
      });
      onNotify?.(`Juego "${quiz.title}" listo. Los estudiantes pueden ingresar en proyectospeed.com/quiz.html`);
    } catch (err) {
      onNotify?.(err.message || "No se pudo lanzar el juego", true);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleViewResults = async (quiz) => {
    try {
      const sessions = await loadGameSessions(quiz.id);
      const finished = sessions.filter((s) => s.status === "finished");
      if (!finished.length) {
        onNotify?.("Este cuestionario aún no tiene juegos finalizados", true);
        return;
      }
      setResultsGame({
        quiz,
        gameSession: finished[0],
      });
    } catch (err) {
      onNotify?.(err.message || "No se pudieron cargar resultados", true);
    }
  };

  if (activeGame) {
    return (
      <QuizGameController
        user={user}
        game={activeGame}
        readOnly={readOnly}
        onClose={() => setActiveGame(null)}
        onNotify={onNotify}
        onFinished={() => setActiveGame(null)}
      />
    );
  }

  if (resultsGame) {
    return (
      <QuizResultsPanel
        user={user}
        quiz={resultsGame.quiz}
        gameSession={resultsGame.gameSession}
        onClose={() => setResultsGame(null)}
      />
    );
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--wide quiz-manager" onClick={(e) => e.stopPropagation()}>
          <div className="quiz-editor__banner quiz-manager__banner">
          <div>
            <span className="quiz-editor__eyebrow">Evaluación en vivo</span>
            <h2>Cuestionarios</h2>
            <p className="quiz-editor__intro">
              Crea cuestionarios reutilizables y lánzalos en vivo. Los estudiantes responden desde
              proyectospeed.com/quiz.html con su código de 4 dígitos.
            </p>
          </div>
          <button type="button" className="btn-icon btn-icon--on-dark" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
          </div>

          {!readOnly && (
            <div className="quiz-manager__toolbar">
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <IconPlus size={16} /> Nuevo cuestionario
              </button>
            </div>
          )}

          <div className="quiz-manager__list">
            {loading ? (
              <p className="quiz-empty">Cargando cuestionarios…</p>
            ) : quizzes.length === 0 ? (
              <p className="quiz-empty">Aún no hay cuestionarios creados.</p>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Preguntas</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <td>
                        <strong>{quiz.title}</strong>
                        {quiz.description && (
                          <p className="quiz-manager__desc">{quiz.description}</p>
                        )}
                      </td>
                      <td>{quiz.question_count}</td>
                      <td>{formatDate(quiz.created_at)}</td>
                      <td>
                        <div className="attendance-row-actions">
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Editar"
                                disabled={loadingEditor}
                                onClick={() => openEdit(quiz)}
                              >
                                <IconPencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon--danger"
                                title="Eliminar"
                                onClick={() => handleDelete(quiz)}
                              >
                                <IconTrash size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Lanzar juego"
                                disabled={!quiz.question_count || launchingId === quiz.id}
                                onClick={() => handleLaunch(quiz)}
                              >
                                <IconPlayerPlay size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn-icon"
                            title="Ver resultados"
                            onClick={() => handleViewResults(quiz)}
                          >
                            <IconChartBar size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editorQuiz && (
        <QuizEditorModal
          quiz={editorQuiz.mode === "edit" ? editorQuiz.quiz : null}
          onClose={() => setEditorQuiz(null)}
          onSave={handleSave}
          onNotify={onNotify}
        />
      )}
    </>
  );
}
