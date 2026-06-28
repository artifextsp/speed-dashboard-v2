import { useCallback, useEffect, useMemo, useState } from "react";
import { buildImageCandidates, normalizeUrl } from "../../kernel/urlUtils";

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
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const currentSrc = candidates[attempt] ?? candidates[0];
  const showCaption = shouldShowCaption(alt);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    setLoaded(false);
  }, [src, candidates]);

  const tryNextCandidate = useCallback(() => {
    setAttempt((current) => {
      if (current < candidates.length - 1) {
        setLoaded(false);
        return current + 1;
      }
      setFailed(true);
      return current;
    });
  }, [candidates.length]);

  if (!currentSrc) return null;

  if (failed) {
    return (
      <figure className="markdown-image-card markdown-image-card--error">
        <div className="markdown-image-card__frame">
          <div className="markdown-image-error">
            <p>No se pudo cargar la imagen{alt ? `: ${alt}` : ""}.</p>
            <p className="markdown-image-error__hint">
              Si usas Google Drive, abre el archivo en Drive y compártelo como
              «Cualquier persona con el enlace» (no basta con compartir solo la
              carpeta). También puedes pegar el enlace de vista; lo convertimos al
              formato directo automáticamente.
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
          onClick={() => loaded && setLightboxOpen(true)}
          aria-label={alt ? `Ampliar imagen: ${alt}` : "Ampliar imagen"}
          disabled={!loaded}
        >
          {!loaded && (
            <span className="markdown-image-card__loading" aria-hidden="true">
              Cargando imagen…
            </span>
          )}
          <img
            key={currentSrc}
            src={currentSrc}
            alt={alt || ""}
            className={`markdown-image-card__img${loaded ? " markdown-image-card__img--loaded" : ""}`}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 0) {
                setLoaded(true);
                return;
              }
              tryNextCandidate();
            }}
            onError={tryNextCandidate}
          />
          {loaded ? (
            <span className="markdown-image-card__hint" aria-hidden="true">
              Clic para ampliar
            </span>
          ) : null}
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
