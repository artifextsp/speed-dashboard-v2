import { useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { downloadSessionPdf } from "../../utils/sessionPdfExporter";

export function DownloadPdfButton({
  session,
  phase,
  videos = [],
  className = "",
  variant = "secondary",
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadSessionPdf(session, phase, videos);
    } catch (err) {
      console.error(err);
      window.alert(
        err.message || "No se pudo generar el PDF. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn--${variant} ${className}`.trim()}
      onClick={handleDownload}
      disabled={loading}
      title="Descargar síntesis en PDF con enlaces a recursos"
    >
      <IconDownload size={15} />
      {loading ? "Generando PDF..." : "Descargar PDF"}
    </button>
  );
}
