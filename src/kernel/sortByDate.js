const MONTHS_ES = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

/**
 * Parsea fechas en español ("7 de julio de 2026"), ISO o timestamp.
 * Retorna ms desde epoch; 0 si no se puede parsear.
 */
export function parseClassDate(raw) {
  if (!raw) return 0;

  if (raw instanceof Date) return raw.getTime();

  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return iso;

  const normalized = String(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const match = normalized.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = MONTHS_ES[match[2]];
    const year = Number(match[3]);
    if (month !== undefined) {
      return new Date(year, month, day).getTime();
    }
  }

  return 0;
}

export function sortSessionsByDate(sessions) {
  return [...sessions].sort((a, b) => {
    const dateA = parseClassDate(a.scheduled_date_iso || a.scheduled_date);
    const dateB = parseClassDate(b.scheduled_date_iso || b.scheduled_date);

    if (dateA !== dateB) {
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;
      return dateA - dateB;
    }

    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return (a.session_number ?? 0) - (b.session_number ?? 0);
  });
}

/**
 * Intenta derivar ISO YYYY-MM-DD desde texto en español (para persistencia futura).
 */
export function toIsoDateString(raw) {
  const ms = parseClassDate(raw);
  if (!ms) return null;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** ISO YYYY-MM-DD → "7 de julio de 2026" */
export function formatSpanishDate(isoDate) {
  if (!isoDate) return "";
  const parts = String(isoDate).split("-").map(Number);
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  if (!year || !month || !day || month < 1 || month > 12) return "";
  return `${day} de ${MONTH_NAMES_ES[month - 1]} de ${year}`;
}

/** Valor para <input type="date"> desde una sesión */
export function getDateInputValue(session) {
  if (!session) return "";
  if (session.scheduled_date_iso) return session.scheduled_date_iso;
  return toIsoDateString(session.scheduled_date) || "";
}
