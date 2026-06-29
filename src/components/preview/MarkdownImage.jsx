import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildImageCandidates, normalizeUrl } from "../../kernel/urlUtils";
import {
  findFirstViableCandidate,
  isImageUrlLoaded,
  markImageUrlFailed,
  markImageUrlLoaded,
  preloadImageCandidates,
} from "../../kernel/imageLoadCache";

const CANDIDATE_TIMEOUT_MS = 4500;
const EDITOR_PREVIEW_MAX_WIDTH = 640;

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

export function MarkdownImage({ src, alt, compact = false }) {
  const imgRef = useRef(null);
  const candidates = useMemo(
    () =>
      buildImageCandidates(src, {
        maxWidth: compact ? EDITOR_PREVIEW_MAX_WIDTH : 1920,
      }),
    [compact, src]
  );
  const initialCandidate = useMemo(
    () => findFirstViableCandidate(candidates),
    [candidates]
  );
  const [attempt, setAttempt] = useState(initialCandidate.index);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(() => isImageUrlLoaded(initialCandidate.url));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const currentSrc = candidates[attempt] ?? candidates[0];
  const showCaption = shouldShowCaption(alt);
  const label = String(alt ?? "").trim();

  useEffect(() => {
    const next = findFirstViableCandidate(candidates);
    setAttempt(next.index);
    setFailed(false);
    setLoaded(isImageUrlLoaded(next.url));
  }, [src, candidates]);

  useEffect(() => {
    if (!currentSrc || loaded || failed) return undefined;

    let cancelled = false;
    preloadImageCandidates(candidates.slice(attempt)).then((resolved) => {
      if (cancelled) return;
      if (!resolved) return;
      const resolvedIndex = candidates.indexOf(resolved);
      if (resolvedIndex >= 0 && resolvedIndex !== attempt) {
        setAttempt(resolvedIndex);
      }
      setLoaded(true);
      setFailed(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, candidates, currentSrc, failed, loaded]);

  useEffect(() => {
    if (!currentSrc || loaded || failed) return undefined;

    const timeoutId = window.setTimeout(() => {
      markImageUrlFailed(currentSrc);
      setAttempt((current) => {
        if (current < candidates.length - 1) {
          setLoaded(false);
          return current + 1;
        }
        setFailed(true);
        return current;
      });
    }, CANDIDATE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [candidates.length, currentSrc, failed, loaded]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || loaded) return;
    if (img.complete && img.naturalWidth > 0) {
      markImageUrlLoaded(currentSrc);
      setLoaded(true);
    }
  }, [currentSrc, loaded]);

  const tryNextCandidate = useCallback(() => {
    markImageUrlFailed(currentSrc);
    setAttempt((current) => {
      if (current < candidates.length - 1) {
        setLoaded(false);
        return current + 1;
      }
      setFailed(true);
      return current;
    });
  }, [candidates.length, currentSrc]);

  const handleLoad = useCallback(
    (event) => {
      if (event.currentTarget.naturalWidth > 0) {
        markImageUrlLoaded(currentSrc);
        setLoaded(true);
        setFailed(false);
        return;
      }
      tryNextCandidate();
    },
    [currentSrc, tryNextCandidate]
  );

  if (!currentSrc) return null;

  if (failed) {
    return (
      <figure
        className={`markdown-image-card markdown-image-card--error${compact ? " markdown-image-card--compact" : ""}`}
      >
        <div className="markdown-image-card__frame">
          {label ? <p className="markdown-image-card__label">{label}</p> : null}
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
      <figure
        className={`markdown-image-card markdown-image-card--zoomable${compact ? " markdown-image-card--compact" : ""}`}
      >
        {compact && label ? (
          <p className="markdown-image-card__label markdown-image-card__label--compact">{label}</p>
        ) : null}
        <button
          type="button"
          className="markdown-image-card__frame"
          onClick={() => loaded && setLightboxOpen(true)}
          aria-label={alt ? `Ampliar imagen: ${alt}` : "Ampliar imagen"}
          disabled={!loaded}
        >
          {!loaded && (
            <span className="markdown-image-card__loading" aria-hidden="true">
              {compact && label ? `Cargando: ${label}` : "Cargando imagen…"}
            </span>
          )}
          <img
            ref={imgRef}
            key={currentSrc}
            src={currentSrc}
            alt={alt || ""}
            className={`markdown-image-card__img${loaded ? " markdown-image-card__img--loaded" : ""}`}
            decoding="async"
            loading={compact ? "eager" : "lazy"}
            fetchPriority={compact ? "high" : "auto"}
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            onError={tryNextCandidate}
          />
          {loaded && !compact ? (
            <span className="markdown-image-card__hint" aria-hidden="true">
              Clic para ampliar
            </span>
          ) : null}
        </button>
        {showCaption && !compact ? (
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
