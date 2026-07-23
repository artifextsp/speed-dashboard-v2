import { useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconListCheck,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

const EMPTY_QUESTION = {
  question_text: "",
  question_image_url: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "a",
  explanation_text: "",
  time_limit_seconds: "30",
};

const OPTION_LABELS = [
  { key: "a", label: "A", rowClass: "quiz-editor__option-row--a" },
  { key: "b", label: "B", rowClass: "quiz-editor__option-row--b" },
  { key: "c", label: "C", rowClass: "quiz-editor__option-row--c" },
  { key: "d", label: "D", rowClass: "quiz-editor__option-row--d" },
];

export function QuizEditorModal({ quiz, onClose, onSave, onNotify }) {
  const questionsRef = useRef(null);
  const [title, setTitle] = useState(quiz?.title || "");
  const [description, setDescription] = useState(quiz?.description || "");
  const [autoAdvance, setAutoAdvance] = useState(Boolean(quiz?.auto_advance));
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(
    String(quiz?.auto_advance_delay_seconds ?? 5)
  );
  const [questions, setQuestions] = useState(
    quiz?.questions?.length
      ? quiz.questions.map((q) => ({
          question_text: q.question_text || "",
          question_image_url: q.question_image_url || "",
          option_a: q.option_a || "",
          option_b: q.option_b || "",
          option_c: q.option_c || "",
          option_d: q.option_d || "",
          correct_option: q.correct_option || "a",
          explanation_text: q.explanation_text || "",
          time_limit_seconds:
            q.time_limit_seconds == null ? "" : String(q.time_limit_seconds),
        }))
      : [{ ...EMPTY_QUESTION }]
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const updateQuestion = (index, field, value) => {
    markDirty();
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const addQuestion = () => {
    markDirty();
    setQuestions((prev) => [{ ...EMPTY_QUESTION }, ...prev]);
    setFocusedIndex(0);
    requestAnimationFrame(() => {
      questionsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      onNotify?.("Debe haber al menos una pregunta", true);
      return;
    }
    markDirty();
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setFocusedIndex((current) => Math.max(0, Math.min(current, questions.length - 2)));
  };

  const moveQuestion = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    markDirty();
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    setFocusedIndex(next);
  };

  const validate = () => {
    if (!title.trim()) {
      onNotify?.("El título del cuestionario es obligatorio", true);
      return false;
    }
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        onNotify?.(`La pregunta ${i + 1} necesita un enunciado`, true);
        return false;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        onNotify?.(`La pregunta ${i + 1} debe tener las 4 opciones`, true);
        return false;
      }
      if (q.time_limit_seconds !== "" && q.time_limit_seconds != null) {
        const secs = Number(q.time_limit_seconds);
        if (!Number.isFinite(secs) || secs < 5 || secs > 600) {
          onNotify?.(
            `La pregunta ${i + 1}: el tiempo debe estar entre 5 y 600 segundos (o vacío = sin límite)`,
            true
          );
          return false;
        }
      }
    }
    if (autoAdvance) {
      const delay = Number(autoAdvanceDelay);
      if (!Number.isFinite(delay) || delay < 2 || delay > 60) {
        onNotify?.("El retraso de avance automático debe estar entre 2 y 60 segundos", true);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        title,
        description,
        questions,
        auto_advance: autoAdvance,
        auto_advance_delay_seconds: Number(autoAdvanceDelay) || 5,
      });
      onClose();
    } catch (err) {
      onNotify?.(err.message || "Error al guardar cuestionario", true);
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (
      dirty &&
      !window.confirm(
        "¿Cerrar sin guardar? Se perderán los cambios no guardados del cuestionario."
      )
    ) {
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay modal-overlay--locked" role="presentation">
      <div
        className="modal modal--wide quiz-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-editor-title"
      >
        <header className="quiz-editor__banner quiz-editor__banner--compact">
          <div className="quiz-editor__banner-text">
            <span className="quiz-editor__eyebrow">Evaluación en vivo · SPEED</span>
            <h2 id="quiz-editor-title">{quiz ? "Editar cuestionario" : "Nuevo cuestionario"}</h2>
          </div>
          <button
            type="button"
            className="btn-icon btn-icon--on-dark"
            onClick={requestClose}
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </header>

        <form className="quiz-editor__form" onSubmit={handleSubmit}>
          <section className="quiz-editor__meta-bar" aria-label="Configuración del cuestionario">
            <div className="field quiz-editor__meta-title">
              <label className="field__label" htmlFor="quiz-title">
                Título
              </label>
              <input
                id="quiz-title"
                className="input"
                value={title}
                onChange={(e) => {
                  markDirty();
                  setTitle(e.target.value);
                }}
                placeholder="Ej. Saberes previos — Robótica"
                required
              />
            </div>
            <div className="field quiz-editor__meta-desc">
              <label className="field__label" htmlFor="quiz-description">
                Descripción <span className="quiz-editor__optional">(opcional)</span>
              </label>
              <input
                id="quiz-description"
                className="input"
                value={description}
                onChange={(e) => {
                  markDirty();
                  setDescription(e.target.value);
                }}
                placeholder="Breve nota para el docente"
              />
            </div>
            <div className="field quiz-editor__meta-advance">
              <label className="field__label" htmlFor="quiz-auto-advance">
                Paso entre preguntas
              </label>
              <select
                id="quiz-auto-advance"
                className="input quiz-editor__select"
                value={autoAdvance ? "auto" : "manual"}
                onChange={(e) => {
                  markDirty();
                  setAutoAdvance(e.target.value === "auto");
                }}
                title="Manual: avanza con clic. Automático: pasa solo tras revelar."
              >
                <option value="manual">Manual (clic)</option>
                <option value="auto">Automático</option>
              </select>
            </div>
            <div className="field quiz-editor__meta-delay">
              <label className="field__label" htmlFor="quiz-auto-delay">
                Seg. tras revelar
              </label>
              <input
                id="quiz-auto-delay"
                className="input"
                type="number"
                min={2}
                max={60}
                value={autoAdvanceDelay}
                disabled={!autoAdvance}
                onChange={(e) => {
                  markDirty();
                  setAutoAdvanceDelay(e.target.value);
                }}
                title="Segundos de espera antes de pasar a la siguiente pregunta (solo en modo automático)"
              />
            </div>
          </section>

          <section className="quiz-editor__section quiz-editor__section--questions">
            <div className="quiz-editor__questions-head">
              <div className="quiz-editor__section-head">
                <h3>
                  <IconListCheck size={18} stroke={1.8} />
                  Preguntas ({questions.length})
                </h3>
              </div>
              <button type="button" className="btn btn--primary" onClick={addQuestion}>
                <IconPlus size={16} /> Agregar pregunta
              </button>
            </div>

            <div className="quiz-editor__questions-scroll" ref={questionsRef}>
              {questions.map((question, index) => (
                <article
                  key={index}
                  className={`quiz-editor__question-card ${
                    focusedIndex === index ? "is-focused" : ""
                  }`}
                  onFocus={() => setFocusedIndex(index)}
                >
                  <div className="quiz-editor__question-head">
                    <div className="quiz-editor__question-badge">Pregunta {index + 1}</div>
                    <div className="quiz-editor__question-actions">
                      <button
                        type="button"
                        className="btn-icon quiz-editor__move-btn"
                        title="Subir en el orden"
                        disabled={index === 0}
                        onClick={() => moveQuestion(index, -1)}
                      >
                        <IconArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon quiz-editor__move-btn"
                        title="Bajar en el orden"
                        disabled={index === questions.length - 1}
                        onClick={() => moveQuestion(index, 1)}
                      >
                        <IconArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon--danger"
                        title="Eliminar pregunta"
                        onClick={() => removeQuestion(index)}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field__label">Enunciado</label>
                    <textarea
                      className="input input--area quiz-editor__textarea"
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, "question_text", e.target.value)}
                      rows={3}
                      placeholder="Escribe la pregunta"
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field__label">
                      URL de imagen <span className="quiz-editor__optional">(opcional)</span>
                    </label>
                    <input
                      className="input"
                      value={question.question_image_url}
                      onChange={(e) => updateQuestion(index, "question_image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="field">
                    <label className="field__label">
                      Tiempo límite (segundos){" "}
                      <span className="quiz-editor__optional">(vacío = sin límite)</span>
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={5}
                      max={600}
                      value={question.time_limit_seconds}
                      onChange={(e) => updateQuestion(index, "time_limit_seconds", e.target.value)}
                      placeholder="Ej. 30"
                    />
                  </div>

                  <div className="quiz-editor__options-block">
                    <p className="field__label">Opciones de respuesta</p>
                    <div className="quiz-editor__options">
                      {OPTION_LABELS.map(({ key, label, rowClass }) => (
                        <div key={key} className={`quiz-editor__option-row ${rowClass}`}>
                          <span className="quiz-editor__option-tag">{label}</span>
                          <input
                            className="input quiz-editor__option-input"
                            value={question[`option_${key}`]}
                            onChange={(e) => updateQuestion(index, `option_${key}`, e.target.value)}
                            placeholder={`Texto opción ${label}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="quiz-editor__answer-grid">
                    <div className="field">
                      <label className="field__label">Respuesta correcta</label>
                      <select
                        className="input quiz-editor__select"
                        value={question.correct_option}
                        onChange={(e) => updateQuestion(index, "correct_option", e.target.value)}
                      >
                        {OPTION_LABELS.map(({ key, label }) => (
                          <option key={key} value={key}>
                            Opción {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field quiz-editor__explanation-field">
                      <label className="field__label">
                        Explicación <span className="quiz-editor__optional">(al revelar)</span>
                      </label>
                      <textarea
                        className="input input--area quiz-editor__textarea"
                        value={question.explanation_text}
                        onChange={(e) => updateQuestion(index, "explanation_text", e.target.value)}
                        rows={2}
                        placeholder="Por qué esta es la respuesta correcta"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="quiz-editor__footer">
            <button type="button" className="btn btn--secondary" onClick={requestClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando…" : quiz ? "Guardar cambios" : "Crear cuestionario"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
