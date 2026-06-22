/**
 * Gestor de componentes dinámicos de clase (kernel portable).
 * Cada componente: nombre, descripción breve y contenido Markdown enriquecido.
 */

export function createComponent(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    content: "",
    sort_order: 0,
    ...overrides,
  };
}

export function addComponent(components, overrides = {}) {
  const next = [
    ...components,
    createComponent({ ...overrides, sort_order: components.length }),
  ];
  return normalizeSortOrder(next);
}

export function updateComponent(components, id, patch) {
  return components.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function removeComponent(components, id) {
  return normalizeSortOrder(components.filter((c) => c.id !== id));
}

export function moveComponent(components, id, direction) {
  const index = components.findIndex((c) => c.id === id);
  if (index < 0) return components;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= components.length) return components;
  const next = [...components];
  [next[index], next[target]] = [next[target], next[index]];
  return normalizeSortOrder(next);
}

export function normalizeSortOrder(components) {
  return components.map((c, i) => ({ ...c, sort_order: i }));
}

export function withDisplayNumbers(components) {
  return components.map((c, i) => ({
    ...c,
    displayNumber: i + 1,
  }));
}

const hasText = (v) => typeof v === "string" && v.trim().length > 0;

export function isComponentFilled(component) {
  return hasText(component.name) && hasText(component.content);
}

export function getComponentsProgress(components) {
  const list = components || [];
  const filled = list.filter(isComponentFilled).length;
  return {
    filled,
    total: list.length,
    pct: list.length > 0 ? Math.round((filled / list.length) * 100) : 0,
    sections: list.map((c, i) => ({
      id: c.id,
      label: c.name?.trim() || `#${i + 1}`,
      done: isComponentFilled(c),
      skipped: false,
    })),
  };
}
