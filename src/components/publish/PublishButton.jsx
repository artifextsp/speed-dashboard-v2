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
  getPublicSiteUrl,
  isSiteOutdated,
} from "../../utils/liveSiteStatus";

export function PublishButton({ phases, sessions, onResult }) {
  const [publishing, setPublishing] = useState(false);
  const [liveVersion, setLiveVersion] = useState(null);
  const [liveCheckError, setLiveCheckError] = useState(null);
  const accessible = getAccessibleSessions(sessions);
  const config = getGitHubConfig();
  const configOk = validateGitHubConfig(config).ok;
  const siteOutdated = isSiteOutdated(liveVersion, SITE_BUILD_VERSION);
  const publicSiteUrl = getPublicSiteUrl();

  const refreshLiveVersion = async () => {
    try {
      setLiveCheckError(null);
      const version = await fetchLiveSiteBuildVersion();
      setLiveVersion(version);
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

    if (sessions.length === 0) {
      onResult?.("No hay sesiones en el temario para publicar.", true);
      return;
    }

    const confirmed = window.confirm(
      `Los cambios del dashboard NO llegan solos a proyectospeed.com.\n\n` +
        `Debes publicar para que los estudiantes vean el contenido nuevo.\n\n` +
        `Se enviará el temario (${sessions.length} clases) a ${config.owner}/${config.repo}.\n` +
        `• ${accessible.length} clase(s) accesibles + PDF\n` +
        `• Build del generador: ${SITE_BUILD_VERSION}\n\n` +
        `¿Publicar ahora?`
    );
    if (!confirmed) return;

    setPublishing(true);
    try {
      const videosBySessionId = await fetchSessionVideosMap(
        accessible.map((s) => s.id)
      );
      const { files, stats } = await generateSiteFiles(phases, sessions, {
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
          </span>
        </div>
      </div>

      {siteOutdated && !publishing && (
        <div className="publish-bar__alert" role="status">
          <IconAlertTriangle size={18} />
          <div>
            <strong>El sitio de estudiantes está desactualizado.</strong>
            <p>
              Lo que ves en el dashboard (vista previa) es solo para diseñadores.
              Los estudiantes leen <a href={publicSiteUrl} target="_blank" rel="noreferrer">{publicSiteUrl}</a>,
              que ahora tiene build <strong>{liveVersion || "antiguo"}</strong>.
              Haz clic en <strong>Publicar al sitio</strong> para subir{" "}
              <strong>{SITE_BUILD_VERSION}</strong>.
            </p>
          </div>
        </div>
      )}

      {!siteOutdated && liveVersion && !publishing && (
        <p className="publish-bar__ok">
          Sitio de estudiantes sincronizado con el generador actual.
        </p>
      )}
    </div>
  );
}
