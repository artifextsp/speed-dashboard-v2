-- Presencia en sesión + puntajes públicos + estado enriquecido al finalizar

CREATE TABLE IF NOT EXISTS quiz_session_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES quiz_game_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS quiz_session_presence_game_session_id_idx
  ON quiz_session_presence (game_session_id);

ALTER TABLE quiz_session_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_session_presence_auth_all ON quiz_session_presence;
CREATE POLICY quiz_session_presence_auth_all ON quiz_session_presence
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION register_quiz_presence(
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
  v_game_status quiz_game_status;
BEGIN
  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  SELECT status INTO v_game_status
  FROM quiz_game_sessions
  WHERE id = p_game_id;

  IF NOT FOUND OR v_game_status = 'finished' THEN
    RETURN jsonb_build_object('error', 'Juego no disponible');
  END IF;

  INSERT INTO quiz_session_presence (game_session_id, student_id)
  VALUES (p_game_id, v_student_id)
  ON CONFLICT (game_session_id, student_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

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
  v_ranking JSONB;
  v_summary JSONB;
BEGIN
  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  PERFORM register_quiz_presence(p_game_id, p_student_code);

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

  IF v_game.status = 'finished' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.total_score DESC, r.student_code), '[]'::jsonb)
    INTO v_ranking
    FROM (
      SELECT
        st.student_code,
        COUNT(*) FILTER (WHERE qr.is_correct) AS total_score
      FROM quiz_session_presence p
      JOIN students st ON st.id = p.student_id
      LEFT JOIN quiz_responses qr ON qr.game_session_id = p.game_session_id AND qr.student_id = p.student_id
      WHERE p.game_session_id = p_game_id
      GROUP BY st.student_code
    ) r;

    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.sort_order), '[]'::jsonb)
    INTO v_summary
    FROM (
      SELECT
        qq.sort_order + 1 AS question_number,
        qq.question_text,
        qr.selected_option,
        qr.is_correct,
        qq.correct_option
      FROM quiz_questions qq
      LEFT JOIN quiz_responses qr
        ON qr.question_id = qq.id
        AND qr.game_session_id = p_game_id
        AND qr.student_id = v_student_id
      WHERE qq.quiz_id = v_game.quiz_id
      ORDER BY qq.sort_order, qq.created_at
    ) s;

    v_result := v_result || jsonb_build_object(
      'ranking', v_ranking,
      'answer_summary', v_summary
    );
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fetch_public_quiz_scores()
RETURNS TABLE (
  game_session_id UUID,
  quiz_title TEXT,
  ended_at TIMESTAMPTZ,
  student_code CHAR(4),
  total_score INT,
  total_questions INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.id AS game_session_id,
    q.title AS quiz_title,
    gs.ended_at,
    st.student_code,
    COUNT(*) FILTER (WHERE qr.is_correct)::INT AS total_score,
    (SELECT COUNT(*)::INT FROM quiz_questions qq WHERE qq.quiz_id = gs.quiz_id) AS total_questions
  FROM quiz_game_sessions gs
  JOIN quizzes q ON q.id = gs.quiz_id
  JOIN quiz_session_presence p ON p.game_session_id = gs.id
  JOIN students st ON st.id = p.student_id
  LEFT JOIN quiz_responses qr
    ON qr.game_session_id = gs.id AND qr.student_id = st.id
  WHERE gs.status = 'finished' AND st.active = true
  GROUP BY gs.id, q.title, gs.ended_at, st.student_code
  ORDER BY gs.ended_at DESC, st.student_code;
$$;

GRANT EXECUTE ON FUNCTION register_quiz_presence(UUID, CHAR(4)) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_public_quiz_scores() TO anon, authenticated;
