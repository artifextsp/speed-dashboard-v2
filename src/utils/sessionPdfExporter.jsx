import { slugifyFilename } from "../kernel/markdownToPdfBlocks";

async function loadPdfModules() {
  return Promise.all([
    import("@react-pdf/renderer"),
    import("../components/export/SessionPdfDocument.jsx"),
  ]);
}

async function renderSessionPdfBlob(session, phase, videos = []) {
  const [{ pdf }, { SessionPdfDocument }] = await loadPdfModules();
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
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
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
