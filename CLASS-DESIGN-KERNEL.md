# Kernel de Diseño de Clases — Blueprint reutilizable

> **Propósito:** Documentar el núcleo agnóstico a plataforma de un módulo de planificación, diseño y publicación de clases de robótica educativa.  
> **Referencia de implementación:** proyecto SPEED Dashboard (`speed-dashboard-v2`).  
> **Versión:** 1.0 — 22 de junio de 2026

---

## 0. Glosario y mapeo SPEED

| Concepto del kernel | Término SPEED | Archivo de referencia |
|---------------------|---------------|------------------------|
| Clase | Sesión (`sessions`) | `speed-schema.sql` |
| Componente de clase | Sección / pestaña del editor | `EDITOR_TABS` en `constants.js` |
| Diseñador (Docente) | `admin` / `author` | `useAuth.js`, `App.jsx` |
| Supervisor | `supervisor` | `SessionEditor.jsx` (`readOnly`) |
| Estudiante | Usuario anónimo del sitio público | RLS `status = 'publicado'` |
| Estado Planeada | `borrador` | `STATUS_CONFIG` |
| Estado En desarrollo | `en_revision` | `STATUS_CONFIG` |
| Estado Dictada | `publicado` | `STATUS_CONFIG` |

El kernel usa vocabulario pedagógico genérico. SPEED ya implementa el equivalente con nombres de flujo editorial (`borrador` → `en_revision` → `publicado`). Al portar a otro contexto, renombrar las etiquetas sin cambiar la máquina de estados subyacente.

---

## 1. Arquitectura general

### 1.1 Vista de capas

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                         │
│  Dashboard │ Editor │ Preview dual │ Vista estudiante │ PDF     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CAPA DE APLICACIÓN                           │
│  PermissionGuard │ StateManager │ SectionRegistry │ SortEngine  │
│  ContentSerializer │ PdfExporter │ PublishPipeline              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CAPA DE DOMINIO (KERNEL)                     │
│  Class │ ClassSection │ RichContent │ MediaRef │ ClassStatus    │
│  Role │ PermissionMatrix │ SectionMeta                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA (adaptador)             │
│  Supabase │ PostgreSQL │ LMS API │ JSON files │ GitHub Pages    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Principio de diseño: kernel vs adaptadores

El **kernel** define contratos de datos, reglas de negocio y comportamiento UI independiente del framework. Los **adaptadores** conectan el kernel a React, Moodle, HTML estático, etc.

```
Kernel (inmutable entre proyectos)
  ├── domain/          → tipos, validaciones, transiciones de estado
  ├── permissions/     → matriz rol × acción
  ├── sections/        → registro de componentes numerados
  ├── content/         → serialización Markdown + HTML embebido
  └── export/          → contrato PDF (entrada/salida)

Adaptadores (específicos por plataforma)
  ├── ui-react/        → RichEditor, SessionPreview  ← SPEED actual
  ├── storage-supabase/→ useSessions, RLS
  ├── publish-github/  → siteGenerator (pendiente)
  └── pdf-browser/     → jsPDF + html2canvas (pendiente)
```

### 1.3 Permisos en la arquitectura

Los permisos se evalúan en **tres puntos**, nunca solo en UI:

| Punto | Responsabilidad | SPEED actual |
|-------|-----------------|--------------|
| UI | Ocultar/deshabilitar controles | `readOnly` en `SessionEditor` |
| Aplicación | Rechazar acciones antes de persistir | Parcial — falta validación explícita en `saveSession` |
| Persistencia | RLS / políticas del backend | Supabase RLS en `speed-schema.sql` |

```typescript
// Patrón: PermissionGuard (agnóstico)
type Role = "designer" | "supervisor" | "student";
type Action =
  | "class.create" | "class.edit" | "class.changeStatus"
  | "class.publish" | "class.downloadPdf" | "class.view";

const PERMISSIONS: Record<Role, Set<Action>> = {
  designer:   new Set(["class.create","class.edit","class.changeStatus","class.publish","class.downloadPdf","class.view"]),
  supervisor: new Set(["class.view","class.downloadPdf"]),
  student:    new Set(["class.view","class.downloadPdf"]),
};

function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
```

**SPEED:** `designer` = `admin` | `author`; `supervisor` bloquea edición vía `readOnly`; `student` accede solo a sesiones `publicado` en sitio público.

---

## 2. Entidades de datos

### 2.1 Clase (Class / Session)

