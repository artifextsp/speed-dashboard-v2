-- ============================================================
-- PROYECTO SPEED — Esquema de Base de Datos Supabase
-- Autores: Hansel Peña Díaz & Diego Armando Córdoba Méndez
-- Fecha: Junio 2026
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA DE AUTORES (usuarios del dashboard)
-- ────────────────────────────────────────────────────────────
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'author')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. FASES ADCE
-- ────────────────────────────────────────────────────────────
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number INT NOT NULL UNIQUE CHECK (phase_number BETWEEN 1 AND 4),
  code TEXT NOT NULL UNIQUE,          -- 'A', 'D', 'C', 'E'
  title TEXT NOT NULL,                 -- 'Análisis', 'Diseño', etc.
  subtitle TEXT,                       -- 'Pensar antes de construir'
  objective TEXT,
  deliverable TEXT,                    -- Entregable de fase
  bridge_to_classroom TEXT,            -- Puente al aula de la fase
  color TEXT NOT NULL DEFAULT '#534AB7', -- Color temático de la fase
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. SESIONES (el corazón del curso)
-- ────────────────────────────────────────────────────────────
CREATE TYPE session_modality AS ENUM ('virtual', 'presencial', 'autonomo', 'hibrido');
CREATE TYPE session_status AS ENUM ('borrador', 'en_revision', 'publicado');
CREATE TYPE session_type AS ENUM ('sesion', 'actividad', 'encuentro');

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  assigned_author_id UUID REFERENCES authors(id),
  
  -- Encabezado (Sección 1 de la plantilla)
  session_number INT,                  -- NULL para actividades no numeradas
  session_type session_type NOT NULL DEFAULT 'sesion',
  title TEXT NOT NULL,
  modality session_modality NOT NULL,
  scheduled_date TEXT,                 -- Texto flexible: "7 de julio de 2026"
  duration_estimate TEXT,              -- "2 horas", "3 días", etc.
  learning_goal TEXT,                  -- "Lo que vas a lograr hoy"
  
  -- Sección 2: Antes de empezar (checklist)
  checklist_digital JSONB DEFAULT '[]'::jsonb,  -- [{item: "Instalar Arduino IDE", done: false}]
  checklist_physical JSONB DEFAULT '[]'::jsonb, -- [{item: "Arduino Uno + cable USB", done: false}]
  checklist_prior JSONB DEFAULT '[]'::jsonb,    -- [{item: "Ver video introductorio", url: "..."}]
  
  -- Sección 3: Fundamento conceptual
  conceptual_content TEXT,             -- Markdown del contenido teórico
  conceptual_references JSONB DEFAULT '[]'::jsonb, -- [{title, url, description}]
  
  -- Sección 4: Videotutoriales
  -- (tabla separada: session_videos)
  
  -- Sección 5: Manos a la obra
  practical_content TEXT,              -- Markdown de la actividad práctica
  practical_checkpoints JSONB DEFAULT '[]'::jsonb, -- [{step: 1, description: "Verifica que..."}]
  
  -- Sección 6: Reto PRO
  has_pro_challenge BOOLEAN DEFAULT false,
  pro_challenge_content TEXT,
  
  -- Sección 7: Puente al aula
  bridge_content TEXT,                 -- Markdown de transposición didáctica
  bridge_scenarios JSONB DEFAULT '[]'::jsonb, -- [{level: "Primaria baja", suggestion: "..."}]
  bridge_mini_deliverable TEXT,
  
  -- Sección 8: Entregable y criterios
  deliverable_description TEXT,
  deliverable_format TEXT,             -- "PDF", "Video + código", etc.
  deliverable_criteria JSONB DEFAULT '[]'::jsonb, -- [{criterion: "...", weight: "..."}]
  
  -- Sección 9: Cierre y conexión
  closing_summary TEXT,
  next_session_prep TEXT,
  
  -- Modo intercalado (concepto→práctica→concepto→práctica)
  -- Cuando se activa, el contenido se organiza en bloques alternados
  use_interleaved_mode BOOLEAN DEFAULT false,
  interleaved_blocks JSONB DEFAULT '[]'::jsonb, 
  -- [{type: "concepto"|"practica", title: "...", content: "..."}]
  
  -- Componentes dinámicos de la clase (nuevo modelo)
  class_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{id, name, description, content, sort_order}]
  
  -- Metadatos
  status session_status NOT NULL DEFAULT 'borrador',
  sort_order INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. VIDEOTUTORIALES POR SESIÓN
-- ────────────────────────────────────────────────────────────
CREATE TYPE video_timing AS ENUM ('antes', 'durante', 'referencia');

