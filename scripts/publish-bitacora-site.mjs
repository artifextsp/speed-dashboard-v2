/**
 * Publica el módulo de bitácora digital de evidencias en proyectospeed.com
 * sin regenerar sesiones ni PDFs.
 *
 * Uso: npm run publish:bitacora-site
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { publishToGitHub } from "../src/utils/githubPublisher.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_BUILD_VERSION = "2026-07-22-bitacora-v1";

const BITACORA_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;

const BITACORA_CTA = `    <a class="site-bitacora-cta" href="bitacora.html">
      ${BITACORA_ICON_SVG}
      Sube evidencias a tu bitácora digital
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

  if (!out.includes("site-bitacora-cta")) {
    out = out.replace(
      /(<a class="site-quiz-scores-cta"[\s\S]*?<\/a>)/,
      `$1\n${BITACORA_CTA}`
    );
  }

  // Solo logo STEM en el encabezado del sitio público
  out = out.replace(
    /<img[^>]*logo-uniminuto\.png[^>]*>\s*/g,
    ""
  );
  out = out.replace(
    /<img[^>]*logo-bogota-educacion\.png[^>]*>\s*/g,
    ""
  );

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
    "bitacora.html": readText("public/site-template/bitacora.html"),
    "bitacora.js": readText("public/site-template/bitacora.js"),
    "bitacora.css": readText("public/site-template/bitacora.css"),
  };

  console.log(`Publicando módulo de bitácora en ${owner}/${repo}…`);
  const result = await publishToGitHub(files, { token, owner, repo, branch });
  console.log("Sitio publicado correctamente.");
  console.log(`• Commit: ${result.commitUrl}`);
  console.log("• Espera 1–2 min y recarga https://www.proyectospeed.com/bitacora.html con Cmd+Shift+R");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
