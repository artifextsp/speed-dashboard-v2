-- ============================================================
-- Módulo de cuestionarios (tipo Kahoot)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE quiz_game_status AS ENUM (
    'waiting',
    'active',
    'finished'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE quiz_question_phase AS ENUM (
    'answering',
    'reveal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_id_idx
  ON quiz_questions (quiz_id);
CREATE INDEX IF NOT EXISTS quiz_questions_sort_order_idx
  ON quiz_questions (quiz_id, sort_order);

CREATE TABLE IF NOT EXISTS quiz_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status quiz_game_status NOT NULL DEFAULT 'waiting',
  current_question_idx INT NOT NULL DEFAULT 0,
  question_phase quiz_question_phase NOT NULL DEFAULT 'answering',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_game_sessions_quiz_id_idx
  ON quiz_game_sessions (quiz_id);
CREATE INDEX IF NOT EXISTS quiz_game_sessions_status_idx
  ON quiz_game_sessions (status);

CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES quiz_game_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_session_id, question_id, student_id)
);

CREATE INDEX IF NOT EXISTS quiz_responses_game_session_id_idx
  ON quiz_responses (game_session_id);
CREATE INDEX IF NOT EXISTS quiz_responses_student_id_idx
  ON quiz_responses (student_id);

CREATE OR REPLACE FUNCTION quizzes_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION quiz_questions_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION quiz_game_sessions_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quizzes_touch_updated_at ON quizzes;
CREATE TRIGGER quizzes_touch_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION quizzes_before_update();

DROP TRIGGER IF EXISTS quiz_questions_touch_updated_at ON quiz_questions;
CREATE TRIGGER quiz_questions_touch_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION quiz_questions_before_update();

DROP TRIGGER IF EXISTS quiz_game_sessions_touch_updated_at ON quiz_game_sessions;
CREATE TRIGGER quiz_game_sessions_touch_updated_at
  BEFORE UPDATE ON quiz_game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION quiz_game_sessions_before_update();

-- ============================================================
-- RPC: juego activo (anon)
-- ============================================================

