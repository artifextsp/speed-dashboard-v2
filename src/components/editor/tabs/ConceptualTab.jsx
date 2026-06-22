import { RichEditor } from "../fields/RichEditor";
import { ListEditor } from "../fields/ListEditor";

export function ConceptualTab({ form, onChange }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });
  const setJson = (key) => (val) => onChange({ ...form, [key]: val });

  return (
    <>
      <RichEditor
        label="Contenido conceptual"
        value={form.conceptual_content}
        onChange={set("conceptual_content")}
        height={400}
        help="Editor con barra de herramientas: negritas, listas, links, imágenes, videos y alineación."
      />
      <ListEditor
        label="Referencias y recursos externos"
        items={form.conceptual_references || []}
        onChange={setJson("conceptual_references")}
        fields={[
          { key: "title", placeholder: "Título del recurso", flex: 2 },
          { key: "url", placeholder: "URL", flex: 2 },
          { key: "description", placeholder: "Descripción breve", flex: 2 },
        ]}
      />
    </>
  );
}
