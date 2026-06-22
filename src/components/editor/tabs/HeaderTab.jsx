import { FieldInput } from "../fields/FieldInput";
import { FieldArea } from "../fields/FieldArea";

export function HeaderTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <FieldInput label="Título" value={form.title} onChange={set("title")} />
      <FieldInput
        label="Fecha programada"
        value={form.scheduled_date}
        onChange={set("scheduled_date")}
      />
      <FieldInput
        label="Duración estimada"
        value={form.duration_estimate}
        onChange={set("duration_estimate")}
        placeholder="2 horas"
      />
      <FieldArea
        label="Lo que vas a lograr hoy"
        value={form.learning_goal}
        onChange={set("learning_goal")}
        rows={2}
        help="Objetivo de aprendizaje en lenguaje directo."
      />
    </>
  );
}
