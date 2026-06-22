const hasText = (v) => typeof v === "string" && v.trim().length > 0;
const hasItems = (v) => Array.isArray(v) && v.length > 0;

export const SECTION_REGISTRY = [
  {
    key: "header",
    order: 0,
    editorTab: { id: "header", label: "Encabezado", icon: "IconFileText" },
    progress: {
      id: "header",
      label: "Enc",
      check: (s) => hasText(s.learning_goal),
    },
  },
  {
    key: "checklist",
    order: 1,
    editorTab: { id: "checklist", label: "Preparación", icon: "IconChecklist" },
    preview: {
      title: "Antes de empezar",
      description: "Verifica que tengas todo listo antes de iniciar la sesión.",
      icon: "IconChecklist",
    },
    progress: {
      id: "checklist",
      label: "Prep",
      check: (s) =>
        hasItems(s.checklist_digital) ||
        hasItems(s.checklist_physical) ||
        hasItems(s.checklist_prior),
    },
  },
  {
    key: "conceptual",
    order: 2,
    editorTab: { id: "conceptual", label: "Fundamento", icon: "IconSchool" },
    preview: {
      title: "Fundamento conceptual",
      description: "La base teórica que necesitas para entender la práctica.",
      icon: "IconSchool",
    },
    progress: {
      id: "conceptual",
      label: "Fund",
      check: (s) => hasText(s.conceptual_content),
    },
  },
  {
    key: "videos",
    order: 3,
    editorTab: { id: "videos", label: "Videos", icon: "IconPlayerPlay" },
    preview: {
      title: "Videotutoriales",
      description: "Material audiovisual de apoyo para esta sesión.",
      icon: "IconPlayerPlay",
    },
  },
  {
    key: "practical",
    order: 4,
    editorTab: { id: "practical", label: "Manos a la obra", icon: "IconTool" },
    preview: {
      title: "Manos a la obra",
      description: "Actividad práctica guiada paso a paso.",
      icon: "IconTool",
    },
    progress: {
      id: "practical",
      label: "Prác",
      check: (s) => hasText(s.practical_content),
    },
  },
  {
    key: "pro",
    order: 5,
    editorTab: { id: "pro", label: "Reto PRO", icon: "IconTrophy" },
    preview: {
      title: "Reto PRO (avanzado)",
      description: "Extensión opcional para quienes quieran ir más allá.",
      icon: "IconTrophy",
    },
    progress: {
      id: "pro",
      label: "PRO",
      check: (s) => s.has_pro_challenge && hasText(s.pro_challenge_content),
      optional: (s) => !s.has_pro_challenge,
    },
  },
  {
    key: "bridge",
    order: 6,
    editorTab: { id: "bridge", label: "Puente al aula", icon: "IconArrowFork" },
    preview: {
      title: "Puente al aula — Transposición didáctica",
      description: "Cómo llevar lo aprendido a tu propio contexto escolar.",
      icon: "IconArrowFork",
    },
    progress: {
      id: "bridge",
      label: "Puente",
      check: (s) => hasText(s.bridge_content),
    },
  },
  {
    key: "deliverable",
    order: 7,
    editorTab: { id: "deliverable", label: "Entregable", icon: "IconPackage" },
    preview: {
      title: "Entregable y criterios",
      description: "Qué debes entregar y cómo será evaluado.",
      icon: "IconPackage",
    },
    progress: {
      id: "deliverable",
      label: "Entreg",
      check: (s) => hasText(s.deliverable_description),
    },
  },
  {
    key: "closing",
    order: 8,
    editorTab: { id: "closing", label: "Cierre", icon: "IconFlag" },
    preview: {
      title: "Cierre y conexión",
      description: "Resumen de lo logrado y preparación para lo que sigue.",
      icon: "IconFlag",
    },
    progress: {
      id: "closing",
      label: "Cierre",
      check: (s) => hasText(s.closing_summary),
    },
  },
];

export const EDITOR_TABS = SECTION_REGISTRY.filter((s) => s.editorTab).map(
  (s) => s.editorTab
);

export function getSectionPreviewMeta(sectionKey) {
  const section = SECTION_REGISTRY.find((s) => s.key === sectionKey);
  return section?.preview ?? null;
}

const PROGRESS_CHECKS = SECTION_REGISTRY.filter((s) => s.progress).map(
  (s) => s.progress
);

export function getSessionProgress(session) {
  const sections = PROGRESS_CHECKS.filter(
    (sc) => !sc.optional || !sc.optional(session)
  );
  const filled = sections.filter((sc) => sc.check(session));

  return {
    filled: filled.length,
    total: sections.length,
    pct:
      sections.length > 0
        ? Math.round((filled.length / sections.length) * 100)
        : 0,
    sections: PROGRESS_CHECKS.map((sc) => ({
      id: sc.id,
      label: sc.label,
      done: sc.check(session),
      skipped: sc.optional?.(session) ?? false,
    })),
  };
}

export function buildNumberedPreviewSections(session, videos = []) {
  const hasChecklist =
    session.checklist_digital?.length > 0 ||
    session.checklist_physical?.length > 0 ||
    session.checklist_prior?.length > 0;
  const hasVideos = videos?.length > 0;

  const visibility = {
    checklist: hasChecklist,
    conceptual: !!session.conceptual_content,
    videos: hasVideos,
    practical: !!session.practical_content,
    pro: session.has_pro_challenge && !!session.pro_challenge_content,
    bridge: !!session.bridge_content,
    deliverable: !!session.deliverable_description,
    closing: !!(session.closing_summary || session.next_session_prep),
  };

  let number = 0;
  return SECTION_REGISTRY.filter((s) => s.preview && visibility[s.key]).map(
    (s) => ({
      key: s.key,
      number: ++number,
      ...s.preview,
    })
  );
}
