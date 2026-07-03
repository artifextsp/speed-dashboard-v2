/**
 * Actualiza logos y cabecera en proyectospeed.com sin regenerar PDFs.
 * Uso: npm run publish:logos
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { publishToGitHub } from "../src/utils/githubPublisher.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_BUILD_VERSION = "2026-07-02-institution-logos-v1";

function readAssetBase64(relativePath) {
  return readFileSync(path.join(root, relativePath)).toString("base64");
}

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

  const logosBlock = `<div class="site-header__logos">
        <img src="assets/logo-uniminuto.png" alt="Corporación Universitaria UNIMINUTO" class="site-header__logo site-header__logo--uniminuto" />
        <img src="assets/logo-bogota-educacion.png" alt="Secretaría de Educación de Bogotá" class="site-header__logo site-header__logo--bogota" />
        <img src="assets/logo-olimpiadas-stem.png" alt="Olimpiadas STEM" class="site-header__logo site-header__logo--stem" />
      </div>`;

  out = out.replace(/<div class="site-header__logos">[\s\S]*?<\/div>/, logosBlock);
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

  const indexHtml = patchIndexHtml(await fetchGithubFile(token, owner, repo, "index.html"));

  const files = {
    "index.html": indexHtml,
    "site.css": readText("public/site-template/site.css"),
    "assets/logo-bogota-educacion.png": {
      encoding: "base64",
      content: readAssetBase64("public/site-template/assets/logo-bogota-educacion.png"),
    },
    "assets/logo-uniminuto.png": {
      encoding: "base64",
      content: readAssetBase64("public/site-template/assets/logo-uniminuto.png"),
    },
    "assets/logo-uniminuto-pdf.png": {
      encoding: "base64",
      content: readAssetBase64("public/site-template/assets/logo-uniminuto-pdf.png"),
    },
    "assets/logo-olimpiadas-stem.png": {
      encoding: "base64",
      content: readAssetBase64("public/site-template/assets/logo-olimpiadas-stem.png"),
    },
  };

  const result = await publishToGitHub(files, { token, owner, repo, branch });
  console.log("Logos publicados en proyectospeed.com");
  console.log(`Build: ${SITE_BUILD_VERSION}`);
  console.log(`Commit: ${result.commitUrl}`);
  console.log("Espera 1–2 min y recarga con Cmd+Shift+R");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
