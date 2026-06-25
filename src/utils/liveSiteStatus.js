const LIVE_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://www.proyectospeed.com";

// Captura la versión completa, p. ej. 2026-06-24-pdf-v5 (no cortar en guiones)
const BUILD_RE = /SPEED build:\s*([^\s>]+)/i;

export function getPublicSiteUrl() {
  return LIVE_SITE_URL.replace(/\/$/, "");
}

/** Lee la versión de build publicada en proyectospeed.com */
export async function fetchLiveSiteBuildVersion() {
  const url = `${getPublicSiteUrl()}/index.html?_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo leer el sitio (${res.status})`);
  }
  const html = await res.text();
  const match = html.match(BUILD_RE);
  return match?.[1]?.trim() || null;
}

export function isSiteOutdated(liveVersion, localVersion) {
  if (!liveVersion) return true;
  return liveVersion !== localVersion;
}
