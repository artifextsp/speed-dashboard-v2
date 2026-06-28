import siteCss from "../../public/site-template/site.css?raw";
import siteJs from "../../public/site-template/site.js?raw";
import { getPhaseColor, MODALITY_LABELS } from "./constants";
import { resolveClassComponents } from "../kernel/legacyMigration";
import { withDisplayNumbers } from "../kernel/componentManager";
import {
  getStatusConfig,
  canStudentAccessSession,
} from "../kernel/statusManager";
import { sortSessionsByDate } from "../kernel/sortByDate";
import { slugifyFilename } from "../kernel/markdownToPdfBlocks";
import { markdownToHtml } from "./markdownToHtml";
import { generateSessionPdfBase64 } from "./sessionPdfExporter.jsx";
import { loadSiteAssetFiles, SITE_LOGO_PATHS } from "./siteAssets.js";

const SITE_BUILD_VERSION = "2026-06-26-markdown-headings-v1";

export { SITE_BUILD_VERSION };

const PDF_ICON_SVG = `<svg class="site-pdf-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function renderPdfIconButton(href, downloadName, extraClass = "") {
  return `<a class="site-pdf-icon-btn ${extraClass}" href="${href}" download="${escapeHtml(downloadName)}" title="Descargar plan de clase (PDF)" aria-label="Descargar plan de clase en PDF">${PDF_ICON_SVG}</a>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sessionPagePath(sessionId) {
  return `sesiones/${sessionId}.html`;
}

function sessionPdfPath(sessionId) {
  return `sesiones/${sessionId}.pdf`;
}

function sessionPdfDownloadName(session) {
  const prefix = session.session_number
    ? `sesion-${session.session_number}`
    : "clase";
  return `${prefix}-${slugifyFilename(session.title)}.pdf`;
}

function renderConventionsCard(allSessions) {
  const accessible = allSessions.filter((s) => canStudentAccessSession(s.status)).length;
  const items = [
    {
      status: "borrador",
      desc: "Visible en el temario, pero el contenido aún no está disponible.",
    },
    {
      status: "en_revision",
      desc: "Clase activa: puedes entrar, ver recursos y descargar el PDF.",
    },
    {
      status: "publicado",
      desc: "Clase dictada: acceso completo al material y al PDF.",
    },
  ];

  const cards = items
    .map(({ status, desc }) => {
      const pill = renderStatusPill(status);
      return `<div class="site-convention-card">
        <div class="site-convention-card__pill">${pill}</div>
        <p class="site-convention-card__desc">${escapeHtml(desc)}</p>
      </div>`;
    })
    .join("");

  return `<section class="site-conventions" aria-label="Convenciones de estado">
    <h2 class="site-conventions__title">Estado de las clases</h2>
    <div class="site-conventions__grid">${cards}</div>
    <p class="site-conventions__footer">
      <strong>${accessible}</strong> de <strong>${allSessions.length}</strong> clases con acceso abierto.
      El icono <span class="site-header__pdf-hint-icon" aria-hidden="true">↓</span> permite descargar el plan en PDF.
    </p>
  </section>`;
}

function renderSiteHeader() {
  return `<header class="site-header">
    <div class="site-header__bar">
      <div class="site-header__titles">
        <div class="site-header__brand">SPEED</div>
        <p class="site-header__tagline">Robótica educativa para docentes usando metodologías ABP.</p>
      </div>
      <div class="site-header__logos">
        <img src="${SITE_LOGO_PATHS.uniminuto}" alt="Corporación Universitaria Uniminuto" class="site-header__logo site-header__logo--uniminuto" />
        <img src="${SITE_LOGO_PATHS.bogota}" alt="Secretaría de Educación de Bogotá" class="site-header__logo site-header__logo--bogota" />
      </div>
    </div>
  </header>`;
}

function renderStatusPill(status) {
  const cfg = getStatusConfig(status);
  return `<span class="site-status-pill" style="color:${cfg.color};border-color:${cfg.border};background:${cfg.bg}">
    <span class="site-status-pill__dot" style="background:${cfg.color}"></span>
    ${escapeHtml(cfg.label)}
  </span>`;
}

