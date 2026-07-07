import { useState } from "react";
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
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" },
];

export function QuizEditorModal({ quiz, onClose, onSave, onNotify }) {
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
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      onNotify?.("Debe haber al menos una pregunta", true);
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
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
      await onSave({
        title,
        description,
        questions,
      });
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
        <div className="modal__header">
          <div>
            <h2>{quiz ? "Editar cuestionario" : "Nuevo cuestionario"}</h2>
            <p className="modal__subtitle">
              Cada pregunta tiene 4 opciones. El docente controla cuándo mostrar la respuesta
              correcta durante el juego en vivo.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <form className="quiz-editor__form" onSubmit={handleSubmit}>
          <div className="quiz-editor__meta">
            <label>
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Saberes previos — Robótica"
                required
              />
            </label>
            <label>
              Descripción (opcional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve descripción del cuestionario"
              />
            </label>
          </div>

          <div className="quiz-editor__questions">
            <div className="quiz-editor__questions-head">
              <h3>Preguntas ({questions.length})</h3>
              <button type="button" className="btn btn--secondary" onClick={addQuestion}>
                <IconPlus size={16} /> Agregar pregunta
              </button>
            </div>

            {questions.map((question, index) => (
              <article key={index} className="quiz-editor__question-card">
                <div className="quiz-editor__question-head">
                  <strong>Pregunta {index + 1}</strong>
                  <div className="quiz-editor__question-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Subir"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      <IconArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Bajar"
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
                  Enunciado
                  <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion(index, "question_text", e.target.value)}
                    rows={2}
                    placeholder="Escribe la pregunta"
                    required
                  />
                </label>

                <label>
                  URL de imagen (opcional)
                  <input
                    value={question.question_image_url}
                    onChange={(e) => updateQuestion(index, "question_image_url", e.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <div className="quiz-editor__options">
                  {OPTION_LABELS.map(({ key, label }) => (
                    <label key={key}>
                      Opción {label}
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
                    Respuesta correcta
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
                  Explicación (se muestra al revelar la respuesta)
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