```json
{
  "id": "uuid",
  "title": "Gestión ágil: Gantt y Scrum",
  "sessionNumber": 1,
  "phaseId": "uuid",
  "scheduledDate": "2026-07-07",
  "modality": "virtual",
  "durationEstimate": "4h",
  "learningGoal": "Organizar el proyecto con herramientas ágiles...",
  "status": "planned | in_development | delivered",
  "sortOrder": 10,
  "publishedAt": null,
  "lastEditedBy": "hansel@example.com",
  "lastEditedAt": "2026-06-21T20:00:00Z",
  "sections": { /* ver 2.2 */ },
  "media": { /* ver 2.3 */ }
}
```

### 2.2 Componentes numerados (ClassSection)

Cada clase se compone de **N secciones ordenadas** con metadatos fijos (título, descripción breve, icono) y contenido variable.

```json
{
  "sectionRegistry": [
    {
      "key": "checklist",
      "order": 1,
      "title": "Antes de empezar",
      "shortDescription": "Verifica que tengas todo listo antes de iniciar.",
      "contentType": "structured-list",
      "fields": ["checklist_digital", "checklist_physical", "checklist_prior"]
    },
    {
      "key": "conceptual",
      "order": 2,
      "title": "Fundamento conceptual",
      "shortDescription": "La base teórica que necesitas.",
      "contentType": "rich-text",
      "fields": ["conceptual_content"]
    }
  ]
}
```

**SPEED implementado:** `SECTION_META` en `SessionPreview.jsx` + `EDITOR_TABS` en `constants.js`.  
**Falta:** unificar ambos en un único `SectionRegistry` exportable (kernel puro en `src/kernel/sectionRegistry.js`).

### 2.3 Contenido enriquecido (RichContent)

El kernel almacena contenido como **Markdown con extensiones HTML controladas**:

| Capacidad | Representación | Implementado SPEED |
|-----------|----------------|-------------------|
| Negrita, cursiva, listas | Markdown GFM | `RichEditor.jsx` |
| Enlaces | `[texto](url)` + normalización `https://` | `MarkdownContent.jsx`, `RichEditor.jsx` |
| Imágenes | `![alt](url)` | `RichEditor.jsx` |
| Videos YouTube | `<div class="markdown-embed">` + iframe | `RichEditor.jsx` |
| Color / tamaño | `<span style="color|font-size">` | `RichEditor.jsx` |
| Alineación | `<div style="text-align">` | `RichEditor.jsx` |

```json
{
  "conceptual_content": "## Introducción\n\nTexto con **negrita**.\n\n<div class=\"markdown-embed markdown-embed--video\">...</div>"
}
```

### 2.4 Multimedia referenciada (MediaRef)

```json
{
  "videos": [
    {
      "id": "uuid",
      "title": "Tutorial Gantt",
      "youtubeUrl": "https://youtube.com/watch?v=xxx",
      "duration": "12:30",
      "timing": "antes | durante | referencia",
      "sortOrder": 0
    }
  ],
  "physicalResources": [
    { "name": "Kit Arduino", "imageUrl": "...", "description": "..." }
  ]
}
```

**SPEED:** tabla `session_videos`; recursos físicos en JSONB `checklist_physical`.

### 2.5 Estados de clase

```typescript
type ClassStatus = "planned" | "in_development" | "delivered";

interface StatusVisual {
  key: ClassStatus;
  label: string;
  color: string;      // texto / borde
  background: string; // fondo de badge y tarjeta
}

const STATUS_VISUALS: StatusVisual[] = [
  { key: "planned",         label: "Planeada",      color: "#BA7517", background: "#FAEEDA" }, // amarillo
  { key: "in_development",  label: "En desarrollo", color: "#639922", background: "#EAF3DE" }, // verde
  { key: "delivered",       label: "Dictada",       color: "#185FA5", background: "#E6F1FB" }, // azul
];
```

**SPEED actual** (`constants.js`):

| Kernel | SPEED | Color actual |
|--------|-------|--------------|
| `planned` | `borrador` | gris `#888780` |
| `in_development` | `en_revision` | ámbar `#BA7517` |
| `delivered` | `publicado` | verde `#639922` |

**Gap:** los colores del prompt (amarillo / verde / azul) no coinciden exactamente con SPEED. Ajustar `STATUS_CONFIG` para alinear semántica visual.

### 2.6 Roles

