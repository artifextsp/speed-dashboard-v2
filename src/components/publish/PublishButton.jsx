import { useState } from "react";
import { IconWorldUpload } from "@tabler/icons-react";
import { generateSiteFiles, getAccessibleSessions } from "../../utils/siteGenerator";
import { fetchSessionVideosMap } from "../../utils/fetchSessionVideosMap";
import {
  getGitHubConfig,
  publishToGitHub,
  validateGitHubConfig,
} from "../../utils/githubPublisher";

export function PublishButton({ phases, sessions, onResult }) {
  const [publishing, setPublishing] = useState(false);
  const accessible = getAccessibleSessions(sessions);
  const config = getGitHubConfig();
  const configOk = validateGitHubConfig(config).ok;

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
      `Se publicará el temario completo (${sessions.length} clases) al sitio GitHub Pages.\n\n` +
        `• Estudiantes VERÁN las 3 estados (Planeada, En desarrollo, Dictada)\n` +
        `• Solo podrán ENTRAR a ${accessible.length} clase(s) en desarrollo o dictadas\n` +
        `• Las planeada(s) aparecerán bloqueadas\n` +
        `• Se generará un PDF por cada clase accesible\n\n` +
        `Destino: ${config.owner}/${config.repo}\n\n¿Continuar?`
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

      onResult?.(
        result.initialized
          ? `Repo inicializado (rama main). ${stats.totalCount} clases en el índice, ${stats.accessibleCount} accesibles, ${stats.pdfCount} PDF(s). Activa GitHub Pages → branch main.`
          : `Sitio actualizado: ${stats.totalCount} clases listadas, ${stats.accessibleCount} con acceso, ${stats.pdfCount} PDF(s), ${stats.lockedCount} planeada(s) bloqueada(s).`,
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
      <button
        type="button"
        className="btn btn--primary publish-bar__btn"
        onClick={handlePublish}
        disabled={publishing || !configOk}
        title={
          configOk
            ? `${sessions.length} clases · ${accessible.length} accesibles para estudiantes`
            : "Configura VITE_GITHUB_PAT en .env.local"
        }
      >
        <IconWorldUpload size={16} />
        {publishing ? "Publicando..." : "Publicar al sitio"}
      </button>
      <span className="publish-bar__hint">
        {sessions.length} clases · {accessible.length} accesibles · {config.owner}/{config.repo}
      </span>
    </div>
  );
}
