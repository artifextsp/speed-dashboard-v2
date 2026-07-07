/**
 * Republica el sitio usando phases/sessions en un JSON local.
 * Útil cuando RLS bloquea la lectura con anon key en publish-site.mjs.
 *
 * Uso: npx vite-node --env-file=.env.local scripts/publish-site-from-cache.mjs /ruta/datos.json
 */
import { readFileSync } from "node:fs";
import { loadEnv } from "vite";
import { generateSiteFiles } from "../src/utils/siteGenerator.js";
import { publishToGitHub } from "../src/utils/githubPublisher.js";

const env = loadEnv("development", process.cwd(), "");
const cachePath = process.argv[2];
if (!cachePath) {
  throw new Error("Indica la ruta al JSON con phases y sessions.");
}

const { phases, sessions, videosBySessionId = {} } = JSON.parse(
  readFileSync(cachePath, "utf8")
);

if (!phases?.length || !sessions?.length) {
  throw new Error("El JSON debe incluir phases y sessions.");
}

const { files, stats } = await generateSiteFiles(phases, sessions, {
  videosBySessionId,
});

const result = await publishToGitHub(files, {
  token: env.VITE_GITHUB_PAT,
  owner: env.VITE_GITHUB_OWNER || "artifextsp",
  repo: env.VITE_GITHUB_REPO || "PILOTO",
  branch: env.VITE_GITHUB_BRANCH || "main",
});

console.log("Sitio publicado correctamente.");
console.log(`• Archivos: ${stats.totalFiles}`);
console.log(`• PDFs: ${stats.pdfCount}`);
console.log(`• Commit: ${result.commitUrl}`);
console.log("• Espera 1–2 min y recarga https://www.proyectospeed.com con Cmd+Shift+R");