function renderComponentsHtml(session, phaseColor) {
  const components = withDisplayNumbers(resolveClassComponents(session));
  if (components.length === 0) {
    return '<p class="pv-empty">Esta clase aún no tiene componentes disponibles.</p>';
  }

  return components
    .map((comp) => {
      const title = escapeHtml(comp.name || `Componente ${comp.displayNumber}`);
      const desc = comp.description
        ? `<p class="pv-card__desc">${escapeHtml(comp.description)}</p>`
        : "";
      const content = markdownToHtml(comp.content);

      return `<details class="pv-card">
        <summary>
          <span class="pv-card__number" style="background:${phaseColor}">${comp.displayNumber}</span>
          <div class="pv-card__header-text">
            <div class="pv-card__title">${title}</div>
            ${desc}
          </div>
        </summary>
        <div class="pv-card__body">
          <div class="pv-markdown">${content}</div>
        </div>
      </details>`;
    })
    .join("\n");
}

function renderSessionPage(session, phase) {
  const phaseColor = getPhaseColor(phase);
  const statusCfg = getStatusConfig(session.status);
  const theme = statusCfg.preview || {
    bg: statusCfg.bg,
    title: "#1e293b",
    muted: statusCfg.color,
    accent: statusCfg.border,
  };
  const titlePrefix = session.session_number
    ? `Sesión ${session.session_number}: `
    : "";
  const metaParts = [
    MODALITY_LABELS[session.modality],
    session.scheduled_date,
    session.duration_estimate,
  ].filter(Boolean);

  const goalBlock = session.learning_goal
    ? `<div class="pv-goal" style="border-left-color:${phaseColor}">
        <div>
          <strong>Lo que vas a lograr hoy</strong>
          <p>${escapeHtml(session.learning_goal)}</p>
        </div>
      </div>`
    : "";

  const pdfName = sessionPdfDownloadName(session);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(titlePrefix + session.title)} · SPEED</title>
  <link rel="stylesheet" href="../site.css" />
  <!-- SPEED build: ${SITE_BUILD_VERSION} -->
</head>
<body>
  <div class="pv-wrapper">
    <div class="pv-container">
      <nav class="site-nav site-nav--bar">
        <a href="../index.html" class="site-nav__back">← Volver al índice del curso</a>
        ${renderPdfIconButton(`${session.id}.pdf`, pdfName, "site-pdf-icon-btn--nav")}
      </nav>

      <div class="pv-hero pv-hero--by-status" data-status="${session.status}"
        style="background:${theme.bg};border-color:${statusCfg.border};border-left-color:${statusCfg.border}">
        <div class="pv-hero__phase" style="background:${theme.accent};color:#fff">${escapeHtml(phase?.code)}</div>
        <div class="pv-hero__content">
          <p class="pv-hero__phase-name" style="color:${theme.accent}">
            Fase ${escapeHtml(phase?.code)} — ${escapeHtml(phase?.title)}
          </p>
          <h1 class="pv-hero__title" style="color:${theme.title}">
            ${escapeHtml(titlePrefix + session.title)}
          </h1>
          <div class="pv-hero__meta" style="color:${theme.muted}">
            ${metaParts.map((p) => `<span>${escapeHtml(p)}</span>`).join("<span>·</span>")}
          </div>
          <div class="pv-hero__status">
            <span class="pv-hero__status-pill"
              style="color:${statusCfg.color};border-color:${statusCfg.border};background:rgba(255,255,255,0.88)">
              <span class="pv-hero__status-dot" style="background:${statusCfg.color}"></span>
              ${escapeHtml(statusCfg.label)}
            </span>
          </div>
        </div>
      </div>

      ${goalBlock}

      <div class="pv-sections">
        ${renderComponentsHtml(session, phaseColor)}
      </div>

      <div class="pv-footer">
        Proyecto SPEED · ${escapeHtml(phase?.title)} · Uniminuto 2026
      </div>
    </div>
  </div>
  <script src="../site.js"></script>
