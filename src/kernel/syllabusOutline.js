import { sortSessionsByDate } from "./sortByDate.js";

export function formatSessionTopicLabel(session) {
  if (session.session_number) {
    return `Sesión ${session.session_number}: ${session.title}`;
  }
  return session.title;
}

export function buildSyllabusOutline({ phases, sessions, phaseFilterId = null }) {
  const sortedPhases = [...phases].sort(
    (a, b) => (a.sort_order ?? a.phase_number) - (b.sort_order ?? b.phase_number)
  );
  const sortedSessions = sortSessionsByDate(sessions);
  const filtered = phaseFilterId
    ? sortedSessions.filter((session) => session.phase_id === phaseFilterId)
    : sortedSessions;

  const sections = sortedPhases
    .map((phase) => {
      const items = filtered
        .filter((session) => session.phase_id === phase.id)
        .map((session) => ({
          id: session.id,
          label: formatSessionTopicLabel(session),
          description: session.learning_goal?.trim() || null,
        }));

      if (items.length === 0) return null;

      return {
        phaseId: phase.id,
        phaseCode: phase.code,
        phaseTitle: phase.title,
        phaseSubtitle: phase.subtitle || null,
        items,
      };
    })
    .filter(Boolean);

  const activePhase = phaseFilterId
    ? sortedPhases.find((phase) => phase.id === phaseFilterId)
    : null;

  return {
    title: activePhase
      ? `Temario — Fase ${activePhase.code} ${activePhase.title}`
      : "Temario completo del curso",
    subtitle: "Piloto de robótica educativa · Proyecto SPEED · Uniminuto 2026",
    sections,
    sessionCount: filtered.length,
    generatedAt: new Date().toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

export function getSyllabusExportBasename(outline) {
  const phaseCode = outline.sections.length === 1 ? outline.sections[0].phaseCode : "completo";
  return `temario-speed-${String(phaseCode).toLowerCase()}`;
}
