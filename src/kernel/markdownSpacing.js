/**
 * Convierte líneas en blanco extra (más allá del salto de párrafo estándar)
 * en bloques visibles de espaciado.
 */
export function expandMarkdownVerticalSpace(markdown) {
  if (!markdown) return "";
  return markdown.replace(/\n{3,}/g, (match) => {
    const extra = match.length - 2;
    const spacers = Array.from({ length: extra }, () => '<div class="markdown-spacer"></div>').join(
      "\n"
    );
    return `\n\n${spacers}\n`;
  });
}

export function prepareMarkdownForRender(markdown) {
  return expandMarkdownVerticalSpace(markdown ?? "");
}