CREATE TABLE session_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  duration TEXT,                       -- "12:30"
  description TEXT,
  timing video_timing NOT NULL DEFAULT 'durante',
  author_id UUID REFERENCES authors(id),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. RECURSOS POR SESIÓN
-- ────────────────────────────────────────────────────────────
CREATE TYPE resource_type AS ENUM ('digital', 'fisico', 'descargable');

CREATE TABLE session_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  resource_type resource_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,                            -- Para recursos digitales/descargables
  file_path TEXT,                      -- Para archivos en Supabase Storage
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. IMÁGENES Y ARCHIVOS LIVIANOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE session_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  alt_text TEXT NOT NULL,
  storage_path TEXT NOT NULL,          -- Ruta en Supabase Storage
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 7. RÚBRICA GENERAL DEL CURSO
-- ────────────────────────────────────────────────────────────
CREATE TABLE rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion TEXT NOT NULL,
  max_points INT NOT NULL,
  excellent_description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 8. CONFIGURACIÓN DEL SITIO
-- ────────────────────────────────────────────────────────────
CREATE TABLE site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 9. ÍNDICES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_sessions_phase ON sessions(phase_id);
CREATE INDEX idx_sessions_author ON sessions(assigned_author_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_sort ON sessions(sort_order);
CREATE INDEX idx_videos_session ON session_videos(session_id);
CREATE INDEX idx_resources_session ON session_resources(session_id);
CREATE INDEX idx_images_session ON session_images(session_id);

-- ────────────────────────────────────────────────────────────
-- 10. TRIGGERS PARA updated_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_authors_updated
  BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_sessions_updated
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_site_config_updated
  BEFORE UPDATE ON site_config FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden leer todo
CREATE POLICY "Authenticated read all" ON authors
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read phases" ON phases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read sessions" ON sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read videos" ON session_videos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read resources" ON session_resources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read images" ON session_images
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read rubric" ON rubric_criteria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read config" ON site_config
  FOR SELECT TO authenticated USING (true);

-- Política: usuarios autenticados pueden escribir
-- (control más fino por rol se maneja en el frontend con verificación adicional)
CREATE POLICY "Authenticated write authors" ON authors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write phases" ON phases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write sessions" ON sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write videos" ON session_videos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write resources" ON session_resources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write images" ON session_images
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write rubric" ON rubric_criteria
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write config" ON site_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Política: lectura pública para el sitio (anon puede leer sesiones publicadas)
CREATE POLICY "Public read published sessions" ON sessions
  FOR SELECT TO anon USING (status = 'publicado');
CREATE POLICY "Public read phases" ON phases
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read videos" ON session_videos
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_videos.session_id AND sessions.status = 'publicado')
  );
CREATE POLICY "Public read resources" ON session_resources
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_resources.session_id AND sessions.status = 'publicado')
  );
CREATE POLICY "Public read images" ON session_images
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_images.session_id AND sessions.status = 'publicado')
  );
CREATE POLICY "Public read rubric" ON rubric_criteria
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read config" ON site_config
  FOR SELECT TO anon USING (true);

-- ────────────────────────────────────────────────────────────
-- 12. DATOS INICIALES — FASES ADCE
-- ────────────────────────────────────────────────────────────
INSERT INTO phases (phase_number, code, title, subtitle, objective, deliverable, bridge_to_classroom, color, sort_order) VALUES
(1, 'A', 'Análisis', 'Pensar antes de construir',
 'Investigar, planificar y organizar el proyecto del auto autónomo.',
 'Plan del proyecto (Gantt + Scrum) + informe de investigación IA + primer pseudocódigo y diagrama de estados.',
 '¿Cómo presento este reto y la planificación ágil a mis estudiantes según su nivel?',
 '#534AB7', 1),

(2, 'D', 'Diseño', 'Arquitectura y sentidos del robot',
 'Diseñar el sistema electrónico, mecánico y estructural del auto.',
 'Esquemático completo (Cirkit Designer) + circuito simulado (Tinkercad) + diseño 3D del chasis.',
 '¿Cómo enseño electrónica básica cuando no hay un kit por estudiante? Estrategias por simulación y laboratorio compartido.',
 '#1D9E75', 2),

(3, 'C', 'Construcción', 'Precisión en movimiento',
 'Ensamblar y programar el ciclo completo avance–detección–retorno.',
 'Video del ciclo completo (avance + detección/evitación + retorno) + código documentado con máquina de estados.',
 '¿Cómo andamio la programación por niveles (del bloque al texto, del control básico al PID) según el grado de mis estudiantes?',
 '#D85A30', 3),

