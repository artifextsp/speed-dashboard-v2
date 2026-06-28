import { IconFileTypePdf, IconFileTypeDocx } from "@tabler/icons-react";

export function SyllabusExportButtons({ onExportPdf, onExportDocx, disabled = false }) {
  return (
    <div className="session-list__exports">
      <button
        type="button"
        className="btn btn--ghost btn--compact"
        disabled={disabled}
        onClick={onExportPdf}
        title="Descargar temario en PDF"
      >
        <IconFileTypePdf size={16} />
        Temario PDF
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--compact"
        disabled={disabled}
        onClick={onExportDocx}
        title="Descargar temario en Word"
      >
        <IconFileTypeDocx size={16} />
        Temario DOCX
      </button>
    </div>
  );
}
