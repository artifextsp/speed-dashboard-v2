import logoBogotaUrl from "../../public/site-template/assets/logo-bogota-educacion.png";
import logoUniminutoUrl from "../../public/site-template/assets/logo-uniminuto.png";
import logoUniminutoPdfUrl from "../../public/site-template/assets/logo-uniminuto-pdf.png";

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
  const [bogota, uniminuto, uniminutoPdf] = await Promise.all([
    fetchAssetBase64(logoBogotaUrl),
    fetchAssetBase64(logoUniminutoUrl),
    fetchAssetBase64(logoUniminutoPdfUrl),
  ]);

  return {
    "assets/logo-bogota-educacion.png": {
      encoding: "base64",
      content: bogota,
    },
    "assets/logo-uniminuto.png": {
      encoding: "base64",
      content: uniminuto,
    },
    "assets/logo-uniminuto-pdf.png": {
      encoding: "base64",
      content: uniminutoPdf,
    },
  };
}

export const SITE_LOGO_PATHS = {
  bogota: "assets/logo-bogota-educacion.png",
  uniminuto: "assets/logo-uniminuto.png",
};

/** URLs empaquetadas para @react-pdf/renderer (Image). */
export const PDF_LOGO_SOURCES = {
  bogota: logoBogotaUrl,
  uniminuto: logoUniminutoPdfUrl,
};
