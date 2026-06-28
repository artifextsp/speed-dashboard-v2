-- Bloques didácticos flexibles y asignación opcional de clases
ALTER TABLE phases DROP CONSTRAINT IF EXISTS phases_phase_number_check;
ALTER TABLE phases ALTER COLUMN phase_number DROP NOT NULL;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_phase_id_fkey;
ALTER TABLE sessions ALTER COLUMN phase_id DROP NOT NULL;
ALTER TABLE sessions ADD CONSTRAINT sessions_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL;

UPDATE phases SET color = '#534AB7' WHERE code = 'A';
UPDATE phases SET color = '#1D9E75' WHERE code = 'D';
UPDATE phases SET color = '#D85A30' WHERE code = 'C';
UPDATE phases SET color = '#185FA5' WHERE code = 'E';
