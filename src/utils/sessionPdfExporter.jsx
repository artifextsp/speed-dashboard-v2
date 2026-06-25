import { pdf } from "@react-pdf/renderer";
import { SessionPdfDocument } from "../components/export/SessionPdfDocument.jsx";
import { slugifyFilename } from "../kernel/markdownToPdfBlocks";

async function renderSessionPdfBlob(session, phase, videos = []) {
  return pdf(
    <SessionPdfDocument session={session} phase={phase} videos={videos} />
  ).toBlob();
}

export function getSessionPdfFilename(session) {
  const prefix = session.session_number
    ? `sesion-${session.session_number}`
    : "clase";
  return `${prefix}-${slugifyFilename(session.title)}.pdf`;
}

/** PDF en base64 para publicar en el sitio estático. */
export async function generateSessionPdfBase64(session, phase, videos = []) {
  const blob = await renderSessionPdfBlob(session, phase, videos);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string" || !dataUrl.includes(",")) {
        reject(new Error("No se pudo codificar el PDF"));
        return;
      }
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Error al leer el PDF generado"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Genera y descarga el PDF de síntesis de una clase.
 */
export async function downloadSessionPdf(session, phase, videos = []) {
  const filename = getSessionPdfFilename(session);
  const blob = await renderSessionPdfBlob(session, phase, videos);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  return filename;
}
