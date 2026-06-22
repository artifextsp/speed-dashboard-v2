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