```json
{
  "user": {
    "id": "uuid",
    "email": "docente@example.com",
    "role": "designer | supervisor | student",
    "displayName": "Hansel"
  }
}
```

---

## 3. Componentes reutilizables

### 3.1 Editor de contenido enriquecido (`RichContentEditor`)

**Responsabilidad:** capturar y editar Markdown+HTML con toolbar extensible.

**Interfaz del kernel:**

```typescript
interface RichContentEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  viewMode?: "edit" | "preview" | "live";
  toolbar?: ToolbarCommand[];
  height?: number;
}
```

**SPEED:** `src/components/editor/fields/RichEditor.jsx`  
- Modo `live` = edición + preview simultánea (dentro de cada campo)  
- Comandos: bold, italic, color, fontSize, link, image, youtube, align

**Extensión futura:** subir imagen → `MediaUploadAdapter` → URL pública.

---

### 3.2 Visualización dual (`DualViewEditor`)

**Responsabilidad:** alternar o combinar modos edición / preview a nivel de clase completa.

**Modos:**

```
┌──────────────┬──────────────────────────────────────┐
│ edit         │ Solo editor (pestañas de sección)    │
│ preview      │ Solo vista estudiante                │
│ live         │ Editor + preview lado a lado         │
│ split-tab    │ Editor en pestaña, preview en otra   │  ← SPEED actual
└──────────────┴──────────────────────────────────────┘
```

**SPEED actual:**
- Nivel campo: `RichEditor` con `preview="live"` ✅
- Nivel clase: `SessionEditor` alterna con botón "Vista previa" → pantalla completa (`showPreview`) ⚠️ parcial
- **Falta:** modo `live` a nivel clase (editor + `SessionPreview` en split view)

**Patrón skeleton:**

```typescript
function DualViewEditor({ classData, viewMode, onViewModeChange, children }) {
  if (viewMode === "preview") return <StudentViewer data={classData} />;
  if (viewMode === "live") return (
    <div className="dual-view">
      <div className="dual-view__editor">{children}</div>
      <div className="dual-view__preview"><StudentViewer data={classData} live /></div>
    </div>
  );
  return children; // edit only
}
```

---

### 3.3 Gestor de componentes numerados (`SectionManager`)

**Responsabilidad:** definir orden, títulos, numeración automática y visibilidad condicional de secciones.

```typescript
function buildNumberedSections(classData, registry) {
  let number = 1;
  return registry
    .filter(section => section.isVisible?.(classData) ?? hasContent(classData, section))
    .map(section => ({
      ...section,
      displayNumber: number++,
    }));
}
```

**SPEED:** `SessionPreview.jsx` numera manualmente al renderizar; `getSessionProgress()` en `constants.js` calcula completitud.

**Falta:** extraer lógica a `src/kernel/sectionManager.js` reutilizable por preview, PDF y sitio público.

---

### 3.4 Visualizador colapsable para estudiantes (`CollapsibleSectionViewer`)

**Responsabilidad:** mostrar secciones numeradas expandibles con título + descripción breve.

**SPEED:** `AccordionSection` en `SessionPreview.jsx` ✅

```typescript
interface AccordionSectionProps {
  number: number;
  title: string;
  description: string;
  color: string;
  defaultOpen?: boolean;
  children: ReactNode;
}
```

Comportamiento: un acordeón por sección; primera sección abierta por defecto; icono chevron; color de fase ADCE.

---

### 3.5 Generador de PDF (`PdfSynthesisExporter`) — **PENDIENTE**

**Responsabilidad:** transformar la estructura de la clase en PDF profesional con **hipervínculos clicables** a recursos multimedia.

#### Estrategia recomendada (dos fases)

**Fase A — PDF con enlaces de texto (MVP)**

1. Recorrer `buildNumberedSections(classData, registry)`
2. Convertir Markdown → HTML (mismo pipeline que preview)
3. Extraer enlaces `<a href>` e iframes YouTube → reemplazar por texto clicable en PDF
4. Generar con **@react-pdf/renderer** o **pdfmake** (soportan `link:` nativo)

```typescript
// Pseudocódigo agnóstico
async function exportClassPdf(classData, registry) {
  const sections = buildNumberedSections(classData, registry);
  const doc = createPdfDocument({ title: classData.title });

  for (const section of sections) {
    doc.addSectionHeader(section.displayNumber, section.title);
    const blocks = markdownToBlocks(section.content);

    for (const block of blocks) {
      if (block.type === "link") {
        doc.addLink(block.text, normalizeUrl(block.href)); // ← hipervínculo funcional
      } else if (block.type === "youtube") {
        doc.addLink(`▶ Ver video: ${block.title}`, block.watchUrl);
      } else {
        doc.addParagraph(block.text);
      }
    }
  }
  return doc.download(`${slugify(classData.title)}.pdf`);
}
```