</body>
</html>`;
}

function renderIndexSessionItem(session) {
  const statusCfg = getStatusConfig(session.status);
  const label = session.session_number
    ? `Sesión ${session.session_number}: ${session.title}`
    : session.title;
  const meta = `${MODALITY_LABELS[session.modality] || ""}${session.scheduled_date ? ` · ${session.scheduled_date}` : ""}`;
  const pill = renderStatusPill(session.status);

  if (canStudentAccessSession(session.status)) {
    const pdfName = sessionPdfDownloadName(session);
    return `<li>
      <div class="site-session-card-wrap" style="border-left-color:${statusCfg.border}">
        <div class="site-session-card__main">
          <a class="site-session-card__link" href="${sessionPagePath(session.id)}">
            <strong class="site-session-card__title">${escapeHtml(label)}</strong>
            <div class="site-session-card__meta-row">
              <span class="site-session-list__meta">${escapeHtml(meta)}</span>
              ${pill}
            </div>
          </a>
          <div class="site-session-card__pdf-slot">
            ${renderPdfIconButton(sessionPdfPath(session.id), pdfName, "site-pdf-icon-btn--nav")}
          </div>
        </div>
      </div>
    </li>`;
  }

  return `<li>
    <div class="site-session-card site-session-card--locked"
         style="border-left-color:${statusCfg.border};background:linear-gradient(90deg, ${statusCfg.bg}55 0%, var(--color-background-primary) 50%)">
      <div class="site-session-card__head">
        <strong>${escapeHtml(label)}</strong>
        ${pill}
      </div>
      <div class="site-session-list__meta">${escapeHtml(meta)}</div>
      <p class="site-session-card__lock-msg">Planeada — el contenido estará disponible cuando la clase pase a En desarrollo.</p>
    </div>
  </li>`;
}

function renderIndexPage(phases, allSessions) {
  const sortedPhases = [...phases].sort(
    (a, b) => (a.sort_order ?? a.phase_number) - (b.sort_order ?? b.phase_number)
  );

  const phaseSections = sortedPhases
    .map((phase) => {
      const phaseSessions = sortSessionsByDate(
        allSessions.filter((s) => s.phase_id === phase.id)
      );
      if (phaseSessions.length === 0) return "";

      const color = getPhaseColor(phase);
      const items = phaseSessions.map(renderIndexSessionItem).join("");

      return `<section class="site-phase">
        <h2 class="site-phase__title" style="color:${color};border-color:${color}">
          Fase ${escapeHtml(phase.code)} — ${escapeHtml(phase.title)}
        </h2>
        <ul class="site-session-list">${items}</ul>
      </section>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SPEED · Guía del curso</title>
  <link rel="stylesheet" href="site.css" />
  <!-- SPEED build: ${SITE_BUILD_VERSION} -->
</head>
<body>
  <div class="pv-wrapper">
    <div class="pv-container">
      ${renderSiteHeader()}
      ${renderConventionsCard(allSessions)}
      ${phaseSections}
      <div class="pv-footer">Proyecto SPEED · Uniminuto 2026</div>
    </div>
  </div>
  <script src="site.js"></script>
</body>
</html>`;
}

/**
 * Genera el sitio público estático.
 * - Índice: TODAS las sesiones con su estado (3 colores).
 * - Páginas de detalle + PDF: solo En desarrollo y Dictada (acceso estudiante).
 */
export async function generateSiteFiles(phases, sessions, options = {}) {
  const { videosBySessionId = {} } = options;

  const allSessions = sortSessionsByDate(sessions);
  const accessible = allSessions.filter((s) => canStudentAccessSession(s.status));

  const assetFiles = await loadSiteAssetFiles();

  const files = {
    "site.css": siteCss,
    "site.js": siteJs,
    "index.html": renderIndexPage(phases, allSessions),
    ...assetFiles,
  };

  for (const session of accessible) {
    const phase = phases.find((p) => p.id === session.phase_id);
    files[sessionPagePath(session.id)] = renderSessionPage(session, phase);

    try {
      const videos = videosBySessionId[session.id] || [];
      const pdfBase64 = await generateSessionPdfBase64(session, phase, videos);
      files[sessionPdfPath(session.id)] = {
        encoding: "base64",
        content: pdfBase64,
      };
    } catch (err) {
      throw new Error(
        `Error al generar PDF de "${session.title}": ${err.message}`
      );
    }
  }

  return {
    files,
    stats: {
      totalCount: allSessions.length,
      accessibleCount: accessible.length,
      lockedCount: allSessions.length - accessible.length,
      pdfCount: accessible.length,
      totalFiles: Object.keys(files).length,
    },
  };
}

export function getAccessibleSessions(sessions) {
  return sessions.filter((s) => canStudentAccessSession(s.status));
}

/** @deprecated usar getAccessibleSessions */
export function getPublishedSessions(sessions) {
  return getAccessibleSessions(sessions);
}

export { canStudentAccessSession };
