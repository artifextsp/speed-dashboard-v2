import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconPlayerPlay,
  IconUsers,
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
    const results = await loadGameResults(initialGame.id);
    setGameState(state);
    setRanking(results);
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
  const presence = gameState?.presence || [];
  const totalStudents = activeStudents.length;
  const isLastQuestion = game.current_question_idx >= questions.length - 1;

  const joinedIds = useMemo(
    () => new Set(presence.map((p) => p.student_id)),
    [presence]
  );

  const pendingStudents = useMemo(
    () => activeStudents.filter((s) => !joinedIds.has(s.id)),
    [activeStudents, joinedIds]
  );

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
        <div className="quiz-game__banner">
          <div>
            <span className="quiz-game__eyebrow">Sesión en vivo</span>
            <h2>{game.quizzes?.title || initialGame.quiz_title}</h2>
            <p className="quiz-game__status">
              Estado: <strong>{statusLabel}</strong>
              {game.status === "active" && currentQuestion && (
                <> · Pregunta {game.current_question_idx + 1} de {questions.length}</>
              )}
            </p>
          </div>
          <button type="button" className="btn-icon btn-icon--on-dark" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className="quiz-game__layout">
          <section className="quiz-game__main">
            {game.status === "waiting" && (
              <div className="quiz-game__waiting">
                <IconUsers size={28} />
                <p>
                  {presence.length} de {totalStudents} estudiantes conectados.
                  Cuando estén listos, inicia la primera pregunta.
                </p>
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
                  Respuestas recibidas: <strong>{currentResponses.length}</strong> / {presence.length} conectados
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
                <p>El juego ha terminado. Los estudiantes ya pueden ver el ranking y su resumen.</p>
                <button type="button" className="btn btn--secondary" onClick={onFinished}>
                  Volver a cuestionarios
                </button>
              </div>
            )}
          </section>

          <aside className="quiz-game__sidebar">
            <section className="quiz-game__panel">
              <h3>Conectados ({presence.length}/{totalStudents})</h3>
              {presence.length === 0 ? (
                <p className="quiz-empty">Nadie ha ingresado aún.</p>
              ) : (
                <ul className="quiz-game__student-list">
                  {presence.map((row) => (
                    <li key={row.id}>
                      <span className="attendance-code">{row.students?.student_code}</span>
                      <span>{row.students?.full_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {pendingStudents.length > 0 && (
              <section className="quiz-game__panel quiz-game__panel--warning">
                <h3>Pendientes ({pendingStudents.length})</h3>
                <ul className="quiz-game__student-list">
                  {pendingStudents.map((student) => (
                    <li key={student.id}>
                      <span className="attendance-code">{student.student_code}</span>
                      <span>{student.full_name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {game.status === "active" && (
              <section className="quiz-game__panel">
                <h3>Respuestas de esta pregunta</h3>
                {currentResponses.length === 0 ? (
                  <p className="quiz-empty">Aún no hay respuestas.</p>
                ) : (
                  <table className="attendance-table attendance-table--compact">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Estudiante</th>
                        <th>Resultado</th>
                        <th>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentResponses.map((row, index) => {
                        const total = ranking.find((r) => r.student_id === row.student_id)?.total_score ?? 0;
                        return (
                          <tr key={row.id}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="quiz-game__student-cell">
                                <span className="attendance-code">{row.students?.student_code}</span>
                                <span>{row.students?.full_name}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`quiz-result-pill ${row.is_correct ? "is-ok" : "is-bad"}`}>
                                {row.is_correct ? "Correcta" : "Incorrecta"}
                              </span>
                            </td>
                            <td><strong>{total}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            <section className="quiz-game__panel">
              <h3>Ranking acumulado</h3>
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
                        <td><span className="attendance-code">{row.student_code}</span></td>
                        <td><strong>{row.total_score}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
