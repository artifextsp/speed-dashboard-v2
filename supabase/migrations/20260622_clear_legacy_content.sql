-- Limpia contenido del esquema antiguo (9 secciones fijas).
-- Preserva la sesión introductoria ya trabajada por el diseñador.
-- Ejecutado: 2026-06-22

UPDATE public.sessions
SET
  class_components = '[]'::jsonb,
  checklist_digital = '[]'::jsonb,
  checklist_physical = '[]'::jsonb,
  checklist_prior = '[]'::jsonb,
  conceptual_content = NULL,
  conceptual_references = '[]'::jsonb,
  practical_content = NULL,
  practical_checkpoints = '[]'::jsonb,
  has_pro_challenge = false,
  pro_challenge_content = NULL,
  bridge_content = NULL,
  bridge_scenarios = '[]'::jsonb,
  bridge_mini_deliverable = NULL,
  deliverable_description = NULL,
  deliverable_format = NULL,
  deliverable_criteria = '[]'::jsonb,
  closing_summary = NULL,
  next_session_prep = NULL,
  use_interleaved_mode = false,
  interleaved_blocks = '[]'::jsonb
WHERE id != '7c5a5d1e-ab3d-4fad-a8ad-ccf026f95029';

DELETE FROM public.session_videos
WHERE session_id != '7c5a5d1e-ab3d-4fad-a8ad-ccf026f95029';
