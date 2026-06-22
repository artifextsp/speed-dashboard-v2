import { ListEditor } from "../fields/ListEditor";
import { PhysicalResourceEditor } from "../fields/PhysicalResourceEditor";

export function ChecklistTab({ form, onChange }) {
  const setJson = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <ListEditor
        label="Recursos digitales necesarios"
        items={form.checklist_digital || []}
        onChange={setJson("checklist_digital")}
        fields={[
          { key: "item", placeholder: "Instalar Arduino IDE", flex: 3 },
          { key: "url", placeholder: "URL (opcional)", flex: 2 },
        ]}
      />
      <PhysicalResourceEditor
        label="Recursos físicos necesarios"
        items={form.checklist_physical || []}
        onChange={setJson("checklist_physical")}
        help="Agrega imagen y descripción para que el docente identifique cada componente."
      />
      <ListEditor
        label="Preparación previa"
        items={form.checklist_prior || []}
        onChange={setJson("checklist_prior")}
        fields={[
          { key: "item", placeholder: "Ver video introductorio", flex: 3 },
          { key: "url", placeholder: "URL", flex: 2 },
        ]}
        help="Material que el docente debe revisar antes de la sesión."
      />
    </>
  );
}
