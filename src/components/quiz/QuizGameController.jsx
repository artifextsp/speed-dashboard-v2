import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
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

function computeSecondsLeft(game, currentQuestion) {
  if (!game || game.status !== "active") return null;
  const now = Date.now();

  if (
    game.question_phase === "answering" &&
    currentQuestion?.time_limit_seconds &&
    game.question_started_at
  ) {
    const ends =
      new Date(game.question_started_at).getTime() +
      currentQuestion.time_limit_seconds * 1000;
    return Math.max(0, Math.ceil((ends - now) / 1000));
  }

  if (
    game.question_phase === "reveal" &&
    game.quizzes?.auto_advance &&
    game.reveal_started_at
  ) {
    const delay = game.quizzes?.auto_advance_delay_seconds ?? 5;
    const ends = new Date(game.reveal_started_at).getTime() + delay * 1000;
    return Math.max(0, Math.ceil((ends - now) / 1000));
  }

  return null;
}

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
  const [nowTick, setNowTick] = useState(Date.now());

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
    }, 1500);
    return () => clearInterval(interval);
  }, [refresh, onNotify]);

  useEffect(() => {
    const tick = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  const game = gameState?.game || initialGame;
  const questions = gameState?.questions || initialGame.questions || [];
  const currentQuestion = gameState?.currentQuestion;
  const currentResponses = gameState?.currentResponses || [];
  const presence = gameState?.presence || [];
  const totalStudents = activeStudents.length;
  const isLastQuestion = game.current_question_idx >= questions.length - 1;
  const secondsLeft = useMemo(
    () => computeSecondsLeft(game, currentQuestion),
    // nowTick fuerza el recálculo del countdown en pantalla
    [game, currentQuestion, nowTick]
  );
  const autoAdvance = Boolean(game.quizzes?.auto_advance);

  const joinedIds = useMemo(
    () => new Set(presence.map((p) => p.student_id)),
    [presence]
  );

  const pendingStudents = useMemo(
    () => activeStudents.filter((s) => !joinedIds.has(s.id)),
    [activeStudents, joinedIds]
  );

  const scoreByStudentId = useMemo(() => {
    const map = new Map();
    for (const row of ranking) {
      map.set(row.student_id, row.total_score ?? 0);
    }
    return map;
  }, [ranking]);

  const connectedScoreboard = useMemo(() => {
    const responseByStudent = new Map(
      currentResponses.map((row) => [row.student_id, row])
    );
    const answered = currentResponses.map((row, index) => ({
      student_id: row.student_id,
      student_code: row.students?.student_code || "—",
      student_name: row.students?.full_name || "—",
      total_score: scoreByStudentId.get(row.student_id) ?? 0,
      order: index + 1,
      current_status: row.is_correct ? "correct" : "incorrect",
      current_label: row.is_correct ? "Correcta" : "Incorrecta",
      responded: true,
    }));

    const waiting = presence
      .filter((row) => !responseByStudent.has(row.student_id))
      .map((row) => ({
        student_id: row.student_id,
        student_code: row.students?.student_code || "—",
        student_name: row.students?.full_name || "—",
        total_score: scoreByStudentId.get(row.student_id) ?? 0,
        order: null,
        current_status: "waiting",
        current_label: game.status === "active" ? "Sin responder" : "—",
        responded: false,
      }))
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return String(a.student_code).localeCompare(String(b.student_code), "es");
      });

    return [...answered, ...waiting];
  }, [presence, currentResponses, scoreByStudentId, game.status]);

  const liveRanking = useMemo(() => {
    if (ranking.length > 0) return ranking;
    return presence.map((row) => ({
      student_id: row.student_id,
      student_name: row.students?.full_name || "—",
      student_code: row.students?.student_code || "—",
      total_score: 0,
    }));
  }, [ranking, presence]);

  const statusLabel = useMemo(() => {
    if (game.status === "waiting") return "Esperando inicio";
    if (game.status === "finished") return "Finalizado";
    if (game.question_phase === "reveal") {
      return autoAdvance ? "Mostrando respuesta (auto)" : "Mostrando respuesta";
    }
    return currentQuestion?.time_limit_seconds
      ? "Recibiendo respuestas (con tiempo)"
      : "Recibiendo respuestas";
  }, [game.status, game.question_phase, autoAdvance, currentQuestion]);

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

  const timerLabel =
    game.question_phase === "answering"
      ? "Tiempo para responder"
      : autoAdvance
        ? "Siguiente pregunta en"
        : null;

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
              {autoAdvance ? " · Avance automático" : " · Avance manual"}
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
                {secondsLeft != null && timerLabel && (
                  <div
                    className={`quiz-game__timer ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                    aria-live="polite"
                  >
                    <IconClock size={18} />
                    <span>
                      {timerLabel}: <strong>{secondsLeft}s</strong>
                    </span>
                  </div>
                )}

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
                  Respuestas recibidas: <strong>{currentResponses.length}</strong> /{" "}
                  {presence.length} conectados
                  {currentQuestion.time_limit_seconds
                    ? ` · Límite: ${currentQuestion.time_limit_seconds}s`
                    : " · Sin límite de tiempo"}
                </div>

                {!readOnly && (
                  <div className="quiz-game__actions">
                    {game.question_phase === "answering" ? (
                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={busy}
                        onClick={handleReveal}
                      >
                        <IconCheck size={16} /> Mostrar respuesta
                      </button>
                    ) : (
                      !autoAdvance && (
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={busy}
                          onClick={handleNext}
                        >
                          <IconArrowRight size={16} />
                          {isLastQuestion ? "Finalizar juego" : "Siguiente pregunta"}
                        </button>
                      )
                    )}
                    {game.question_phase === "reveal" && autoAdvance && (
                      <p className="quiz-empty">
                        Avance automático activo
                        {secondsLeft != null ? ` · ${secondsLeft}s` : ""}…
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={busy}
                      onClick={handleFinish}
                    >
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
            {(game.status === "active" || game.status === "waiting") && presence.length > 0 && (
              <section className="quiz-game__panel quiz-game__panel--scoreboard">
                <h3>
                  {game.status === "active"
                    ? `Marcador en vivo (${presence.length} conectados)`
                    : `Conectados (${presence.length}/${totalStudents})`}
                </h3>
                <table className="attendance-table attendance-table--compact">
                  <thead>
                    <tr>
                      {game.status === "active" && <th>#</th>}
                      <th>Estudiante</th>
                      <th>Puntos</th>
                      {game.status === "active" && <th>Esta pregunta</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(game.status === "active" ? connectedScoreboard : liveRanking).map(
                      (row) => (
                        <tr key={row.student_id}>
                          {game.status === "active" && <td>{row.order ?? "—"}</td>}
                          <td>
                            <div className="quiz-game__student-cell">
                              <span className="attendance-code">{row.student_code}</span>
                              <span>{row.student_name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="quiz-game__score-badge">{row.total_score}</span>
                          </td>
                          {game.status === "active" && (
                            <td>
                              {row.current_status === "correct" && (
                                <span className="quiz-result-pill is-ok">{row.current_label}</span>
                              )}
                              {row.current_status === "incorrect" && (
                                <span className="quiz-result-pill is-bad">{row.current_label}</span>
                              )}
                              {row.current_status === "waiting" && (
                                <span className="quiz-result-pill is-pending">{row.current_label}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </section>
            )}

            {game.status === "waiting" && presence.length === 0 && (
              <section className="quiz-game__panel">
                <h3>Conectados (0/{totalStudents})</h3>
                <p className="quiz-empty">Nadie ha ingresado aún.</p>
              </section>
            )}

            {pendingStudents.length > 0 && (
              <section className="quiz-game__panel quiz-game__panel--warning quiz-game__panel--pending">
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

            {game.status === "finished" && (
              <section className="quiz-game__panel quiz-game__panel--scoreboard">
                <h3>Ranking final</h3>
                {liveRanking.length === 0 ? (
                  <p className="quiz-empty">No hay puntajes registrados.</p>
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
                      {liveRanking.map((row, index) => (
                        <tr key={row.student_id}>
                          <td>{index + 1}</td>
                          <td>{row.student_name}</td>
                          <td>
                            <span className="attendance-code">{row.student_code}</span>
                          </td>
                          <td>
                            <span className="quiz-game__score-badge">{row.total_score}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