**Fase B — PDF enriquecido (opcional)**

- Miniatura de video como imagen + enlace
- `@react-pdf/renderer` con componentes `<Link src="...">`
- Evitar `html2canvas` para enlaces (rasteriza y pierde interactividad)

#### Librerías por plataforma

| Plataforma | Librería recomendada | Enlaces |
|------------|---------------------|---------|
| React web | `@react-pdf/renderer` | ✅ nativos |
| Node/backend | `pdfmake` / `puppeteer` + HTML con `<a>` | ✅ |
| LMS plugin | API del LMS + attachment | depende |

**SPEED — archivos a crear:**
- `src/kernel/pdfExporter.js` — lógica pura
- `src/components/export/DownloadPdfButton.jsx` — UI
- Integrar en `SessionPreview` (estudiante) y `SessionEditor` (diseñador)

---

### 3.6 Gestor de estados visuales (`StatusVisualManager`) — **PARCIAL**

**Responsabilidad:** asignar estado, validar transiciones, reflejar en badges y tarjetas.

```typescript
const ALLOWED_TRANSITIONS: Record<ClassStatus, ClassStatus[]> = {
  planned:         ["in_development"],
  in_development:  ["planned", "delivered"],
  delivered:       ["in_development"], // reabrir para correcciones
};

function transitionStatus(current: ClassStatus, next: ClassStatus, role: Role) {
  if (!can(role, "class.changeStatus")) throw new ForbiddenError();
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) throw new InvalidTransitionError();
  return next;
}
```

**Reflejo visual en tarjetas:**

```css
.session-card[data-status="planned"]        { border-left: 4px solid var(--status-planned); }
.session-card[data-status="in_development"] { border-left: 4px solid var(--status-dev); }
.session-card[data-status="delivered"]      { border-left: 4px solid var(--status-delivered); }
```

**SPEED actual:**
- `StatusBadge.jsx` ✅ badge con color
- `SessionRow.jsx` muestra badge pero **sin borde de tarjeta por estado** ⚠️
- Selector de estado en `SessionEditor.jsx` ✅ (solo no-supervisor)
- **Falta:** `data-status` en tarjetas + actualizar colores a amarillo/verde/azul del prompt

---

### 3.7 Motor de ordenamiento (`SortByDateEngine`) — **PARCIAL**

**Responsabilidad:** ordenar clases dinámicamente por `scheduledDate`.

```typescript
function sortClassesByDate(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => {
    const dateA = parseClassDate(a.scheduledDate);
    const dateB = parseClassDate(b.scheduledDate);
    if (dateA !== dateB) return dateA - dateB;
    return (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0);
  });
}

function parseClassDate(raw: string): number {
  // Soportar "7 de julio de 2026", "2026-07-07", ISO
  const iso = Date.parse(raw);
  if (!isNaN(iso)) return iso;
  // fallback: locale es-CO parser o tabla de mapeo
  return 0;
}
```

**SPEED actual:**
- Query ordena por `sort_order` fijo en BD (`useSessions.js`) ⚠️
- `scheduled_date` es texto libre en español ("7 de julio de 2026") — dificulta sort automático
- **Falta:**
  1. Campo `scheduled_date_iso DATE` en BD (o normalizar al guardar)
  2. `sortClassesByDate()` en frontend como respaldo
  3. Trigger SQL que actualice `sort_order` cuando cambie la fecha

---

## 4. Flujos de trabajo

### 4.1 Crear / editar clase

```
Diseñador selecciona clase
  → PermissionGuard: can("class.edit")
  → DualViewEditor carga datos + secciones
  → Edita campos RichContent por sección
  → Guardar borrador (status = planned)     ← sin publicar
  → O guardar + cambiar status              ← en desarrollo / dictada
  → Persistencia + edit_log
  → Permanece en editor (no redirigir)      ← SPEED ✅ desde 21/06
```

**Supervisor:** mismo flujo pero `readOnly=true`, sin botón guardar ni selector de estado.

### 4.2 Cambiar estado (solo Diseñador)

