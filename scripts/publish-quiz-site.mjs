/**
 * Publica archivos del módulo de cuestionarios en proyectospeed.com
 * sin regenerar sesiones ni PDFs.
 *
 * Uso: npm run publish:quiz-site
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { publishToGitHub } from "../src/utils/githubPublisher.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_BUILD_VERSION = "2026-07-16-quiz-timers-v1";

const QUIZ_SCORES_CTA = `    <a class="site-quiz-scores-cta" href="quiz-puntos.html">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
      Consulta tus puntajes de cuestionarios
    </a>`;

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

async function fetchGithubFile(token, owner, repo, filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`No se pudo leer ${filePath} en GitHub (${res.status})`);
  }
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf8");
}

function patchIndexHtml(html) {
  let out = html.replace(
    /<!-- SPEED build: [^>]+ -->/,
    `<!-- SPEED build: ${SITE_BUILD_VERSION} -->`
  );
  out = out.replace(
    /<!-- SPEED published-at: [^>]+ -->/,
    `<!-- SPEED published-at: ${new Date().toISOString()} -->`
  );

  if (!out.includes("site-quiz-scores-cta")) {
    out = out.replace(
      /(<a class="site-quiz-cta"[\s\S]*?<\/a>)/,
      `$1\n${QUIZ_SCORES_CTA}`
    );
  }

  return out;
}

async function main() {
  const token = process.env.VITE_GITHUB_PAT;
  const owner = process.env.VITE_GITHUB_OWNER || "artifextsp";
  const repo = process.env.VITE_GITHUB_REPO || "PILOTO";
  const branch = process.env.VITE_GITHUB_BRANCH || "main";

  if (!token) {
    throw new Error("Falta VITE_GITHUB_PAT en .env.local");
  }

  const indexHtml = patchIndexHtml(
    await fetchGithubFile(token, owner, repo, "index.html")
  );

  const files = {
    "index.html": indexHtml,
    "site.css": readText("public/site-template/site.css"),
    "quiz.html": readText("public/site-template/quiz.html"),
    "quiz.js": readText("public/site-template/quiz.js"),
    "quiz.css": readText("public/site-template/quiz.css"),
    "quiz-puntos.html": readText("public/site-template/quiz-puntos.html"),
    "quiz-puntos.js": readText("public/site-template/quiz-puntos.js"),
    "asistencia.html": readText("public/site-template/asistencia.html"),
  };

  console.log(`Publicando módulo de cuestionarios en ${owner}/${repo}…`);
  const result = await publishToGitHub(files, { token, owner, repo, branch });
  console.log("Sitio publicado correctamente.");
  console.log(`• Commit: ${result.commitUrl}`);
  console.log("• Espera 1–2 min y recarga https://www.proyectospeed.com/quiz.html con Cmd+Shift+R");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
