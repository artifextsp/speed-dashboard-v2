import { useState, useMemo } from "react";
import { IconArrowLeft, IconPencil, IconEye } from "@tabler/icons-react";
import { PHASE_COLORS, MODALITY_LABELS, formatRelativeTime } from "../../utils/constants";
import { resolveClassComponents } from "../../kernel/legacyMigration";
import { FieldInput } from "./fields/FieldInput";
import { FieldArea } from "./fields/FieldArea";
import { ComponentsEditor } from "./fields/ComponentsEditor";
import { ClassStatusControl } from "./fields/ClassStatusControl";
import { SessionPreview } from "../preview/SessionPreview";
import { DownloadPdfButton } from "../export/DownloadPdfButton";

export function SessionEditor({
  session,
  phase,
  videos: initialVideos,
  onSave,
  onBack,
  saving,
  readOnly = false,
}) {
  const [form, setForm] = useState({ ...session });
  const [components, setComponents] = useState(
    () => session.class_components || []
  );
  const [showPreview, setShowPreview] = useState(false);

  const color = PHASE_COLORS[phase?.code] || "#888";

  const previewForm = useMemo(
    () => ({ ...form, class_components: components }),
    [form, components]
  );

  const set = (key) => (val) => setForm({ ...form, [key]: val });
  const handleSave = () => onSave({ ...form, class_components: components });

  if (showPreview) {
    return (
      <SessionPreview
        form={previewForm}
        phase={phase}
        videos={initialVideos}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="editor editor--dynamic">
      <div className="editor__toolbar">
        <button className="btn-back" onClick={onBack}>
          <IconArrowLeft size={16} /> Volver
        </button>
        <div className="editor__toolbar-right">
          <DownloadPdfButton
            session={previewForm}
            phase={phase}
            videos={initialVideos}
          />
          <button
            className="btn btn--secondary"
            onClick={() => setShowPreview(true)}
          >
            <IconEye size={15} /> Vista previa
          </button>
          {readOnly && (
            <span className="role-badge role-badge--supervisor">
              <IconEye size={11} /> Solo lectura
            </span>
          )}
        </div>
      </div>

      <h2 className="editor__title" style={{ color }}>
        {form.session_number ? `Sesión ${form.session_number}: ` : ""}
        {form.title}
      </h2>
      <p className="editor__meta">
        Fase {phase?.code} · {phase?.title} · {MODALITY_LABELS[form.modality]} ·{" "}
        {form.scheduled_date}
      </p>
      {session.last_edited_by && (
        <p className="editor__last-edit">
          <IconPencil size={12} />
          Última edición por <strong>{session.last_edited_by}</strong>
          {session.last_edited_at && ` · ${formatRelativeTime(session.last_edited_at)}`}
        </p>
      )}

      <div className="editor__content editor__content--single">
        <section className="class-meta-card">
          <h3 className="class-meta-card__title">Datos de la clase</h3>
          <ClassStatusControl
            status={form.status}
            onChange={(status) => setForm({ ...form, status })}
            readOnly={readOnly}
          />
          <div className="class-meta-card__grid">
            <FieldInput
              label="Título"
              value={form.title}
              onChange={set("title")}
              disabled={readOnly}
            />
            <FieldInput
              label="Fecha programada"
              value={form.scheduled_date}
              onChange={set("scheduled_date")}
              disabled={readOnly}
            />
            <FieldInput
              label="Duración estimada"
              value={form.duration_estimate}
              onChange={set("duration_estimate")}
              placeholder="2 horas"
              disabled={readOnly}
            />
          </div>
          <FieldArea
            label="Lo que vas a lograr hoy"
            value={form.learning_goal}
            onChange={set("learning_goal")}
            rows={2}
            help="Objetivo de aprendizaje en lenguaje directo."
            disabled={readOnly}
          />
        </section>

        <ComponentsEditor
          components={components}
          onChange={setComponents}
          phaseColor={color}
          readOnly={readOnly}
        />
      </div>

      <div className="editor__actions">
        <button className="btn btn--secondary" onClick={onBack}>
          {readOnly ? "Cerrar" : "Cancelar"}
        </button>
        {!readOnly && (
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving}
            style={{ background: color }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        )}
      </div>
    </div>
  );
}