```
Diseñador cambia select de estado
  → transitionStatus() valida
  → StatusBadge actualiza inmediatamente (estado local)
  → Al guardar: persiste + si delivered → publishedAt = now()
  → SessionRow refleja nuevo color en próximo reload
```

### 4.3 Ordenamiento automático por fecha

```
Al cargar lista de clases:
  → sortClassesByDate(sessions)
  → Render SessionRow en orden

Al editar scheduled_date:
  → Normalizar a ISO al guardar
  → Recalcular sort_order en BD (opcional)
  → Re-render lista ordenada
```

### 4.4 Visualización estudiante

```
Estudiante abre clase publicada (status = delivered)
  → PermissionGuard: can("class.view")
  → CollapsibleSectionViewer con secciones numeradas
  → Expande/contrae cada componente
  → MarkdownContent renderiza enlaces y videos centrados
  → Botón "Descargar síntesis" → PdfSynthesisExporter
```

**SPEED:** `SessionPreview.jsx` para diseñador en modo preview; sitio público pendiente.

### 4.5 Descarga de síntesis PDF

```
Usuario con permiso class.downloadPdf
  → PdfSynthesisExporter(classData, sectionRegistry)
  → Por cada sección numerada:
      - Título + descripción
      - Contenido convertido
      - Enlaces → link annotations en PDF
      - Videos → "▶ Ver en YouTube: [url]"
  → Descarga archivo .pdf
```

---

## 5. Patrones de implementación (skeleton agnóstico)

### 5.1 Registro de secciones (kernel puro)

```javascript
// kernel/sectionRegistry.js — extraer de SPEED
export const SECTION_REGISTRY = [
  { key: "checklist",  order: 1, title: "Antes de empezar",       contentType: "structured" },
  { key: "conceptual", order: 2, title: "Fundamento conceptual",  contentType: "rich-text" },
  { key: "videos",     order: 3, title: "Videotutoriales",        contentType: "media-list" },
  { key: "practical",  order: 4, title: "Manos a la obra",        contentType: "rich-text" },
  { key: "pro",        order: 5, title: "Reto PRO",               contentType: "rich-text", optional: true },
  { key: "bridge",     order: 6, title: "Puente al aula",         contentType: "rich-text" },
  { key: "deliverable",order: 7, title: "Entregable y criterios", contentType: "structured" },
  { key: "closing",    order: 8, title: "Cierre y conexión",      contentType: "rich-text" },
];
```

### 5.2 Normalización de URLs (compartido editor + preview + PDF)

```javascript
// kernel/urlUtils.js — ya duplicado en RichEditor y MarkdownContent
export function normalizeUrl(url) {
  if (!url) return url;
  const t = url.trim();
  if (/^(https?:\/\/|mailto:|#|\/)/i.test(t)) return t;
  return `https://${t}`;
}
```

**Acción SPEED:** consolidar en `src/kernel/urlUtils.js` e importar desde ambos componentes.

### 5.3 Pipeline de renderizado de contenido

```
Markdown crudo
  → remark-gfm (tablas, listas, tachado)
  → rehype-raw (HTML embebido controlado)
  → componentes custom: a, iframe, span[style]
  → HTML seguro para web / input para PDF
