/**
 * Actualiza site.js y site.css en proyectospeed.com sin regenerar sesiones.
 * Uso: npm run publish:site-assets
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { publishToGitHub } from "../src/utils/githubPublisher.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_BUILD_VERSION = "2026-07-03-image-fix-v1";

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

async function main() {
  const token = process.env.VITE_GITHUB_PAT;
  const owner = process.env.VITE_GITHUB_OWNER || "artifextsp";
  const repo = process.env.VITE_GITHUB_REPO || "PILOTO";
  const branch = process.env.VITE_GITHUB_BRANCH || "main";

  if (!token) {
    console.error("Falta VITE_GITHUB_PAT en .env.local");
    process.exit(1);
  }

  const files = {
    "site.js": readText("public/site-template/site.js"),
    "site.css": readText("public/site-template/site.css"),
    "asistencia.html": readText("public/site-template/asistencia.html"),
    "asistencia.js": readText("public/site-template/asistencia.js"),
  };

  console.log(`Publicando site.js y site.css en ${owner}/${repo} (${SITE_BUILD_VERSION})…`);
  const result = await publishToGitHub(files, { token, owner, repo, branch });
  console.log("Listo.");
  console.log(`Commit: ${result.commitUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
