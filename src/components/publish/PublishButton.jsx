import { useEffect, useState } from "react";
import { IconAlertTriangle, IconWorldUpload } from "@tabler/icons-react";
import {
  generateSiteFiles,
  getAccessibleSessions,
  SITE_BUILD_VERSION,
} from "../../utils/siteGenerator";
import { fetchSessionVideosMap } from "../../utils/fetchSessionVideosMap";
import {
  getGitHubConfig,
  publishToGitHub,
  validateGitHubConfig,
} from "../../utils/githubPublisher";
import {
  fetchLiveSiteBuildVersion,
  fetchLiveSitePublishedAt,
  getPublicSiteUrl,
  hasUnpublishedSessionChanges,
  isSiteOutdated,
} from "../../utils/liveSiteStatus";

function formatPublishedAt(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function PublishButton({ phases, sessions, fetchFreshSessions, onResult }) {
  const [publishing, setPublishing] = useState(false);
  const [liveVersion, setLiveVersion] = useState(null);
  const [livePublishedAt, setLivePublishedAt] = useState(null);
  const [liveCheckError, setLiveCheckError] = useState(null);
  const accessible = getAccessibleSessions(sessions);
  const config = getGitHubConfig();
  const configOk = validateGitHubConfig(config).ok;
  const siteOutdated = isSiteOutdated(liveVersion, SITE_BUILD_VERSION);
  const hasPendingEdits = hasUnpublishedSessionChanges(sessions, livePublishedAt);
  const publicSiteUrl = getPublicSiteUrl();

  const refreshLiveVersion = async () => {
    try {
      setLiveCheckError(null);
      const [version, publishedAt] = await Promise.all([
        fetchLiveSiteBuildVersion(),
        fetchLiveSitePublishedAt(),
      ]);
      setLiveVersion(version);
      setLivePublishedAt(publishedAt);
    } catch (err) {
      setLiveCheckError(err.message || "No se pudo verificar el sitio");
    }
  };

  useEffect(() => {
    refreshLiveVersion();
  }, []);

  const handlePublish = async () => {
    const validation = validateGitHubConfig();
    if (!validation.ok) {
      onResult?.(validation.error, true);
      return;
    }

    let freshSessions = sessions;
    try {
      if (fetchFreshSessions) {
        freshSessions = await fetchFreshSessions();
      }
    } catch (err) {
      onResult?.(err.message || "No se pudieron recargar las clases antes de publicar", true);
      return;
    }

    if (freshSessions.length === 0) {
      onResult?.("No hay sesiones en el temario para publicar.", true);
      return;
    }

    const freshAccessible = getAccessibleSessions(freshSessions);

    const confirmed = window.confirm(
      `Los cambios del dashboard NO llegan solos a proyectospeed.com.\n\n` +
        `Debes publicar para que los estudiantes vean el contenido nuevo.\n\n` +
        `Se enviará el temario (${freshSessions.length} clases) a ${config.owner}/${config.repo}.\n` +
        `• ${freshAccessible.length} clase(s) accesibles + PDF\n` +
        `• Build del generador: ${SITE_BUILD_VERSION}\n\n` +
        `¿Publicar ahora?`
    );
    if (!confirmed) return;

    setPublishing(true);
    try {
      const videosBySessionId = await fetchSessionVideosMap(
        freshAccessible.map((s) => s.id)
      );
      const { files, stats } = await generateSiteFiles(phases, freshSessions, {
        videosBySessionId,
      });
      const result = await publishToGitHub(files);

      await refreshLiveVersion();

      onResult?.(
        result.initialized
          ? `Repo inicializado. ${stats.totalCount} clases, ${stats.pdfCount} PDF(s). Activa GitHub Pages en rama main.`
          : `Sitio publicado: ${stats.pdfCount} PDF(s), build ${SITE_BUILD_VERSION}. Espera 1–2 min y recarga ${publicSiteUrl} con Cmd+Shift+R.`,
        false,
        result
      );
    } catch (err) {
      onResult?.(err.message || "Error al publicar", true);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="publish-bar">
      <div className="publish-bar__main">
        <button
          type="button"
          className="btn btn--primary publish-bar__btn"
          onClick={handlePublish}
          disabled={publishing || !configOk}
          title={
            configOk
              ? `${sessions.length} clases · ${accessible.length} accesibles`
              : "Configura VITE_GITHUB_PAT en Vercel y .env.local"
          }
        >
          <IconWorldUpload size={16} />
          {publishing ? "Generando sitio y PDFs..." : "Publicar al sitio"}
        </button>
        <div className="publish-bar__meta">
          <span className="publish-bar__hint">
            {sessions.length} clases · {accessible.length} accesibles ·{" "}
            {config.owner}/{config.repo}
          </span>
          <span className="publish-bar__version">
            Generador: <strong>{SITE_BUILD_VERSION}</strong>
            {liveVersion ? (
              <>
                {" "}
                · Sitio live: <strong>{liveVersion}</strong>
              </>
            ) : liveCheckError ? (
              <> · Sitio live: no verificado</>
            ) : (
              <> · Verificando sitio…</>
            )}
            {livePublishedAt ? (
              <> · Publicado: {formatPublishedAt(livePublishedAt)}</>
            ) : null}
          </span>
        </div>
      </div>

      {hasPendingEdits && !publishing && (
        <div className="publish-bar__alert" role="status">
          <IconAlertTriangle size={18} />
          <div>
            <strong>Hay cambios guardados que los estudiantes aún no ven.</strong>
            <p>
              Guardar en el editor no actualiza <a href={publicSiteUrl} target="_blank" rel="noreferrer">{publicSiteUrl}</a>.
              {livePublishedAt ? (
                <>
                  {" "}
                  La última publicación fue el <strong>{formatPublishedAt(livePublishedAt)}</strong>, pero
                  hay clases editadas después.
                </>
              ) : (
                <> Aún no hay registro de publicación reciente en el sitio.</>
              )}
              {" "}Haz clic en <strong>Publicar al sitio</strong> y espera el mensaje verde de éxito.
            </p>
          </div>
        </div>
      )}

      {siteOutdated && !hasPendingEdits && !publishing && (
        <div className="publish-bar__alert" role="status">
          <IconAlertTriangle size={18} />
          <div>
            <strong>El sitio de estudiantes usa una versión antigua del generador.</strong>
            <p>
              El build publicado es <strong>{liveVersion || "antiguo"}</strong> y el generador actual es{" "}
              <strong>{SITE_BUILD_VERSION}</strong>. Publica de nuevo para aplicar mejoras del sistema.
            </p>
          </div>
        </div>
      )}

      {!siteOutdated && !hasPendingEdits && liveVersion && !publishing && (
        <p className="publish-bar__ok">
          Sitio de estudiantes sincronizado con las clases guardadas.
        </p>
      )}
    </div>
  );
}
