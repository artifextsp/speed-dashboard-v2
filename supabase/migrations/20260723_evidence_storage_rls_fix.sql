-- ============================================================
-- Fix: las policies de storage.objects no pueden leer directamente
-- la tabla students como anon (RLS solo permite authenticated).
-- Se usa una función SECURITY DEFINER para validar el código.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_student_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM students s
    WHERE s.active = true AND s.student_code = p_code
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_student_code(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "anon upload own evidence" ON storage.objects;
CREATE POLICY "anon upload own evidence" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'bitacora-evidencias'
  AND public.is_active_student_code((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "anon read own evidence" ON storage.objects;
CREATE POLICY "anon read own evidence" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'bitacora-evidencias'
  AND public.is_active_student_code((storage.foldername(name))[1])
);
