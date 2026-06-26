import { useMemo, useState } from "react";
import {
  extractGoogleDriveFileId,
  googleDriveImageUrls,
  normalizeUrl,
  resolveImageUrl,
} from "../../kernel/urlUtils";

function buildImageCandidates(src) {
  const normalized = normalizeUrl(src || "");
  const driveId = extractGoogleDriveFileId(normalized);
  if (driveId) return googleDriveImageUrls(driveId);
  return [resolveImageUrl(normalized)];
}

export function MarkdownImage({ src, alt, className }) {
  const candidates = useMemo(() => buildImageCandidates(src), [src]);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const currentSrc = candidates[attempt] ?? candidates[0];

  if (!currentSrc) return null;

  if (failed) {
    return (
      <figure className="markdown-image-error">
        <p>
          No se pudo cargar la imagen{alt ? `: ${alt}` : ""}.
        </p>
        <p className="markdown-image-error__hint">
          Si usas Google Drive, comparte el archivo como «Cualquier persona con el
          enlace» (no solo la carpeta). También puedes pegar el enlace de vista;
          lo convertimos al formato directo automáticamente.
        </p>
        <a href={normalizeUrl(src || "")} target="_blank" rel="noopener noreferrer">
          Abrir enlace original
        </a>
      </figure>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || ""}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (attempt < candidates.length - 1) {
          setAttempt((n) => n + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
