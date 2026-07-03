import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { prepareMarkdownForRender } from "../src/kernel/markdownNormalize.js";
import {
  buildFormattedHtml,
  extractFormats,
} from "../src/components/editor/fields/richEditorFormat.js";
import { repairBrokenInlineTags } from "../src/kernel/styledBlockCompile.js";

function renderMarkdown(md) {
  const source = prepareMarkdownForRender(md);
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw] },
      source
    )
  );
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log("OK:", message);
}

const userBroken = `## <span style="color: #F97316">Objetivos del curso</span>

---

<div class="markdown-styled-block" style="font-size: 14px;">
1. <strong>Comprender</strong> los fundamentos básicos de la electricidad y la electrónica.
<strongIdentificar conceptos</strong> como voltaje, corriente, resistencia, polaridad y su aplicación en circuitos reales.

---

2. <strong>Diseñar</strong>, construir y analizar circuitos en serie y en paralelo.
Interpretar el comportamiento del voltaje y la corriente según la configuración del circuito.
</div>`;

const rendered = renderMarkdown(userBroken);
assert(rendered.includes("Comprender"), "renderiza Comprender con HTML roto");
assert(rendered.includes("Identificar conceptos"), "renderiza Identificar conceptos");
assert(rendered.includes("Diseñar"), "renderiza Diseñar");
assert(rendered.includes("<ol"), "convierte listas numeradas a <ol>");

const wrapped = buildFormattedHtml(
  `1. **Uno**\n2. **Dos**`,
  { fontSize: 14 }
);
assert(wrapped.includes("<ol"), "buildFormattedHtml compila listas al guardar");
assert(!wrapped.includes("\n\n"), "buildFormattedHtml evita líneas en blanco internas");

const resized = buildFormattedHtml(
  extractFormats(wrapped).content,
  { fontSize: 12 }
);
assert(resized.includes("<ol"), "cambiar tamaño conserva listas compiladas");

const repaired = repairBrokenInlineTags("<strongIdentificar</strong>");
assert(repaired.startsWith("<strong>"), "repara etiquetas strong rotas");

console.log("\nVerificación de bloques estilizados completada.");
