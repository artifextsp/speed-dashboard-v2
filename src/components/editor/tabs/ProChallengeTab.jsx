import { RichEditor } from "../fields/RichEditor";

export function ProChallengeTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={form.has_pro_challenge || false}
          onChange={(e) => set("has_pro_challenge")(e.target.checked)}
        />
        Esta sesión tiene Reto PRO
      </label>
      {form.has_pro_challenge && (
        <RichEditor
          label="Contenido del Reto PRO"
          value={form.pro_challenge_content}
          onChange={set("pro_challenge_content")}
          height={320}
          help="Extensión para docentes avanzados. PID, sensores adicionales, optimizaciones..."
        />
      )}
    </>
  );
}
