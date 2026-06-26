import { useEffect, useMemo, useState } from "react";
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

function shouldShowCaption(alt) {
  const label = String(alt ?? "").trim();
  return label.length > 0 && label.toLowerCase() !== "imagen";
}

function MarkdownLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="markdown-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
    >
      <button
        type="button"
        className="markdown-lightbox__close"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt || ""}
        className="markdown-lightbox__img"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

export function MarkdownImage({ src, alt }) {
  const candidates = useMemo(() => buildImageCandidates(src), [src]);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const currentSrc = candidates[attempt] ?? candidates[0];
  const showCaption = shouldShowCaption(alt);

  if (!currentSrc) return null;

  if (failed) {
    return (
      <figure className="markdown-image-card markdown-image-card--error">
        <div className="markdown-image-card__frame">
          <div className="markdown-image-error">
            <p>No se pudo cargar la imagen{alt ? `: ${alt}` : ""}.</p>
            <p className="markdown-image-error__hint">
              Si usas Google Drive, comparte el archivo como «Cualquier persona con el
              enlace» (no solo la carpeta). También puedes pegar el enlace de vista;
              lo convertimos al formato directo automáticamente.
            </p>
            <a href={normalizeUrl(src || "")} target="_blank" rel="noopener noreferrer">
              Abrir enlace original
            </a>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <>
      <figure className="markdown-image-card markdown-image-card--zoomable">
        <button
          type="button"
          className="markdown-image-card__frame"
          onClick={() => setLightboxOpen(true)}
          aria-label={alt ? `Ampliar imagen: ${alt}` : "Ampliar imagen"}
        >
          <img
            src={currentSrc}
            alt={alt || ""}
            className="markdown-image-card__img"
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
          <span className="markdown-image-card__hint" aria-hidden="true">
            Clic para ampliar
          </span>
        </button>
        {showCaption ? (
          <figcaption className="markdown-image-card__caption">{alt}</figcaption>
        ) : null}
      </figure>
      {lightboxOpen ? (
        <MarkdownLightbox
          src={currentSrc}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
