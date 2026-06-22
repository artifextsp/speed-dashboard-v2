# PROYECTO SPEED — Contexto completo para desarrollo

## Instrucciones para el AI

Eres el desarrollador principal de **Proyecto SPEED**, un sistema CMS colaborativo + sitio público para un curso de robótica educativa. Este documento contiene TODAS las decisiones tomadas, la arquitectura aprobada y el estado actual del desarrollo. Léelo completo antes de hacer cualquier pregunta o escribir código.

El dueño del proyecto es **Hansel Peña Díaz**, docente de robótica y STEAM. Habla español. Prefiere entregas completas, copy-paste-ready, en español. Código inline, sin documentación excesiva. Es técnicamente competente (Mac M4, maneja Arduino, Git, Supabase, React).

---

## 1. ¿Qué es Proyecto SPEED?

Un **piloto de robótica educativa** para docentes de Bogotá, operado a través de la Corporación Universitaria UNIMINUTO.

- **Autores del curso:** Hansel Peña Díaz y Diego Armando Córdoba Méndez
- **Reto integrador:** Diseñar, construir y programar un vehículo autónomo con Arduino capaz de recorrer una pista de 7 metros, detectar y evitar un obstáculo al fondo, y regresar al punto de partida en el menor tiempo posible.
- **Estructura:** 4 Fases (ciclo ADCE: Análisis → Diseño → Construcción → Evaluación)
- **Contenido:** 12 sesiones virtuales/autónomas + 3 encuentros presenciales + cierre híbrido = 20 ítems totales
- **Modalidad:** Híbrida (virtual + presencial + autónomo)
- **Eje transversal:** Transferencia didáctica ("Puente al aula") — cada docente debe poder traducir lo aprendido a su propio contexto escolar
- **Hardware:** Arduino Uno, TB6612FNG/L298N, HC-SR04, motores DC
- **Nivel técnico:** Intermedio escalonado — control básico primero, PID como reto opcional/avanzado

---

## 2. Arquitectura del sistema

El sistema tiene **4 componentes**:

### 2.1 Supabase (backend)
- **URL:** `https://nbujvnrroerixivrmtxd.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idWp2bnJyb2VyaXhpdnJtdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM2NjUsImV4cCI6MjA5NzY0OTY2NX0.PqxtPsfExA_8BcXRIRmFz0ikcH7J_rNx4K0LKgcqaYY`
- **Funciones:** Auth (login email+password para Hansel y Diego), base de datos PostgreSQL con RLS, Storage para imágenes livianas
- **NOTA:** La service_role key NO debe estar en el código frontend. Solo la anon key.

### 2.2 Dashboard (app React — este es el producto principal a desarrollar)
- **Despliegue:** GitHub Pages u otro hosting estático gratuito (Vercel/Netlify)
- **Framework:** React (con hooks, componentes funcionales)
- **Función:** CMS colaborativo donde Hansel y Diego editan las guías del curso
- **Acceso:** Login con email+password vía Supabase Auth. Diego NO tiene cuenta GitHub — accede solo vía el dashboard web
- **Cada autor trabaja sobre las sesiones que le corresponde dictar**

### 2.3 Sitio público en GitHub Pages
- **Repo:** `https://github.com/artifextsp/PILOTO`
- **Función:** Lo que ven los docentes-estudiantes del curso
- **Generación:** El dashboard genera los archivos HTML/MD y hace push al repo vía GitHub API
- **Contenido:** Solo sesiones marcadas como "publicado" en el dashboard

### 2.4 YouTube (almacenamiento de videos)
- **No se almacenan videos en Supabase** — Storage tiene límites de espacio y ancho de banda
- **Cada autor sube videos a su propio canal de YouTube**
- **El dashboard solo guarda la URL de YouTube** y la embebe en el sitio público
- **Decisión firme:** Esta es la arquitectura correcta desde el punto de vista técnico (CDN global, calidad adaptativa, almacenamiento ilimitado gratuito)

### 2.5 Canal institucional (no se desarrolla, solo referencia)
- **Google Classroom o Microsoft Teams** — requisito de la Secretaría de Educación de Bogotá
- Se usa para compromisos, entregas y comunicación formal
- NO es parte del desarrollo de este proyecto

---

## 3. Plantilla maestra de la guía didáctica (9 secciones)

