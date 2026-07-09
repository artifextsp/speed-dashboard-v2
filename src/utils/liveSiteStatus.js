const LIVE_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://www.proyectospeed.com";

// Captura la versión completa, p. ej. 2026-06-24-pdf-v5 (no cortar en guiones)
const BUILD_RE = /SPEED build:\s*([^\s>]+)/i;
const PUBLISHED_AT_RE = /SPEED published-at:\s*([^\s>]+)/i;
const SITE_ASSETS_RE = /SPEED site-assets:\s*([^\s*]+)/i;

export function getPublicSiteUrl() {
  return LIVE_SITE_URL.replace(/\/$/, "");
}

/** Lee la versión de build publicada en proyectospeed.com */
export async function fetchLiveSiteBuildVersion() {
  const html = await fetchLiveSiteIndexHtml();
  const match = html.match(BUILD_RE);
  return match?.[1]?.trim() || null;
}

/** Fecha ISO de la última publicación exitosa en proyectospeed.com */
export async function fetchLiveSitePublishedAt() {
  const html = await fetchLiveSiteIndexHtml();
  const match = html.match(PUBLISHED_AT_RE);
  return match?.[1]?.trim() || null;
}

async function fetchLiveSiteIndexHtml() {
  const url = `${getPublicSiteUrl()}/index.html?_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo leer el sitio (${res.status})`);
  }
  return res.text();
}

/** True si alguna sesión se editó después de la última publicación al sitio. */
export function hasUnpublishedSessionChanges(sessions, publishedAtIso) {
  if (!publishedAtIso) return true;
  const publishedMs = Date.parse(publishedAtIso);
  if (Number.isNaN(publishedMs)) return true;
  return (sessions || []).some((session) => {
    if (!session?.last_edited_at) return false;
    const editedMs = Date.parse(session.last_edited_at);
    return !Number.isNaN(editedMs) && editedMs > publishedMs;
  });
}

export function isSiteOutdated(liveVersion, localVersion) {
  if (!liveVersion) return true;
  return liveVersion !== localVersion;
}

async function fetchLiveSiteAsset(relativePath) {
  const url = `${getPublicSiteUrl()}/${relativePath}?_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo leer ${relativePath} (${res.status})`);
  }
  return res.text();
}

/** Versión embebida en site.js publicado (zoom, lightbox, etc.). */
export async function fetchLiveSiteAssetsVersion() {
  const source = await fetchLiveSiteAsset("site.js");
  const match = source.match(SITE_ASSETS_RE);
  if (match?.[1]) return match[1].trim();

  // Sitios publicados antes del marcador de versión: inferir por capacidades.
  if (source.includes("markdown-lightbox__controls") && source.includes("ZOOM_LEVELS")) {
    return "legacy-with-zoom";
  }
  return null;
}

export function isSiteAssetsOutdated(liveVersion, localVersion) {
  if (!liveVersion) return true;
  if (liveVersion === "legacy-with-zoom") return false;
  return liveVersion !== localVersion;
}
