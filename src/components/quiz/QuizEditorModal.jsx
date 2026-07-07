import { useRef, useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
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
};

const OPTION_LABELS = [
  { key: "a", label: "A", color: "quiz-editor__option-tag--a" },
  { key: "b", label: "B", color: "quiz-editor__option-tag--b" },
  { key: "c", label: "C", color: "quiz-editor__option-tag--c" },
  { key: "d", label: "D", color: "quiz-editor__option-tag--d" },
];

export function QuizEditorModal({ quiz, onClose, onSave, onNotify }) {
  const questionsRef = useRef(null);
  const [title, setTitle] = useState(quiz?.title || "");
  const [description, setDescription] = useState(quiz?.description || "");
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
        }))
      : [{ ...EMPTY_QUESTION }]
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const addQuestion = () => {
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
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setFocusedIndex((current) => Math.max(0, Math.min(current, questions.length - 2)));
  };

  const moveQuestion = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
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
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ title, description, questions });
      onClose();
    } catch (err) {
      onNotify?.(err.message || "Error al guardar cuestionario", true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide quiz-editor" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-editor__banner">
          <div>
            <span className="quiz-editor__eyebrow">Diseño de evaluación</span>
            <h2>{quiz ? "Editar cuestionario" : "Nuevo cuestionario"}</h2>
            <p className="quiz-editor__intro">
              Cada pregunta tiene 4 opciones. El docente controla cuándo revelar la respuesta
              correcta durante la sesión en vivo.
            </p>
          </div>
          <button type="button" className="btn-icon btn-icon--on-dark" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <form className="quiz-editor__form" onSubmit={handleSubmit}>
          <section className="quiz-editor__meta-card">
            <label>
              <span>Título del cuestionario</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Saberes previos — Robótica"
                required
              />
            </label>
            <label>
              <span>Descripción (opcional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve descripción para el docente"
              />
            </label>
          </section>

          <div className="quiz-editor__questions">
            <div className="quiz-editor__questions-head">
              <div>
                <h3>Preguntas</h3>
                <p className="quiz-editor__hint">
                  La nueva pregunta aparece arriba para editarla de inmediato. Usa las flechas para
                  cambiar el orden en el juego.
                </p>
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
                        className="btn-icon"
                        title="Subir en el orden"
                        disabled={index === 0}
                        onClick={() => moveQuestion(index, -1)}
                      >
                        <IconArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
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

                  <label>
                    <span>Enunciado</span>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, "question_text", e.target.value)}
                      rows={2}
                      placeholder="Escribe la pregunta"
                      required
                    />
                  </label>

                  <label>
                    <span>URL de imagen (opcional)</span>
                    <input
                      value={question.question_image_url}
                      onChange={(e) => updateQuestion(index, "question_image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </label>

                  <div className="quiz-editor__options">
                    {OPTION_LABELS.map(({ key, label, color }) => (
                      <label key={key} className="quiz-editor__option-field">
                        <span className={`quiz-editor__option-tag ${color}`}>{label}</span>
                        <input
                          value={question[`option_${key}`]}
                          onChange={(e) => updateQuestion(index, `option_${key}`, e.target.value)}
                          placeholder={`Texto opción ${label}`}
                          required
                        />
                      </label>
                    ))}
                  </div>

                  <div className="quiz-editor__answer-row">
                    <label>
                      <span>Respuesta correcta</span>
                      <select
                        value={question.correct_option}
                        onChange={(e) => updateQuestion(index, "correct_option", e.target.value)}
                      >
                        {OPTION_LABELS.map(({ key, label }) => (
                          <option key={key} value={key}>
                            Opción {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>Explicación (se muestra al revelar)</span>
                    <textarea
                      value={question.explanation_text}
                      onChange={(e) => updateQuestion(index, "explanation_text", e.target.value)}
                      rows={2}
                      placeholder="Por qué esta es la respuesta correcta"
                    />
                  </label>
                </article>
              ))}
            </div>
          </div>

          <div className="quiz-editor__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando…" : quiz ? "Guardar cambios" : "Crear cuestionario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
