/**
 * Logos del sitio público servidos desde /public sin hash de Vite.
 * Evita fallos al publicar en producción (fetch a /assets/logo-*.png inexistente).
 */
const PUBLIC_SITE_ASSETS = "/site-template/assets";

const SITE_ASSET_URLS = {
  bogota: `${PUBLIC_SITE_ASSETS}/logo-bogota-educacion.png`,
  uniminuto: `${PUBLIC_SITE_ASSETS}/logo-uniminuto.png`,
  uniminutoPdf: `${PUBLIC_SITE_ASSETS}/logo-uniminuto-pdf.png`,
  stem: `${PUBLIC_SITE_ASSETS}/logo-olimpiadas-stem.png`,
};

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string" || !dataUrl.includes(",")) {
        reject(new Error("No se pudo leer el archivo"));
        return;
      }
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Error al leer archivo del sitio"));
    reader.readAsDataURL(blob);
  });
}

async function fetchAssetBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar recurso: ${url}`);
  return blobToBase64(await res.blob());
}

/** Archivos binarios del sitio público para publicar en GitHub. */
export async function loadSiteAssetFiles() {
  const entries = [
    ["assets/logo-bogota-educacion.png", SITE_ASSET_URLS.bogota],
    ["assets/logo-uniminuto.png", SITE_ASSET_URLS.uniminuto],
    ["assets/logo-uniminuto-pdf.png", SITE_ASSET_URLS.uniminutoPdf],
    ["assets/logo-olimpiadas-stem.png", SITE_ASSET_URLS.stem],
  ];

  const files = {};
  await Promise.all(
    entries.map(async ([path, url]) => {
      files[path] = {
        encoding: "base64",
        content: await fetchAssetBase64(url),
      };
    })
  );
  return files;
}

export const SITE_LOGO_PATHS = {
  bogota: "assets/logo-bogota-educacion.png",
  uniminuto: "assets/logo-uniminuto.png",
  stem: "assets/logo-olimpiadas-stem.png",
};

/** URLs para @react-pdf/renderer (Image) en el navegador. */
export const PDF_LOGO_SOURCES = {
  bogota: SITE_ASSET_URLS.bogota,
  uniminuto: SITE_ASSET_URLS.uniminutoPdf,
  stem: SITE_ASSET_URLS.stem,
};
