-- ============================================================
-- Módulo de llamado a lista (asistencia)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'presente',
    'ausente',
    'ausente_excusa'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  email TEXT,
  student_code CHAR(4) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT students_id_number_unique UNIQUE (id_number)
);

CREATE TABLE IF NOT EXISTS attendance_roll_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  label TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_roll_calls_session_id_idx
  ON attendance_roll_calls (session_id);
CREATE INDEX IF NOT EXISTS attendance_roll_calls_taken_at_idx
  ON attendance_roll_calls (taken_at DESC);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_call_id UUID NOT NULL REFERENCES attendance_roll_calls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'ausente',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (roll_call_id, student_id)
);

CREATE INDEX IF NOT EXISTS attendance_records_roll_call_id_idx
  ON attendance_records (roll_call_id);
CREATE INDEX IF NOT EXISTS attendance_records_student_id_idx
  ON attendance_records (student_id);

CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS CHAR(4)
LANGUAGE plpgsql
AS $$
DECLARE
  new_code CHAR(4);
  attempts INT := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 200 THEN
      RAISE EXCEPTION 'No se pudo generar un código único de 4 dígitos';
    END IF;
    new_code := lpad((floor(random() * 10000))::INT::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM students WHERE student_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION students_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.student_code IS NULL OR btrim(NEW.student_code) = '' THEN
    NEW.student_code := generate_student_code();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION students_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_set_code ON students;
CREATE TRIGGER students_set_code
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION students_before_insert();

DROP TRIGGER IF EXISTS students_touch_updated_at ON students;
CREATE TRIGGER students_touch_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION students_before_update();

CREATE OR REPLACE VIEW attendance_public AS
SELECT
  rc.id AS roll_call_id,
  rc.session_id,
  rc.label AS roll_call_label,
  rc.taken_at,
  s.title AS session_title,
  s.session_number,
  st.student_code,
  ar.status,
  ar.updated_at AS record_updated_at
FROM attendance_roll_calls rc
JOIN sessions s ON s.id = rc.session_id
JOIN attendance_records ar ON ar.roll_call_id = rc.id
JOIN students st ON st.id = ar.student_id
WHERE st.active = true;

CREATE OR REPLACE FUNCTION fetch_public_attendance(p_session_id UUID DEFAULT NULL)
RETURNS TABLE (
  roll_call_id UUID,
  session_id UUID,
  roll_call_label TEXT,
  taken_at TIMESTAMPTZ,
  session_title TEXT,
  session_number INT,
  student_code CHAR(4),
  status attendance_status,
  record_updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ap.roll_call_id,
    ap.session_id,
    ap.roll_call_label,
    ap.taken_at,
    ap.session_title,
    ap.session_number,
    ap.student_code,
    ap.status,
    ap.record_updated_at
  FROM attendance_public ap
  WHERE p_session_id IS NULL OR ap.session_id = p_session_id
  ORDER BY ap.taken_at DESC, ap.student_code;
$$;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_roll_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_auth_all ON students;
CREATE POLICY students_auth_all ON students
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS roll_calls_auth_all ON attendance_roll_calls;
CREATE POLICY roll_calls_auth_all ON attendance_roll_calls
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS records_auth_all ON attendance_records;
CREATE POLICY records_auth_all ON attendance_records
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON attendance_public TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_public_attendance(UUID) TO anon, authenticated;