(4, 'E', 'Evaluación', '¿Qué tan bueno es tu diseño?',
 'Probar en pista real, optimizar, documentar y exponer públicamente.',
 'Bitácora del ingeniero completa + pitch técnico 3 min + póster A1.',
 'Diseñar mi propia feria/competencia y rúbrica adaptada para mis estudiantes.',
 '#185FA5', 4);

-- ────────────────────────────────────────────────────────────
-- 13. DATOS INICIALES — SESIONES DEL TEMARIO
-- ────────────────────────────────────────────────────────────

-- Primero necesitamos los IDs de las fases
DO $$
DECLARE
  phase_a UUID;
  phase_d UUID;
  phase_c UUID;
  phase_e UUID;
BEGIN
  SELECT id INTO phase_a FROM phases WHERE code = 'A';
  SELECT id INTO phase_d FROM phases WHERE code = 'D';
  SELECT id INTO phase_c FROM phases WHERE code = 'C';
  SELECT id INTO phase_e FROM phases WHERE code = 'E';

  -- FASE 1 — ANÁLISIS
  INSERT INTO sessions (phase_id, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_a, 'actividad', 'Proceso de selección de docentes participantes', 'presencial',
   '14 al 31 de mayo de 2026', 'Seleccionar los docentes que participarán en el piloto.', 1),

  (phase_a, 'actividad', 'Sesión introductoria al piloto de robótica educativa', 'virtual',
   '11 de junio de 2026', 'Conocer el Proyecto SPEED, el reto integrador y el ciclo ADCE.', 2),

  (phase_a, 'encuentro', 'Encuentro Presencial 1 — Lanzamiento y préstamo de kits', 'presencial',
   '16 al 19 de junio de 2026', 'Recibir tu kit Arduino, conformar equipos y reconocer el hardware.', 3),

  (phase_a, 'sesion', 'Gestión ágil del proyecto: diagrama de Gantt y cuadros Scrum', 'virtual',
   '7 de julio de 2026', 'Organizar tu proyecto con herramientas ágiles y definir roles de equipo.', 4),

  (phase_a, 'sesion', 'Investigación técnica con IA: prompts estructurados para robótica', 'virtual',
   '9 de julio de 2026', 'Usar IA como herramienta de investigación técnica y crear tu primer pseudocódigo.', 5);

  -- Asignar session_number a las sesiones numeradas de Fase 1
  UPDATE sessions SET session_number = 1 WHERE title LIKE 'Gestión ágil%' AND phase_id = phase_a;
  UPDATE sessions SET session_number = 2 WHERE title LIKE 'Investigación técnica%' AND phase_id = phase_a;

  -- FASE 2 — DISEÑO
  INSERT INTO sessions (phase_id, session_number, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_d, 3, 'sesion', 'Electrónica de fundamentos: circuitos en serie y paralelo', 'virtual',
   '14 de julio de 2026', 'Comprender circuitos básicos y usar el multímetro para mediciones.', 6),

  (phase_d, 4, 'sesion', 'Arquitectura Arduino + motores DC y drivers L298N / TB6612FNG', 'virtual',
   '21 de julio de 2026', 'Dominar la arquitectura Arduino y el control de motores con drivers.', 7),

  (phase_d, 5, 'sesion', 'Los sentidos del robot: sensor ultrasónico HC-SR04', 'autonomo',
   '28 de julio de 2026', 'Integrar el sensor ultrasónico y crear el esquemático + diseño 3D del chasis.', 8);

  -- FASE 3 — CONSTRUCCIÓN
  INSERT INTO sessions (phase_id, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_c, 'encuentro', 'Encuentro Presencial 2 — Práctica intensiva de integración', 'presencial',
   '10 al 21 de agosto de 2026', 'Montar el robot real: motores, driver, sensor. Primeras pruebas en pista.', 9);

  INSERT INTO sessions (phase_id, session_number, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_c, 6, 'sesion', 'Arduino IDE: estructura del sketch (setup/loop), variables y tipos de datos', 'virtual',
   '4 de agosto de 2026', 'Escribir tu primer sketch Arduino con condicionales y bucles.', 10),

  (phase_c, 7, 'sesion', 'Control de motores DC con PWM: analogWrite() y driver', 'virtual',
   '6 de agosto de 2026', 'Controlar velocidad y dirección de motores, y leer el sensor HC-SR04.', 11),

  (phase_c, 8, 'sesion', 'Integración sensor + motores: máquina de estados finitos', 'virtual',
   '25 de agosto de 2026', 'Programar la lógica completa: avance → detección → evitación → retorno.', 12),

  (phase_c, 9, 'sesion', 'Lógica de retorno al punto de partida por tiempo y velocidad', 'autonomo',
   '31 de agosto al 4 de septiembre de 2026', 'Completar el código y hacer la primera prueba en pista de 7 m.', 13),

  (phase_c, 10, 'sesion', 'Reto PRO opcional: PID + odometría con encoders', 'virtual',
   '8 de septiembre de 2026', 'Implementar control PID y fusión de sensores (para equipos avanzados).', 14);

  -- Marcar sesión 10 como PRO challenge
  UPDATE sessions SET has_pro_challenge = true WHERE session_number = 10 AND phase_id = phase_c;

  -- FASE 4 — EVALUACIÓN
  INSERT INTO sessions (phase_id, session_number, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_e, 11, 'sesion', 'Variables de configuración y análisis de rendimiento', 'virtual',
   '10 de septiembre de 2026', 'Optimizar tu robot mediante pruebas sistemáticas y análisis estadístico.', 15),

  (phase_e, 12, 'sesion', 'Bitácora del ingeniero: documentación técnica profesional', 'autonomo',
   '15 al 18 de septiembre de 2026', 'Documentar tu proyecto completo con las 8 secciones de la bitácora.', 16);

  INSERT INTO sessions (phase_id, session_type, title, modality, scheduled_date, learning_goal, sort_order) VALUES
  (phase_e, 'encuentro', 'Encuentro Presencial 3 — Demostración y competencia en pista', 'presencial',
   '21 de septiembre al 2 de octubre de 2026', 'Competir en pista, presentar tu pitch técnico y recibir retroalimentación.', 17),

  (phase_e, 'actividad', 'Feria Pública STEAM — Cierre del piloto', 'presencial',
   '23 de octubre de 2026', 'Presentar tu proyecto al público: pitch + póster A1.', 18),

  (phase_e, 'actividad', 'Devolución de kits de robótica', 'presencial',
   '26 al 30 de octubre de 2026', 'Devolver los kits de robótica en buen estado.', 19),

  (phase_e, 'actividad', 'Elaboración documental, reportes finales y sistematización', 'hibrido',
   'Noviembre de 2026', 'Sistematizar la experiencia del piloto y elaborar reportes finales.', 20);