```

### 5.4 Capa de permisos en componentes

```javascript
// kernel/permissions.js
export function useClassPermissions(role) {
  return {
    canEdit:       role === "designer",
    canChangeStatus: role === "designer",
    canPublish:    role === "designer" && role === "admin",
    canView:       true,
    canDownloadPdf: role !== "guest",
    readOnly:      role === "supervisor",
  };
}
```

---

## 6. Adaptabilidad a distintas plataformas

| Contexto | Qué reutilizar del kernel | Qué adaptar |
|----------|---------------------------|-------------|
| **Web SPA (SPEED)** | sectionRegistry, permissions, urlUtils, pdfExporter | React components, Supabase adapter |
| **Sitio estático** | sectionRegistry, markdown pipeline | Generador HTML (`siteGenerator.js`) |
| **LMS (Moodle)** | sectionRegistry, JSON de clase | Plugin PHP + export SCORM |
| **App interna** | Todo el dominio | ORM propio, UI nativa |
| **API headless** | domain + export | REST/GraphQL, sin UI |

**Regla:** nunca copiar `RichEditor.jsx` a otro proyecto; copiar `kernel/` y reimplementar el adaptador UI.

---

## 7. Mapa de implementación SPEED — estado actual

| Componente kernel | Estado | Archivo SPEED | Acción siguiente |
|-------------------|--------|---------------|------------------|
| RichContentEditor | ✅ Hecho | `RichEditor.jsx` | Extraer urlUtils al kernel |
| DualViewEditor (campo) | ✅ Hecho | `RichEditor` live mode | — |
| DualViewEditor (clase) | ⚠️ Parcial | `SessionEditor` toggle fullscreen | Agregar split view opcional |
| SectionManager | ⚠️ Parcial | `SECTION_META` + `EDITOR_TABS` | Unificar en `kernel/sectionRegistry.js` |
| CollapsibleSectionViewer | ✅ Hecho | `SessionPreview.jsx` | Reutilizar en sitio público |
| StatusVisualManager | ⚠️ Parcial | `StatusBadge`, `STATUS_CONFIG` | Colores amarillo/verde/azul + borde tarjeta |
| SortByDateEngine | ❌ Falta | `useSessions` usa `sort_order` | Campo ISO + sort dinámico |
| PdfSynthesisExporter | ❌ Falta | — | Crear con `@react-pdf/renderer` |
| PermissionGuard | ⚠️ Parcial | `readOnly` en UI | `kernel/permissions.js` + validación save |
| PublishPipeline | ❌ Falta | — | `siteGenerator.js` + `PublishButton.jsx` |

---

## 8. Plan de implementación dual (kernel + SPEED)

Trabajar en **dos carriles paralelos** que convergen:

```
Carril A — KERNEL (portable)          Carril B — SPEED (adaptador)
─────────────────────────────         ─────────────────────────────
1. src/kernel/sectionRegistry.js  →   Refactor SessionPreview + tabs
2. src/kernel/urlUtils.js         →   Import en RichEditor + MarkdownContent
3. src/kernel/permissions.js      →   Usar en App + SessionEditor
4. src/kernel/sortByDate.js       →   useSessions + migración SQL fecha ISO
5. src/kernel/statusManager.js    →   Actualizar STATUS_CONFIG + SessionRow CSS
6. src/kernel/pdfExporter.js      →   DownloadPdfButton en preview
7. (agnóstico)                    →   siteGenerator reutiliza sectionRegistry
```

### Orden sugerido para esta semana

1. **Extraer kernel** (`src/kernel/`) — 2 h, sin cambio visible para el usuario
2. **Estados visuales** — actualizar colores y bordes en tarjetas — 1 h
3. **Orden por fecha** — migración `scheduled_date_iso` + sort — 2 h
4. **PDF síntesis** — MVP con enlaces clicables — 3 h
5. **Publicación sitio** — reutiliza mismo registry y MarkdownContent — continúa plan del 22/06

---

## 9. Escalabilidad, mantenibilidad y extensibilidad

| Principio | Aplicación |
|-----------|------------|
| **Single source of truth** | `sectionRegistry` alimenta editor, preview, PDF y sitio público |
| **Contenido como Markdown** | portable entre web, PDF y LMS sin lock-in |
| **Permisos en 3 capas** | UI + app + RLS |
| **Adaptadores intercambiables** | Cambiar Supabase por Firebase sin tocar kernel |
| **Extensiones** | Nuevas secciones = nueva entrada en registry + tab opcional |
| **Versionado** | `edit_log` ya existe; extender con snapshots por publicación |

---

## 10. Referencias de código SPEED

```
src/
├── kernel/                          ← CREAR (núcleo portable)
│   ├── sectionRegistry.js
│   ├── urlUtils.js
│   ├── permissions.js
│   ├── sortByDate.js
│   ├── statusManager.js
│   └── pdfExporter.js
├── components/
│   ├── editor/
│   │   ├── SessionEditor.jsx        ← dual view clase, estados, permisos
│   │   └── fields/RichEditor.jsx    ← editor enriquecido + live preview
│   ├── preview/
│   │   ├── SessionPreview.jsx       ← vista estudiante colapsable
│   │   └── MarkdownContent.jsx      ← pipeline render + enlaces
│   ├── export/
│   │   └── DownloadPdfButton.jsx    ← CREAR
│   └── ui/StatusBadge.jsx           ← estados visuales
├── hooks/useSessions.js             ← persistencia + sort
└── utils/constants.js               ← STATUS_CONFIG, EDITOR_TABS
```

---

*Documento vivo. Actualizar al completar cada ítem del mapa de implementación.*
