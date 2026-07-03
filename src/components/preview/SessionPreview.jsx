import { useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import {
  IconArrowLeft,
  IconTargetArrow,
  IconChevronDown,
  IconChevronRight,
  IconLayersLinked,
} from "@tabler/icons-react";
import { getPhaseColor, MODALITY_LABELS } from "../../utils/constants";
import { resolveClassComponents } from "../../kernel/legacyMigration";
import { withDisplayNumbers } from "../../kernel/componentManager";
import { getStatusConfig } from "../../kernel/statusManager";
import { DownloadPdfButton } from "../export/DownloadPdfButton";
import { SiteBrandHeader } from "../ui/InstitutionLogos";

function AccordionSection({ number, title, description, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!children) return null;

  return (
    <div className={`pv-card ${open ? "pv-card--open" : ""}`}>
      <button className="pv-card__header" onClick={() => setOpen(!open)}>
        <span className="pv-card__number" style={{ background: color }}>{number}</span>
        <div className="pv-card__header-text">
          <h2 className="pv-card__title">
            <IconLayersLinked size={20} style={{ color }} /> {title}
          </h2>
          {description && <p className="pv-card__desc">{description}</p>}
        </div>
        <span className="pv-card__chevron">
          {open ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
        </span>
      </button>
      {open && <div className="pv-card__body">{children}</div>}
    </div>
  );
}

export function SessionPreview({ form, phase, videos = [], onBack }) {
  const phaseColor = getPhaseColor(phase);
  const statusCfg = getStatusConfig(form.status);
  const theme = statusCfg.preview || {
    bg: statusCfg.bg,
    title: "#1e293b",
    muted: statusCfg.color,
    accent: statusCfg.border,
  };
  const components = withDisplayNumbers(resolveClassComponents(form));

  return (
    <div className="pv-wrapper">
      <div className="pv-container">
        <SiteBrandHeader />
        <div className="pv-toolbar">
          <button className="btn-back" onClick={onBack}>
            <IconArrowLeft size={16} /> Volver al editor
          </button>
          <div className="pv-toolbar__actions">
            <DownloadPdfButton session={form} phase={phase} videos={videos} />
            <span className="pv-badge">Vista previa</span>
          </div>
        </div>

        <div
          className="pv-hero pv-hero--by-status"
          data-status={form.status}
          style={{
            background: theme.bg,
            borderColor: statusCfg.border,
          }}
        >
          <div
            className="pv-hero__phase"
            style={{ background: theme.accent, color: "#fff" }}
          >
            {phase?.code}
          </div>
          <div className="pv-hero__content">
            <p className="pv-hero__phase-name" style={{ color: theme.accent }}>
              Fase {phase?.code} — {phase?.title}
            </p>
            <h1 className="pv-hero__title" style={{ color: theme.title }}>
              {form.session_number ? `Sesión ${form.session_number}: ` : ""}
              {form.title}
            </h1>
            <div className="pv-hero__meta" style={{ color: theme.muted }}>
              <span>{MODALITY_LABELS[form.modality]}</span>
              {form.scheduled_date && <><span>·</span><span>{form.scheduled_date}</span></>}
              {form.duration_estimate && <><span>·</span><span>{form.duration_estimate}</span></>}
            </div>
            <div className="pv-hero__status">
              <span
                className="pv-hero__status-pill"
                style={{
                  color: statusCfg.color,
                  borderColor: statusCfg.border,
                  background: "rgba(255, 255, 255, 0.88)",
                }}
              >
                <span
                  className="pv-hero__status-dot"
                  style={{ background: statusCfg.color }}
                />
                {statusCfg.label}
              </span>
            </div>
          </div>
        </div>

        {form.learning_goal && (
          <div className="pv-goal" style={{ borderLeftColor: phaseColor }}>
            <IconTargetArrow size={20} style={{ color: phaseColor, flexShrink: 0 }} />
            <div>
              <strong>Lo que vas a lograr hoy</strong>
              <p>{form.learning_goal}</p>
            </div>
          </div>
        )}

        <div className="pv-sections">
          {components.length === 0 ? (
            <p className="pv-empty">Esta clase aún no tiene componentes definidos.</p>
          ) : (
            components.map((comp) => (
              <AccordionSection
                key={comp.id}
                number={comp.displayNumber}
                title={comp.name || `Componente ${comp.displayNumber}`}
                description={comp.description}
                color={phaseColor}
                defaultOpen={false}
              >
                <div className="pv-markdown">
                  <MarkdownContent>{comp.content}</MarkdownContent>
                </div>
              </AccordionSection>
            ))
          )}
        </div>

        <div className="pv-footer">
          Proyecto SPEED · {phase?.title} · Uniminuto 2026
        </div>
      </div>
    </div>
  );
}