Cada sesión del curso sigue esta estructura. El dashboard debe tener un editor para cada sección.

### Sección 1: Encabezado de sesión
- Número de sesión, título, fase ADCE, modalidad (virtual/presencial/autónomo), fecha, duración estimada
- Frase "lo que vas a lograr hoy" (objetivo de aprendizaje en lenguaje directo)
- **Siempre fijo, no cambia entre tipos de sesión**

### Sección 2: Antes de empezar (checklist de preparación)
- Lista de requisitos previos: software instalado, componentes físicos, lectura/video previo
- Diferencia entre recursos digitales y recursos físicos
- En sesiones conceptuales: checklist corto. En sesiones de construcción: incluye componentes específicos

### Sección 3: Fundamento conceptual
- Explicación teórica en Markdown con ejemplos, analogías, diagramas
- Referencias externas para profundizar
- **Extensión variable:** protagonista en sesiones conceptuales (60%), breve en sesiones prácticas
- En encuentros presenciales puede ser mínima o ausente

### Sección 4: Videotutoriales
- Videos embebidos de YouTube (URLs)
- Cada video tiene: título, duración, descripción, y timing (antes/durante/referencia)
- El número de videos varía por sesión

### Sección 5: Manos a la obra (actividad práctica guiada)
- Actividad central paso a paso en Markdown
- Código con explicación, diagramas de conexión, fotos de referencia
- **Checkpoints intermedios** para verificar progreso
- **MODO INTERCALADO:** Opción de alternar concepto→práctica→concepto→práctica cuando la sesión lo requiera (toggle boolean + bloques JSONB)

### Sección 6: Reto PRO (opcional/avanzado)
- Toggle: la sesión tiene o no tiene Reto PRO
- Extensión para docentes que terminaron antes (PID, sensores extra, optimización)
- No todas las sesiones lo tienen — cuando no hay, la sección no aparece

### Sección 7: Puente al aula — Transposición didáctica
- Reflexión guiada + actividad concreta
- **Escenarios por nivel:** primaria baja, primaria alta, secundaria
- Adaptaciones para contextos sin kits suficientes
- **Mini-entregable** (párrafo en bitácora, borrador de actividad, esquema)
- **Este es el diferencial del curso** — sin esta sección, el docente aprende para sí; con ella, aprende a enseñar

### Sección 8: Entregable y criterios
- Qué entregar, en qué formato, por dónde subirlo
- 3-4 criterios de aceptación claros (no rúbrica compleja)
- Contribución al entregable de fase

### Sección 9: Cierre y conexión con la próxima sesión
- Resumen breve de lo logrado
- Conexión con lo que viene después
- Qué preparar para la siguiente sesión
- **Siempre breve**

---

## 4. Esquema de base de datos

El archivo `speed-schema.sql` contiene el esquema completo. Resumen de tablas:

| Tabla | Propósito |
|-------|-----------|
| `authors` | Usuarios del dashboard (Hansel, Diego). Login vía Supabase Auth |
| `phases` | Las 4 fases ADCE con colores, objetivos, entregables de fase |
| `sessions` | Las 20 sesiones/actividades/encuentros con las 9 secciones como campos |
| `session_videos` | Videotutoriales de YouTube por sesión (título, URL, timing, duración) |
| `session_resources` | Recursos digitales, físicos y descargables por sesión |
| `session_images` | Imágenes livianas en Supabase Storage (esquemáticos, fotos) |
| `rubric_criteria` | Rúbrica de evaluación del reto final (100 pts, 7 criterios) |
| `site_config` | Metadatos del sitio (título, autores, repo, descripción del reto) |

### Tipos ENUM creados:
- `session_modality`: virtual, presencial, autonomo, hibrido
- `session_status`: borrador, en_revision, publicado
- `session_type`: sesion, actividad, encuentro
- `video_timing`: antes, durante, referencia
- `resource_type`: digital, fisico, descargable

### RLS (Row Level Security):
- **Autenticados** (Hansel y Diego): lectura y escritura completa
- **Anónimos** (sitio público): solo lectura de sesiones con status='publicado' y sus recursos asociados

