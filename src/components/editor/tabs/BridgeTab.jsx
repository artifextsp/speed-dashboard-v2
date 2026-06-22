import { RichEditor } from "../fields/RichEditor";
import { FieldArea } from "../fields/FieldArea";
import { ListEditor } from "../fields/ListEditor";

export function BridgeTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });
  const setJson = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <RichEditor
        label="Transposición didáctica"
        value={form.bridge_content}
        onChange={set("bridge_content")}
        height={320}
        help="Reflexión guiada: ¿cómo lleva el docente esto a su aula?"
      />
      <ListEditor
        label="Escenarios por nivel"
        items={form.bridge_scenarios || []}
        onChange={setJson("bridge_scenarios")}
        fields={[
          { key: "level", placeholder: "Primaria baja, Secundaria...", flex: 1 },
          { key: "suggestion", placeholder: "Sugerencia de adaptación", flex: 3 },
        ]}
      />
      <FieldArea
        label="Mini-entregable de transposición"
        value={form.bridge_mini_deliverable}
        onChange={set("bridge_mini_deliverable")}
        rows={3}
        help="Qué debe producir el docente: un párrafo en la bitácora, un borrador de actividad, un esquema..."
      />
    </>
  );
}
