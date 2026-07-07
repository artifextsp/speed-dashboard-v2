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
        <header className="quiz-editor__banner">
          <div>
            <span className="quiz-editor__eyebrow">Evaluación en vivo · SPEED</span>
            <h2>{quiz ? "Editar cuestionario" : "Nuevo cuestionario"}</h2>
            <p className="quiz-editor__intro">
              Cuatro opciones por pregunta. Durante la sesión en vivo tú decides cuándo
              revelar la respuesta correcta a los estudiantes.
            </p>
          </div>
          <button type="button" className="btn-icon btn-icon--on-dark" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </header>

        <form className="quiz-editor__form" onSubmit={handleSubmit}>
          <section className="quiz-editor__section">
            <div className="quiz-editor__section-head">
              <h3>Información general</h3>
              <p>Visible para el docente al gestionar el cuestionario.</p>
            </div>
            <div className="quiz-editor__meta-card">
              <div className="field">
                <label className="field__label" htmlFor="quiz-title">
                  Título del cuestionario
                </label>
                <input
                  id="quiz-title"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Saberes previos — Robótica"
                  required
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="quiz-description">
                  Descripción <span className="quiz-editor__optional">(opcional)</span>
                </label>
                <textarea
                  id="quiz-description"
                  className="input input--area quiz-editor__textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Breve descripción para el docente"
                />
              </div>
            </div>
          </section>

          <section className="quiz-editor__section">
            <div className="quiz-editor__questions-head">
              <div className="quiz-editor__section-head">
                <h3>
                  <IconListCheck size={18} stroke={1.8} />
                  Preguntas ({questions.length})
                </h3>
                <p>
                  La nueva pregunta aparece arriba. Usa las flechas para cambiar el orden
                  en el juego.
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
                      rows={2}
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
            <button type="button" className="btn btn--secondary" onClick={onClose}>
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
