const loadedUrls = new Set();
const failedUrls = new Set();

export function markImageUrlLoaded(url) {
  if (!url) return;
  loadedUrls.add(url);
  failedUrls.delete(url);
}

export function markImageUrlFailed(url) {
  if (!url) return;
  failedUrls.add(url);
}

export function isImageUrlLoaded(url) {
  return Boolean(url && loadedUrls.has(url));
}

export function isImageUrlFailed(url) {
  return Boolean(url && failedUrls.has(url));
}

export function findLoadedCandidate(candidates) {
  return candidates.find((url) => isImageUrlLoaded(url)) ?? null;
}

export function findFirstViableCandidate(candidates) {
  const cached = findLoadedCandidate(candidates);
  if (cached) return { url: cached, index: candidates.indexOf(cached) };
  const firstUntried = candidates.findIndex((url) => !isImageUrlFailed(url));
  if (firstUntried >= 0) return { url: candidates[firstUntried], index: firstUntried };
  return { url: candidates[0], index: 0 };
}

export function preloadImageUrl(url) {
  if (!url || isImageUrlLoaded(url) || isImageUrlFailed(url)) {
    return Promise.resolve(isImageUrlLoaded(url));
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    const finish = (ok) => {
      if (ok) markImageUrlLoaded(url);
      else markImageUrlFailed(url);
      resolve(ok);
    };

    img.onload = () => finish(img.naturalWidth > 0);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

export async function preloadImageCandidates(candidates) {
  for (const url of candidates) {
    if (isImageUrlLoaded(url)) return url;
    if (isImageUrlFailed(url)) continue;
    const ok = await preloadImageUrl(url);
    if (ok) return url;
  }
  return null;
}
