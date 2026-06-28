import { sortSessionsByDate } from "./sortByDate.js";
import { UNASSIGNED_BLOCK_FILTER } from "../utils/constants.js";

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
  const filtered =
    phaseFilterId === UNASSIGNED_BLOCK_FILTER
      ? sortedSessions.filter((session) => !session.phase_id)
      : phaseFilterId
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
        phaseColor: phase.color || null,
        items,
      };
    })
    .filter(Boolean);

  if (!phaseFilterId || phaseFilterId === UNASSIGNED_BLOCK_FILTER) {
    const unassignedItems = filtered
      .filter((session) => !session.phase_id)
      .map((session) => ({
        id: session.id,
        label: formatSessionTopicLabel(session),
        description: session.learning_goal?.trim() || null,
      }));

    if (unassignedItems.length > 0 && phaseFilterId !== UNASSIGNED_BLOCK_FILTER) {
      sections.push({
        phaseId: null,
        phaseCode: null,
        phaseTitle: "Sin bloque didáctico",
        phaseSubtitle: "Clases no agrupadas",
        phaseColor: "#888888",
        items: unassignedItems,
      });
    } else if (phaseFilterId === UNASSIGNED_BLOCK_FILTER && unassignedItems.length > 0) {
      sections.length = 0;
      sections.push({
        phaseId: null,
        phaseCode: null,
        phaseTitle: "Sin bloque didáctico",
        phaseSubtitle: "Clases no agrupadas",
        phaseColor: "#888888",
        items: unassignedItems,
      });
    }
  }

  const activePhase =
    phaseFilterId && phaseFilterId !== UNASSIGNED_BLOCK_FILTER
      ? sortedPhases.find((phase) => phase.id === phaseFilterId)
      : null;

  return {
    title: activePhase
      ? `Temario — ${activePhase.title}`
      : phaseFilterId === UNASSIGNED_BLOCK_FILTER
        ? "Temario — Sin bloque didáctico"
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
