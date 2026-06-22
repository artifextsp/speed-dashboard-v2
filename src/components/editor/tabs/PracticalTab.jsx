import { RichEditor } from "../fields/RichEditor";
import { ListEditor } from "../fields/ListEditor";

export function PracticalTab({ form, onChange, phaseColor }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });
  const setJson = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <RichEditor
        label="Actividad práctica"
        value={form.practical_content}
        onChange={set("practical_content")}
        height={400}
        help="Paso a paso de la actividad central. Código, diagramas de conexión, secuencia de ensamblaje."
      />
      <ListEditor
        label="Checkpoints de verificación"
        items={form.practical_checkpoints || []}
        onChange={setJson("practical_checkpoints")}
        fields={[
          { key: "step", placeholder: "#", flex: 0.3 },
          {
            key: "description",
            placeholder: "Verifica que el LED enciende al cargar el sketch",
          },
        ]}
        help="Momentos donde el docente debe verificar que va bien antes de continuar."
      />

      <div
        className="interleaved-toggle"
        style={{ borderColor: `${phaseColor}22` }}
      >
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.use_interleaved_mode || false}
            onChange={(e) => set("use_interleaved_mode")(e.target.checked)}
          />
          Usar modo intercalado (concepto → práctica → concepto → práctica)
        </label>
        {form.use_interleaved_mode && (
          <div className="interleaved-blocks">
            <ListEditor
              items={form.interleaved_blocks || []}
              onChange={setJson("interleaved_blocks")}
              fields={[
                { key: "type", placeholder: "concepto | practica", flex: 1 },
                { key: "title", placeholder: "Título del bloque", flex: 2 },
                { key: "content", placeholder: "Contenido (Markdown)", flex: 4 },
              ]}
            />
          </div>
        )}
      </div>
    </>
  );
}
