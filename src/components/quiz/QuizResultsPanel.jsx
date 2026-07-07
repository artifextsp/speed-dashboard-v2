import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useQuizzes } from "../../hooks/useQuizzes";

export function QuizResultsPanel({ user, quiz, gameSession, onClose }) {
  const { loadGameResults } = useQuizzes(user);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await loadGameResults(gameSession.id);
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameSession.id, loadGameResults]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide quiz-results" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>Resultados — {quiz.title}</h2>
            <p className="modal__subtitle">
              Juego del{" "}
              {new Date(gameSession.ended_at || gameSession.created_at).toLocaleString("es-CO")}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        {loading ? (
          <p className="quiz-empty">Cargando resultados…</p>
        ) : results.length === 0 ? (
          <p className="quiz-empty">No hay respuestas registradas en este juego.</p>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Código</th>
                <th>Puntos</th>
                <th>Respuestas correctas</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={row.student_id}>
                  <td>{index + 1}</td>
                  <td>{row.student_name}</td>
                  <td>
                    <span className="attendance-code">{row.student_code}</span>
                  </td>
                  <td>
                    <strong>{row.total_score}</strong>
                  </td>
                  <td>
                    {row.responses.filter((r) => r.is_correct).length} / {row.responses.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
