-- Fecha ISO para ordenar clases de forma fiable
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS scheduled_date_iso DATE;

CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_date_iso
  ON sessions (scheduled_date_iso);
