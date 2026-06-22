import { RichEditor } from "../fields/RichEditor";
import { FieldArea } from "../fields/FieldArea";

export function ClosingTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <RichEditor
        label="Resumen de cierre"
        value={form.closing_summary}
        onChange={set("closing_summary")}
        height={240}
        help="Qué se logró hoy y cómo se conecta con el arco del proyecto."
      />
      <FieldArea
        label="Preparación para la próxima sesión"
        value={form.next_session_prep}
        onChange={set("next_session_prep")}
        rows={3}
        help="Qué necesita tener listo el docente para la siguiente sesión."
      />
    </>
  );
}
