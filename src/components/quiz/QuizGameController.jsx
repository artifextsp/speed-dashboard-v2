import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useQuizzes } from "../../hooks/useQuizzes";
import { useStudents } from "../../hooks/useStudents";

const OPTION_META = [
  { key: "a", label: "A", className: "quiz-option--a" },
  { key: "b", label: "B", className: "quiz-option--b" },
  { key: "c", label: "C", className: "quiz-option--c" },
  { key: "d", label: "D", className: "quiz-option--d" },
];

export function QuizGameController({
  user,
  game: initialGame,
  readOnly,
  onClose,
  onNotify,
  onFinished,
}) {
  const {
    startGame,
    revealAnswer,
    advanceQuestion,
    finishGame,
    loadGameState,
    loadGameResults,
  } = useQuizzes(user);
  const { activeStudents } = useStudents(user);

  const [gameState, setGameState] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const state = await loadGameState(initialGame.id);
    setGameState(state);
    if (state.game.status === "finished") {
      const results = await loadGameResults(initialGame.id);
      setRanking(results);
    } else {
      const results = await loadGameResults(initialGame.id);
      setRanking(results);
    }
  }, [initialGame.id, loadGameState, loadGameResults]);

  useEffect(() => {
    refresh().catch((err) => onNotify?.(err.message, true));
    const interval = setInterval(() => {
      refresh().catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [refresh, onNotify]);

  const game = gameState?.game || initialGame;
  const questions = gameState?.questions || initialGame.questions || [];
  const currentQuestion = gameState?.currentQuestion;
  const currentResponses = gameState?.currentResponses || [];
  const totalStudents = activeStudents.length;
  const isLastQuestion = game.current_question_idx >= questions.length - 1;

  const statusLabel = useMemo(() => {
    if (game.status === "waiting") return "Esperando inicio";
    if (game.status === "finished") return "Finalizado";
    if (game.question_phase === "reveal") return "Mostrando respuesta";
    return "Recibiendo respuestas";
  }, [game.status, game.question_phase]);

  const handleStart = async () => {
    if (readOnly) return;
    setBusy(true);
    try {
      await startGame(game.id);
      await refresh();
      onNotify?.("Juego iniciado. Los estudiantes ya pueden responder.");
    } catch (err) {
      onNotify?.(err.message || "No se pudo iniciar el juego", true);
    } finally {
      setBusy(false);
    }
  };

  const handleReveal = async () => {
    if (readOnly) return;
    setBusy(true);
    try {
      await revealAnswer(game.id);
      await refresh();
    } catch (err) {
      onNotify?.(err.message || "No se pudo revelar la respuesta", true);
    } finally {
      setBusy(false);
    }
  };

  const handleNext = async () => {
    if (readOnly) return;
    setBusy(true);
    try {
      if (isLastQuestion) {
        await finishGame(game.id);
        await refresh();
        onNotify?.("Juego finalizado");
      } else {
        await advanceQuestion(game.id, game.current_question_idx + 1);
        await refresh();
      }
    } catch (err) {
      onNotify?.(err.message || "No se pudo avanzar", true);
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    if (readOnly) return;
    const ok = window.confirm("¿Finalizar el juego ahora?");
    if (!ok) return;
    setBusy(true);
    try {
      await finishGame(game.id);
      await refresh();
      onNotify?.("Juego finalizado");
    } catch (err) {
      onNotify?.(err.message || "No se pudo finalizar", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide quiz-game" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>Control en vivo — {game.quizzes?.title || initialGame.quiz_title}</h2>
            <p className="modal__subtitle">
              Estado: <strong>{statusLabel}</strong>
              {game.status === "active" && currentQuestion && (
                <>
                  {" "}
                  · Pregunta {game.current_question_idx + 1} de {questions.length}
                </>
              )}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className="quiz-game__layout">
          <section className="quiz-game__main">
            {game.status === "waiting" && (
              <div className="quiz-game__waiting">
                <p>El juego está listo. Cuando los estudiantes estén conectados, inicia la primera pregunta.</p>
                {!readOnly && (
                  <button type="button" className="btn btn--primary" disabled={busy} onClick={handleStart}>
                    <IconPlayerPlay size={16} /> Iniciar juego
                  </button>
                )}
              </div>
            )}

            {game.status === "active" && currentQuestion && (
              <>
                <div className="quiz-game__question-card">
                  <h3>{currentQuestion.question_text}</h3>
                  {currentQuestion.question_image_url && (
                    <img
                      src={currentQuestion.question_image_url}
                      alt=""
                      className="quiz-game__question-image"
                    />
                  )}
                  <div className="quiz-game__options-preview">
                    {OPTION_META.map(({ key, label, className }) => (
                      <div
                        key={key}
                        className={`quiz-game__option-preview ${className} ${
                          game.question_phase === "reveal" &&
                          currentQuestion.correct_option === key
                            ? "is-correct"
                            : ""
                        }`}
                      >
                        <span>{label}</span>
                        <p>{currentQuestion[`option_${key}`]}</p>
                      </div>
                    ))}
                  </div>
                  {game.question_phase === "reveal" && currentQuestion.explanation_text && (
                    <div className="quiz-game__explanation">
                      <strong>Explicación:</strong> {currentQuestion.explanation_text}
                    </div>
                  )}
                </div>

                <div className="quiz-game__stats">
                  Respuestas recibidas: <strong>{currentResponses.length}</strong> / {totalStudents}
                </div>

                {!readOnly && (
                  <div className="quiz-game__actions">
                    {game.question_phase === "answering" ? (
                      <button type="button" className="btn btn--primary" disabled={busy} onClick={handleReveal}>
                        <IconCheck size={16} /> Mostrar respuesta
                      </button>
                    ) : (
                      <button type="button" className="btn btn--primary" disabled={busy} onClick={handleNext}>
                        <IconArrowRight size={16} />
                        {isLastQuestion ? "Finalizar juego" : "Siguiente pregunta"}
                      </button>
                    )}
                    <button type="button" className="btn btn--secondary" disabled={busy} onClick={handleFinish}>
                      Finalizar ahora
                    </button>
                  </div>
                )}
              </>
            )}

            {game.status === "finished" && (
              <div className="quiz-game__finished">
                <p>El juego ha terminado. Revisa el ranking a la derecha.</p>
                <button type="button" className="btn btn--secondary" onClick={onFinished}>
                  Volver a cuestionarios
                </button>
              </div>
            )}
          </section>

          <aside className="quiz-game__sidebar">
            <h3>Ranking (solo docente)</h3>
            {ranking.length === 0 ? (
              <p className="quiz-empty">Aún no hay puntajes.</p>
            ) : (
              <table className="attendance-table attendance-table--compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estudiante</th>
                    <th>Código</th>
                    <th>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((row, index) => (
                    <tr key={row.student_id}>
                      <td>{index + 1}</td>
                      <td>{row.student_name}</td>
                      <td>
                        <span className="attendance-code">{row.student_code}</span>
                      </td>
                      <td>
                        <strong>{row.total_score}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
