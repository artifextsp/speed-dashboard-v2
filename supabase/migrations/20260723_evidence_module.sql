-- ============================================================
-- Módulo de bitácora digital de evidencias
-- ============================================================

DO $$ BEGIN
  CREATE TYPE evidence_status AS ENUM (
    'pendiente',
    'aprobada',
    'rechazada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS student_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT NOT NULL,
  status evidence_status NOT NULL DEFAULT 'pendiente',
  reviewer_comment TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_evidence_student_id_idx
  ON student_evidence (student_id);
CREATE INDEX IF NOT EXISTS student_evidence_status_idx
  ON student_evidence (status);
CREATE INDEX IF NOT EXISTS student_evidence_created_at_idx
  ON student_evidence (created_at DESC);

CREATE OR REPLACE FUNCTION student_evidence_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_evidence_touch_updated_at ON student_evidence;
CREATE TRIGGER student_evidence_touch_updated_at
  BEFORE UPDATE ON student_evidence
  FOR EACH ROW
  EXECUTE FUNCTION student_evidence_before_update();

ALTER TABLE student_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_evidence_auth_all ON student_evidence;
CREATE POLICY student_evidence_auth_all ON student_evidence
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- Bucket de Storage (privado, con límite de tamaño y tipos)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bitacora-evidencias',
  'bitacora-evidencias',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "anon upload own evidence" ON storage.objects;
CREATE POLICY "anon upload own evidence" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'bitacora-evidencias'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.active = true
      AND s.student_code = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "anon read own evidence" ON storage.objects;
CREATE POLICY "anon read own evidence" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'bitacora-evidencias'
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.active = true
      AND s.student_code = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "authenticated manage evidence storage" ON storage.objects;
CREATE POLICY "authenticated manage evidence storage" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'bitacora-evidencias')
WITH CHECK (bucket_id = 'bitacora-evidencias');

-- ============================================================
-- RPC: registrar evidencia subida (anon)
-- ============================================================

CREATE OR REPLACE FUNCTION register_student_evidence(
  p_student_code CHAR(4),
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_size INT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_entry RECORD;
BEGIN
  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  IF p_file_path IS NULL OR btrim(p_file_path) = '' THEN
    RETURN jsonb_build_object('error', 'Ruta de archivo no válida');
  END IF;

  IF NOT (split_part(p_file_path, '/', 1) = p_student_code) THEN
    RETURN jsonb_build_object('error', 'La ruta del archivo no corresponde a tu código');
  END IF;

  INSERT INTO student_evidence (
    student_id, title, description, file_name, file_path, file_type, file_size
  ) VALUES (
    v_student_id,
    NULLIF(btrim(p_title), ''),
    NULLIF(btrim(p_description), ''),
    p_file_name,
    p_file_path,
    p_file_type,
    p_file_size
  )
  RETURNING * INTO v_entry;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_entry.id,
    'created_at', v_entry.created_at
  );
END;
$$;

-- ============================================================
-- RPC: historial de evidencia del propio estudiante (anon)
-- ============================================================

CREATE OR REPLACE FUNCTION fetch_my_evidence(p_student_code CHAR(4))
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  file_name TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INT,
  status evidence_status,
  reviewer_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  SELECT s.id INTO v_student_id
  FROM students s
  WHERE s.student_code = p_student_code AND s.active = true;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Código de estudiante no válido';
  END IF;

  RETURN QUERY
  SELECT
    e.id, e.title, e.description, e.file_name, e.file_path, e.file_type,
    e.file_size, e.status, e.reviewer_comment, e.reviewed_at, e.created_at
  FROM student_evidence e
  WHERE e.student_id = v_student_id
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION register_student_evidence(CHAR(4), TEXT, TEXT, TEXT, INT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_my_evidence(CHAR(4)) TO anon, authenticated;
