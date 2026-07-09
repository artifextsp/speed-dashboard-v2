/**
 * Smoke test PDF con contenido similar a la sesión que fallaba al publicar.
 */
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { SessionPdfDocument } from "../src/components/export/SessionPdfDocument.jsx";

const session = {
  id: "6f7d3c25-238a-4a43-9c84-dfc37e806a55",
  title: "Ciclos de Desarrollo, conceptos básicos de circuito simple",
  status: "en_revision",
  session_number: 1,
  modality: "presencial",
  scheduled_date: "2026-03-10",
  duration_estimate: "4 horas",
  learning_goal: "Comprender ciclos de desarrollo y circuitos simples.",
  class_components: [
    {
      id: "8e84f1e4-5650-4877-b3e8-6ecc7f6f9e31",
      name: "PROTOCOLOS DE CLASE Y OBJETIVOS DEL CURSO",
      description: "Acuerdos y objetivos",
      sort_order: 0,
      content: `
<div class="markdown-styled-block" style="font-size: 14px">
<span style="color: #F97316"><strong>Objetivos del curso</strong></span>

1. <strong>Comprender</strong> los fundamentos básicos de la electricidad y la electrónica.

<strong>Identificar conceptos</strong> como voltaje, corriente, resistencia, polaridad y su aplicación en circuitos reales.

⸻

2. <strong>Diseñar</strong>, construir y analizar circuitos en serie y en paralelo.

Interpretar el comportamiento del voltaje y la corriente según la configuración del circuito.
</div>

**RECURSOS**:

1. [TINKERCAD](https://www.tinkercad.com/joinclass/NZBJH7KJB)
2. [CUENTAS DE TINKERCAD](https://drive.google.com/file/d/11Ri6o2g2JVbnqXLB6KBUYtcaVrloGacK/view?usp=drive_link)
`,
    },
    {
      id: "fc50e5d6-185f-4294-a3d5-2fbd16919843",
      name: "CICLOS DE DESARROLLO - FUNDAMENTACIÓN CONCEPTUAL",
      description: "Ciclo ADCE",
      sort_order: 1,
      content: `<span style="color: #F97316">## ¿QUÉ ES UN CICLO DE DESARROLLO EN INGENIERÍA?</span>

Un ciclo de desarrollo es un proceso organizado de pasos.

![CICLO DE DESARROLLO](https://lh3.googleusercontent.com/d/1J24IDbOferKWDnO7WeR6Rt5Jo1ypAMJa=w1920)
`,
    },
  ],
};

const phase = { code: "1", title: "Fundamentos de robótica", color: "#534AB7" };

try {
  const blob = await pdf(
    React.createElement(SessionPdfDocument, { session, phase, videos: [] })
  ).toBlob();
  console.log("PDF OK:", blob.size, "bytes");
} catch (err) {
  console.error("PDF FAIL:", err.message);
  process.exit(1);
}
