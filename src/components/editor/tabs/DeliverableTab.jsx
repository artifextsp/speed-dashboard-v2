import { RichEditor } from "../fields/RichEditor";
import { FieldInput } from "../fields/FieldInput";
import { ListEditor } from "../fields/ListEditor";

export function DeliverableTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });
  const setJson = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <RichEditor
        label="Descripción del entregable"
        value={form.deliverable_description}
        onChange={set("deliverable_description")}
        height={240}
      />
      <FieldInput
        label="Formato de entrega"
        value={form.deliverable_format}
        onChange={set("deliverable_format")}
        placeholder="Video + código fuente documentado"
      />
      <ListEditor
        label="Criterios de aceptación"
        items={form.deliverable_criteria || []}
        onChange={setJson("deliverable_criteria")}
        fields={[
          { key: "criterion", placeholder: "El código compila sin errores", flex: 3 },
          { key: "weight", placeholder: "Peso", flex: 1 },
        ]}
      />
    </>
  );
}
