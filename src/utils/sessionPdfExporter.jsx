import { slugifyFilename } from "../kernel/markdownToPdfBlocks";

/**
 * Genera y descarga el PDF de síntesis de una clase.
 */
export async function downloadSessionPdf(session, phase, videos = []) {
  const [{ pdf }, { SessionPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("../components/export/SessionPdfDocument.jsx"),
  ]);

  const prefix = session.session_number
    ? `sesion-${session.session_number}`
    : "clase";
  const filename = `${prefix}-${slugifyFilename(session.title)}.pdf`;

  const blob = await pdf(
    <SessionPdfDocument session={session} phase={phase} videos={videos} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  return filename;
}
