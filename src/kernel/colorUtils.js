export function sanitizeColor(color) {
  const value = String(color ?? "").trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return null;
}
