import siteAssetsMeta from "../../public/site-template/site-assets-version.js";

export const SITE_ASSETS_VERSION = siteAssetsMeta.version;

const SITE_ASSETS_MARKER = `SPEED site-assets: ${SITE_ASSETS_VERSION}`;

export function getSiteAssetsRequiredMarkers() {
  return {
    siteJs: siteAssetsMeta.requiredInSiteJs || [],
    siteCss: siteAssetsMeta.requiredInSiteCss || [],
  };
}

export function stampSiteJs(siteJs) {
  const body = String(siteJs || "").replace(
    /^\/\*\s*SPEED site-assets:[^*]*\*\/\s*/u,
    ""
  );
  return `/* ${SITE_ASSETS_MARKER} */\n${body}`;
}

export function readSiteAssetsVersionFromSource(source) {
  const match = String(source || "").match(/SPEED site-assets:\s*([^\s*]+)/);
  return match?.[1]?.trim() || null;
}

export function assertSiteAssetsBundle(siteJs, siteCss) {
  const missing = collectMissingMarkers(siteJs, siteCss);
  if (missing.length > 0) {
    throw new Error(
      `Los assets del sitio público están incompletos (${SITE_ASSETS_VERSION}): ${missing.join(", ")}`
    );
  }
}

export function collectMissingMarkers(siteJs, siteCss) {
  const { siteJs: jsMarkers, siteCss: cssMarkers } = getSiteAssetsRequiredMarkers();
  const missing = [];

  for (const marker of jsMarkers) {
    if (!String(siteJs || "").includes(marker)) {
      missing.push(`site.js → ${marker}`);
    }
  }
  for (const marker of cssMarkers) {
    if (!String(siteCss || "").includes(marker)) {
      missing.push(`site.css → ${marker}`);
    }
  }

  return missing;
}

export function isSiteAssetsOutdated(liveVersion, localVersion = SITE_ASSETS_VERSION) {
  if (!liveVersion) return true;
  return liveVersion !== localVersion;
}
