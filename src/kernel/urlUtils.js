export function normalizeUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (
    /^(https?:\/\/|mailto:|#|\/)/i.test(trimmed) ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Decodifica entidades HTML en URLs (p. ej. &amp; → &). */
export function decodeHtmlEntities(text) {
  if (!text) return text;
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

export function sanitizeImageSrc(src) {
  return decodeHtmlEntities(normalizeUrl(src || ""));
}

export function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** ID de archivo en enlaces de vista, descarga o miniatura de Google Drive. */
export function extractGoogleDriveFileId(url) {
  if (!url) return null;
  try {
    const normalized = normalizeUrl(url);
    const parsed = new URL(normalized);

    const isGoogleHost =
      parsed.hostname.includes("google.com") ||
      parsed.hostname.includes("googleusercontent.com");
    if (!isGoogleHost) return null;

    const pathId = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (pathId) return pathId[1];

    const queryId = parsed.searchParams.get("id");
    if (
      queryId &&
      (parsed.hostname.includes("drive.google.com") ||
        parsed.hostname.includes("docs.google.com"))
    ) {
      return queryId;
    }

    const userContentId = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (userContentId && parsed.hostname.includes("googleusercontent.com")) {
      return userContentId[1];
    }

    return null;
  } catch {
    return null;
  }
}

/** URLs directas para embeber imágenes de Drive (orden de preferencia). */
export function googleDriveImageUrls(fileId, { maxWidth = 1920 } = {}) {
  const width = Math.max(120, Math.min(2400, Number(maxWidth) || 1920));
  return [
    `https://lh3.googleusercontent.com/d/${fileId}=w${width}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];
}

/** Lista de URLs a probar para una imagen (Drive u origen directo). */
export function buildImageCandidates(src, { maxWidth = 1920 } = {}) {
  const normalized = sanitizeImageSrc(src);
  const driveId = extractGoogleDriveFileId(normalized);
  if (driveId) return googleDriveImageUrls(driveId, { maxWidth });
  return [normalized];
}

/** Convierte enlaces de vista de Drive al formato embebible. */
export function resolveImageUrl(url, preferIndex = 0) {
  const candidates = buildImageCandidates(url);
  return candidates[preferIndex] ?? candidates[0];
}

export function isGoogleDriveUrl(url) {
  return Boolean(extractGoogleDriveFileId(url));
}