### Datos precargados:
- 4 fases ADCE con colores (#534AB7 Análisis, #1D9E75 Diseño, #D85A30 Construcción, #185FA5 Evaluación)
- 20 sesiones del temario con títulos, fechas, modalidad y objectives
- 7 criterios de rúbrica
- Configuración inicial del sitio
- Bucket de Storage `speed-assets`

---

## 5. Estado actual del desarrollo

### ✅ Completado
- [x] Diseño pedagógico: plantilla maestra de 9 secciones aprobada
- [x] Decisiones de arquitectura: Supabase + React + GitHub Pages + YouTube
- [x] Esquema SQL completo (`speed-schema.sql`) — listo para ejecutar en Supabase
- [x] Dashboard React v1 (`SpeedDashboard.jsx`) — prototipo funcional con:
  - Login/signup con Supabase Auth
  - Vista panorámica con stats y cards de fase con progreso
  - Lista de sesiones filtrable por fase
  - Editor de sesiones con 9 pestañas (una por sección de la plantilla)
  - Editores JSONB para listas (checklists, criterios, escenarios, videos)
  - Sistema de estados (borrador/en_revision/publicado)
  - Toast de confirmación
  - Guardado en Supabase

### 🔲 Pendiente (en orden de prioridad)
1. **Depuración del dashboard** — El prototipo JSX necesita convertirse a un proyecto React real (create-react-app, Vite, o Next.js) con routing, manejo de errores robusto, y testing
2. **Asignación de sesiones por autor** — UI para que cada autor vea y edite solo sus sesiones asignadas (el campo `assigned_author_id` ya existe en la BD)
3. **Preview de sesión** — Vista previa de cómo se verá la sesión publicada en el sitio
4. **Motor de publicación** — Botón "Publicar al sitio" que:
   - Toma las sesiones con status='publicado' de Supabase
   - Genera archivos HTML con la plantilla del sitio
   - Hace commit + push al repo `artifextsp/PILOTO` vía GitHub API
   - Requiere un GitHub Personal Access Token (PAT) de Hansel, almacenado de forma segura
5. **Sitio público** — Plantilla HTML/CSS responsive con:
   - Identidad visual SPEED (colores por fase ADCE)
   - Navegación por fases → sesiones
   - Rendering de las 9 secciones por sesión
   - Videos de YouTube embebidos
   - Links a recursos
   - Responsive (docentes acceden desde móvil)
   - PDF descargable por sesión
6. **Gestión de imágenes** — Upload a Supabase Storage desde el dashboard
7. **Roles y permisos** — Control más fino: admin (Hansel) vs author (Diego)

---

## 6. Temario completo del curso

### Fase 1 — Análisis · "Pensar antes de construir"
**Objetivo:** Investigar, planificar y organizar el proyecto del auto autónomo.

| # | Tipo | Título | Modalidad | Fecha |
|---|------|--------|-----------|-------|
| — | Actividad | Proceso de selección de docentes | Presencial | 14-31 may 2026 |
| — | Actividad | Sesión introductoria al piloto | Virtual | 11 jun 2026 |
| — | Encuentro | EP1 — Lanzamiento y préstamo de kits | Presencial | 16-19 jun 2026 |
| 1 | Sesión | Gestión ágil: Gantt y Scrum | Virtual | 7 jul 2026 |
| 2 | Sesión | Investigación técnica con IA: prompts estructurados | Virtual | 9 jul 2026 |

**Entregable de fase:** Plan del proyecto (Gantt + Scrum) + informe de investigación IA + primer pseudocódigo y diagrama de estados.
**Puente al aula:** ¿Cómo presento este reto y la planificación ágil a mis estudiantes según su nivel?

### Fase 2 — Diseño · "Arquitectura y sentidos del robot"
**Objetivo:** Diseñar el sistema electrónico, mecánico y estructural del auto.

| # | Tipo | Título | Modalidad | Fecha |
|---|------|--------|-----------|-------|
| 3 | Sesión | Electrónica de fundamentos: circuitos serie/paralelo | Virtual | 14 jul 2026 |
| 4 | Sesión | Arquitectura Arduino + motores DC y drivers | Virtual | 21 jul 2026 |
| 5 | Sesión | Los sentidos del robot: sensor HC-SR04 | Autónomo | 28 jul 2026 |

**Entregable de fase:** Esquemático (Cirkit Designer) + circuito simulado (Tinkercad) + diseño 3D del chasis.
**Puente al aula:** ¿Cómo enseño electrónica básica sin kit por estudiante?

### Fase 3 — Construcción · "Precisión en movimiento"
**Objetivo:** Ensamblar y programar el ciclo completo avance–detección–retorno.

| # | Tipo | Título | Modalidad | Fecha |
|---|------|--------|-----------|-------|
| — | Encuentro | EP2 — Práctica intensiva de integración | Presencial | 10-21 ago 2026 |
| 6 | Sesión | Arduino IDE: setup/loop, variables, condicionales | Virtual | 4 ago 2026 |
| 7 | Sesión | Control de motores con PWM + lectura HC-SR04 | Virtual | 6 ago 2026 |
| 8 | Sesión | Integración: máquina de estados finitos | Virtual | 25 ago 2026 |
| 9 | Sesión | Lógica de retorno por tiempo/velocidad | Autónomo | 31 ago-4 sep 2026 |
| 10 | Sesión | Reto PRO: PID + odometría (opcional) | Virtual | 8 sep 2026 |

**Entregable de fase:** Video del ciclo completo + código documentado con máquina de estados.
**Puente al aula:** ¿Cómo andamio la programación por niveles según el grado?

### Fase 4 — Evaluación · "¿Qué tan bueno es tu diseño?"
**Objetivo:** Probar en pista real, optimizar, documentar y exponer.

| # | Tipo | Título | Modalidad | Fecha |
|---|------|--------|-----------|-------|
| 11 | Sesión | Variables de configuración y análisis de rendimiento | Virtual | 10 sep 2026 |
| 12 | Sesión | Bitácora del ingeniero: documentación técnica | Autónomo | 15-18 sep 2026 |
| — | Encuentro | EP3 — Demostración y competencia en pista | Presencial | 21 sep-2 oct 2026 |
| — | Actividad | Feria Pública STEAM — Cierre del piloto | Presencial | 23 oct 2026 |
| — | Actividad | Devolución de kits | Presencial | 26-30 oct 2026 |
| — | Actividad | Reportes finales y sistematización | Híbrido | Nov 2026 |

**Entregable de fase:** Bitácora del ingeniero completa + pitch técnico 3 min + póster A1.

### Rúbrica de evaluación (100 puntos)

| Criterio | Pts | Excelente |
|----------|-----|-----------|
| Funcionamiento ida | 20 | Completa sin choques |
| Funcionamiento vuelta | 20 | Completa sin choques |
| Precisión final | 15 | ≤ 10 cm error |
| Control | 15 | Bien sintonizado y estable |
| Calidad del código | 10 | Limpio, modular, máquina de estados |
| Fusión de sensores (opc.) | 10 | Manejo adecuado del ruido |
| Bitácora técnica | 10 | Completa, profesional, reflexión pedagógica |

### Ejes transversales
1. **IA como copiloto:** investigación técnica y depuración con prompts estructurados
2. **Bitácora del ingeniero:** documentación acumulativa (8 secciones)
3. **Puente al aula:** transferencia didáctica en cada fase
4. **Modalidad híbrida:** virtual + presencial + autónomo

---

## 7. Decisiones de diseño visual

### Colores por fase ADCE
| Fase | Código | Color principal | Color de fondo |
|------|--------|----------------|----------------|
| Análisis | A | #534AB7 (púrpura) | #EEEDFE |
| Diseño | D | #1D9E75 (teal) | #E1F5EE |
| Construcción | C | #D85A30 (coral) | #FAECE7 |
| Evaluación | E | #185FA5 (azul) | #E6F1FB |

### Estados de sesión
| Estado | Color | Fondo |
|--------|-------|-------|
| Borrador | #888780 | #F1EFE8 |
| En revisión | #BA7517 | #FAEEDA |
| Publicado | #639922 | #EAF3DE |

### Principios de diseño del dashboard
- Limpio, funcional, sin decoración innecesaria
- Usa iconos Tabler (ya cargados en el prototipo)
- Tipografía: sistema (sans-serif nativo)
- Responsive: debe funcionar en laptop y tablet
- Dark mode: usar CSS variables cuando sea posible

### Principios del sitio público
- Navegación clara: Fases → Sesiones
- Videos embebidos de YouTube (iframe responsive)
- Las 9 secciones renderizadas con íconos/colores por tipo
- PDF descargable por sesión
- Mobile-first (docentes acceden desde celular)

---

## 8. Archivos desarrollados que debes cargar

### `speed-schema.sql`
- Esquema completo de Supabase (tablas, enums, índices, triggers, RLS, datos iniciales)
- **Acción:** Ejecutar en Supabase SQL Editor antes de iniciar el desarrollo del dashboard
- **IMPORTANTE:** Ejecutar completo de una sola vez

### `SpeedDashboard.jsx`
- Prototipo funcional del dashboard en React (componente único)
- **Acción:** Usar como base/referencia para el proyecto React real
- **Limitaciones del prototipo:**
  - Es un componente monolítico — necesita descomponerse en archivos separados
  - Importa Supabase desde ESM CDN — en el proyecto real usar npm
  - No tiene routing — el proyecto real debería tener rutas
  - Los estilos son inline — migrar a CSS modules o Tailwind según preferencia
  - No tiene manejo de errores robusto
  - No tiene tests

### `temario_uniminuto.md`
- Temario oficial del curso completo
- **Acción:** Cargar como referencia, no modificar

---

## 9. Setup del proyecto recomendado

```bash
# Crear proyecto con Vite + React
npm create vite@latest speed-dashboard -- --template react
cd speed-dashboard

# Dependencias
npm install @supabase/supabase-js react-router-dom react-markdown

# Opcional pero recomendado
npm install @tabler/icons-react    # Iconos
npm install tailwindcss @tailwindcss/forms  # Si prefieres Tailwind
```

### Estructura de carpetas sugerida
```
speed-dashboard/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Cliente Supabase
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx
│   │   ├── dashboard/
│   │   │   ├── PhaseCard.jsx
│   │   │   ├── SessionRow.jsx
│   │   │   ├── StatsBar.jsx
│   │   │   └── DashboardView.jsx
│   │   ├── editor/
│   │   │   ├── SessionEditor.jsx
│   │   │   ├── tabs/
│   │   │   │   ├── HeaderTab.jsx
│   │   │   │   ├── ChecklistTab.jsx
│   │   │   │   ├── ConceptualTab.jsx
│   │   │   │   ├── VideosTab.jsx
│   │   │   │   ├── PracticalTab.jsx
│   │   │   │   ├── ProChallengeTab.jsx
│   │   │   │   ├── BridgeTab.jsx
│   │   │   │   ├── DeliverableTab.jsx
│   │   │   │   └── ClosingTab.jsx
│   │   │   └── fields/
│   │   │       ├── FieldInput.jsx
│   │   │       ├── FieldArea.jsx
│   │   │       ├── ListEditor.jsx
│   │   │       └── VideoEditor.jsx
│   │   ├── publish/
│   │   │   └── PublishButton.jsx
│   │   └── ui/
│   │       ├── StatusBadge.jsx
│   │       └── Toast.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useSessions.js
│   │   └── usePhases.js
│   ├── utils/
│   │   ├── constants.js          # Colores, labels, config
│   │   └── siteGenerator.js      # Genera HTML del sitio público
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── site-template/            # Template HTML del sitio público
├── speed-schema.sql              # Referencia
├── temario_uniminuto.md          # Referencia
└── package.json
```

---

## 10. Notas de seguridad

- **Nunca poner en el código:** service_role key de Supabase, GitHub Personal Access Token en texto plano
- **La anon key SÍ va en el frontend** — es pública por diseño (el RLS protege los datos)
- **El GitHub PAT** para publicación se debe manejar como variable de entorno o almacenarse cifrado en Supabase (tabla aparte con acceso restringido)
- **Auth:** Supabase Auth con email+password. Considerar desactivar "Confirm email" en desarrollo

---

## 11. Flujo de trabajo completo (objetivo final)

```
Hansel/Diego abren el dashboard en el navegador
    → Login con email + contraseña (Supabase Auth)
    → Ven el panorama: fases, progreso, sesiones
    → Seleccionan una sesión asignada a ellos
    → Editan las 9 secciones (Markdown, videos YouTube, checklists, etc.)
    → Guardan como "borrador" o "en revisión"
    → Cuando está lista, cambian a "publicado"
    → Click en "Publicar al sitio"
    → El sistema genera el HTML y hace push a GitHub
    → GitHub Pages se actualiza automáticamente
    → Los docentes-estudiantes ven el contenido nuevo en el sitio
```
