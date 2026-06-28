import { pdf } from "@react-pdf/renderer";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { SyllabusPdfDocument } from "../components/export/SyllabusPdfDocument.jsx";
import {
  buildSyllabusOutline,
  getSyllabusExportBasename,
} from "../kernel/syllabusOutline.js";
import { PHASE_COLORS } from "./constants.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function hexToDocxColor(hex) {
  return String(hex || "").replace("#", "").toUpperCase();
}

function buildDocxChildren(outline) {
  const children = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "SPEED",
          bold: true,
          size: 52,
          color: hexToDocxColor("#D85A30"),
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Robótica educativa para docentes usando metodologías ABP.",
          italics: true,
          color: "9CA3AF",
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [new TextRun({ text: outline.title, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: outline.subtitle, color: "666666", size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${outline.sessionCount} clase${outline.sessionCount === 1 ? "" : "s"} · Generado el ${outline.generatedAt}`,
          color: "888888",
          size: 18,
        }),
      ],
    }),
  ];

  for (const section of outline.sections) {
    const phaseColor = hexToDocxColor(PHASE_COLORS[section.phaseCode] || "#534AB7");
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: `Fase ${section.phaseCode} — ${section.phaseTitle}`,
            bold: true,
            color: phaseColor,
            size: 28,
          }),
        ],
      })
    );

    if (section.phaseSubtitle) {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: section.phaseSubtitle,
              italics: true,
              color: "666666",
              size: 20,
            }),
          ],
        })
      );
    }

    for (const item of section.items) {
      children.push(
        new Paragraph({
          spacing: { before: 180, after: 80 },
          children: [new TextRun({ text: item.label, bold: true, size: 24 })],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun({
              text: item.description || "Sin descripción registrada.",
              italics: !item.description,
              color: item.description ? "444444" : "999999",
              size: 22,
            }),
          ],
        })
      );
    }
  }

  return children;
}

export async function downloadSyllabusPdf({ phases, sessions, phaseFilterId = null }) {
  const outline = buildSyllabusOutline({ phases, sessions, phaseFilterId });
  if (outline.sessionCount === 0) {
    throw new Error("No hay clases para exportar en este temario.");
  }

  const blob = await pdf(<SyllabusPdfDocument outline={outline} />).toBlob();
  const filename = `${getSyllabusExportBasename(outline)}.pdf`;
  downloadBlob(blob, filename);
  return filename;
}

export async function downloadSyllabusDocx({ phases, sessions, phaseFilterId = null }) {
  const outline = buildSyllabusOutline({ phases, sessions, phaseFilterId });
  if (outline.sessionCount === 0) {
    throw new Error("No hay clases para exportar en este temario.");
  }

  const doc = new Document({
    creator: "Proyecto SPEED",
    title: outline.title,
    description: outline.subtitle,
    sections: [
      {
        properties: {},
        children: buildDocxChildren(outline),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${getSyllabusExportBasename(outline)}.docx`;
  downloadBlob(blob, filename);
  return filename;
}
