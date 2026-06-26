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

    if (!parsed.hostname.includes("google.com")) return null;

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
export function googleDriveImageUrls(fileId) {
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];
}

/** Convierte enlaces de vista de Drive al formato embebible. */
export function resolveImageUrl(url, preferIndex = 0) {
  const normalized = normalizeUrl(url);
  const driveId = extractGoogleDriveFileId(normalized);
  if (driveId) {
    const urls = googleDriveImageUrls(driveId);
    return urls[preferIndex] ?? urls[0];
  }
  return normalized;
}

export function isGoogleDriveUrl(url) {
  return Boolean(extractGoogleDriveFileId(url));
}