CREATE OR REPLACE FUNCTION fetch_active_quiz_game()
RETURNS TABLE (
  game_id UUID,
  quiz_id UUID,
  quiz_title TEXT,
  status quiz_game_status,
  current_question_idx INT,
  question_phase quiz_question_phase,
  total_questions INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.id AS game_id,
    gs.quiz_id,
    q.title AS quiz_title,
    gs.status,
    gs.current_question_idx,
    gs.question_phase,
    (SELECT COUNT(*)::INT FROM quiz_questions qq WHERE qq.quiz_id = gs.quiz_id) AS total_questions
  FROM quiz_game_sessions gs
  JOIN quizzes q ON q.id = gs.quiz_id
  WHERE gs.status IN ('waiting', 'active')
  ORDER BY gs.created_at DESC
  LIMIT 1;
$$;

-- ============================================================
-- RPC: estado del juego para estudiante (anon)
-- ============================================================

CREATE OR REPLACE FUNCTION fetch_quiz_game_state(
  p_game_id UUID,
  p_student_code CHAR(4)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_game RECORD;
  v_question RECORD;
  v_response RECORD;
  v_total_score INT;
  v_result JSONB;
BEGIN
  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  SELECT
    gs.id,
    gs.quiz_id,
    gs.status,
    gs.current_question_idx,
    gs.question_phase,
    q.title AS quiz_title
  INTO v_game
  FROM quiz_game_sessions gs
  JOIN quizzes q ON q.id = gs.quiz_id
  WHERE gs.id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Juego no encontrado');
  END IF;

  SELECT COUNT(*)::INT INTO v_total_score
  FROM quiz_responses qr
  WHERE qr.game_session_id = p_game_id
    AND qr.student_id = v_student_id
    AND qr.is_correct = true;

  v_result := jsonb_build_object(
    'game_id', v_game.id,
    'quiz_id', v_game.quiz_id,
    'quiz_title', v_game.quiz_title,
    'status', v_game.status,
    'current_question_idx', v_game.current_question_idx,
    'question_phase', v_game.question_phase,
    'total_score', v_total_score
  );

  IF v_game.status = 'active' THEN
    SELECT
      qq.id,
      qq.sort_order,
      qq.question_text,
      qq.question_image_url,
      qq.option_a,
      qq.option_b,
      qq.option_c,
      qq.option_d,
      qq.correct_option,
      qq.explanation_text
    INTO v_question
    FROM quiz_questions qq
  WHERE qq.quiz_id = v_game.quiz_id
    ORDER BY qq.sort_order, qq.created_at
    OFFSET v_game.current_question_idx
    LIMIT 1;

    IF FOUND THEN
      SELECT qr.selected_option, qr.is_correct
      INTO v_response
      FROM quiz_responses qr
      WHERE qr.game_session_id = p_game_id
        AND qr.question_id = v_question.id
        AND qr.student_id = v_student_id;

      v_result := v_result || jsonb_build_object(
        'question', jsonb_build_object(
          'id', v_question.id,
          'sort_order', v_question.sort_order,
          'question_text', v_question.question_text,
          'question_image_url', v_question.question_image_url,
          'option_a', v_question.option_a,
          'option_b', v_question.option_b,
          'option_c', v_question.option_c,
          'option_d', v_question.option_d,
          'correct_option', CASE
            WHEN v_game.question_phase = 'reveal' THEN v_question.correct_option
            ELSE NULL
          END,
          'explanation_text', CASE
            WHEN v_game.question_phase = 'reveal' THEN v_question.explanation_text
            ELSE NULL
          END
        ),
        'my_response', CASE
          WHEN v_response IS NOT NULL THEN jsonb_build_object(
            'selected_option', v_response.selected_option,
            'is_correct', v_response.is_correct
          )
          ELSE NULL
        END
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- RPC: enviar respuesta (anon)
-- ============================================================

CREATE OR REPLACE FUNCTION submit_quiz_answer(
  p_game_id UUID,
  p_student_code CHAR(4),
  p_question_id UUID,
  p_selected_option CHAR(1)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_game RECORD;
  v_question RECORD;
  v_is_correct BOOLEAN;
BEGIN
  IF p_selected_option NOT IN ('a', 'b', 'c', 'd') THEN
    RETURN jsonb_build_object('error', 'Opción no válida');
  END IF;

  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  SELECT gs.id, gs.status, gs.question_phase, gs.quiz_id, gs.current_question_idx
  INTO v_game
  FROM quiz_game_sessions gs
  WHERE gs.id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Juego no encontrado');
  END IF;

  IF v_game.status <> 'active' OR v_game.question_phase <> 'answering' THEN
    RETURN jsonb_build_object('error', 'No se pueden enviar respuestas en este momento');
  END IF;

  SELECT qq.id, qq.correct_option
  INTO v_question
  FROM quiz_questions qq
  WHERE qq.id = p_question_id AND qq.quiz_id = v_game.quiz_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Pregunta no encontrada');
  END IF;

  IF EXISTS (
    SELECT 1 FROM quiz_responses qr
    WHERE qr.game_session_id = p_game_id
      AND qr.question_id = p_question_id
      AND qr.student_id = v_student_id
  ) THEN
    RETURN jsonb_build_object('error', 'Ya respondiste esta pregunta');
  END IF;

  v_is_correct := (p_selected_option = v_question.correct_option);

  INSERT INTO quiz_responses (
    game_session_id,
    question_id,
    student_id,
    selected_option,
    is_correct
  ) VALUES (
    p_game_id,
    p_question_id,
    v_student_id,
    p_selected_option,
    v_is_correct
  );

  RETURN jsonb_build_object(
    'success', true,
    'selected_option', p_selected_option,
    'is_correct', v_is_correct
  );
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quizzes_auth_all ON quizzes;
CREATE POLICY quizzes_auth_all ON quizzes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quiz_questions_auth_all ON quiz_questions;
CREATE POLICY quiz_questions_auth_all ON quiz_questions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quiz_game_sessions_auth_all ON quiz_game_sessions;
CREATE POLICY quiz_game_sessions_auth_all ON quiz_game_sessions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quiz_responses_auth_all ON quiz_responses;
CREATE POLICY quiz_responses_auth_all ON quiz_responses
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION fetch_active_quiz_game() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_quiz_game_state(UUID, CHAR(4)) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_quiz_answer(UUID, CHAR(4), UUID, CHAR(1)) TO anon, authenticated;