END $$;

-- ────────────────────────────────────────────────────────────
-- 14. DATOS INICIALES — RÚBRICA
-- ────────────────────────────────────────────────────────────
INSERT INTO rubric_criteria (criterion, max_points, excellent_description, sort_order) VALUES
('Funcionamiento — ida (recta + obstáculos)', 20, 'Completa sin choques', 1),
('Funcionamiento — vuelta (recta + obstáculos)', 20, 'Completa sin choques', 2),
('Precisión final (error de posición)', 15, '≤ 10 cm', 3),
('Control (básico por tiempo/vel. o PID)', 15, 'Bien sintonizado y estable', 4),
('Calidad del código (estructura, comentarios)', 10, 'Limpio, modular, con máquina de estados', 5),
('Integración y fusión de sensores (opcional)', 10, 'Manejo adecuado del ruido', 6),
('Bitácora técnica', 10, 'Completa, profesional y con reflexión pedagógica', 7);

-- ────────────────────────────────────────────────────────────
-- 15. CONFIGURACIÓN INICIAL DEL SITIO
-- ────────────────────────────────────────────────────────────
INSERT INTO site_config (key, value) VALUES
('site_title', '"Proyecto SPEED — Piloto de Robótica Educativa"'),
('site_subtitle', '"Corporación Universitaria UNIMINUTO · 2026"'),
('authors_display', '["Diego Armando Córdoba Méndez", "Hansel Peña Díaz"]'),
('github_repo', '"artifextsp/PILOTO"'),
('challenge_description', '"Diseñar, construir y programar un vehículo autónomo con Arduino capaz de recorrer una pista de 7 metros, detectar y evitar el obstáculo al fondo, y regresar al punto de partida en el menor tiempo posible."');

-- ────────────────────────────────────────────────────────────
-- 16. BUCKET DE STORAGE PARA IMÁGENES
-- ────────────────────────────────────────────────────────────
-- Ejecutar esto en el SQL Editor de Supabase:
INSERT INTO storage.buckets (id, name, public)
VALUES ('speed-assets', 'speed-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política de lectura pública
CREATE POLICY "Public read speed-assets"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'speed-assets');

-- Política de escritura para autenticados
CREATE POLICY "Auth write speed-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'speed-assets');

CREATE POLICY "Auth update speed-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'speed-assets');

CREATE POLICY "Auth delete speed-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'speed-assets');
