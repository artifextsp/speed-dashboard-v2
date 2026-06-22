import { normalizeSortOrder, getComponentsProgress } from "./componentManager";

const hasText = (v) => typeof v === "string" && v.trim().length > 0;
const hasItems = (v) => Array.isArray(v) && v.length > 0;

/** Solo usa componentes guardados en BD — sin migración automática del esquema antiguo. */
export function resolveClassComponents(session) {
  if (hasItems(session.class_components)) {
    return normalizeSortOrder(session.class_components);
  }
  return [];
}

export function usesDynamicComponents() {
  return true;
}

export function getSessionProgress(session) {
  const components = session.class_components || [];
  if (!hasItems(components)) {
    return { filled: 0, total: 0, pct: 0, sections: [] };
  }
  return getComponentsProgress(components);
}
