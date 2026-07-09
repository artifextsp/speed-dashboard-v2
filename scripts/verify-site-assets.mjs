/**
 * Verifica que site.js y site.css del template incluyan las capacidades requeridas.
 * Uso: npm run verify:site-assets
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

import siteAssetsMeta from "../public/site-template/site-assets-version.js";

const meta = siteAssetsMeta;
const siteJs = readText("public/site-template/site.js");
const siteCss = readText("public/site-template/site.css");

let ok = true;

for (const marker of meta.requiredInSiteJs || []) {
  if (!siteJs.includes(marker)) {
    fail(`site.js no incluye «${marker}» (versión ${meta.version})`);
    ok = false;
  }
}

for (const marker of meta.requiredInSiteCss || []) {
  if (!siteCss.includes(marker)) {
    fail(`site.css no incluye «${marker}» (versión ${meta.version})`);
    ok = false;
  }
}

if (ok) {
  console.log(`OK: assets del sitio verificados (${meta.version})`);
}
