-- Timer por pregunta + avance automático configurable

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS time_limit_seconds INT;

ALTER TABLE quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_time_limit_seconds_check;

ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_time_limit_seconds_check
  CHECK (
    time_limit_seconds IS NULL
    OR (time_limit_seconds >= 5 AND time_limit_seconds <= 600)
  );

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS auto_advance_delay_seconds INT NOT NULL DEFAULT 5;

ALTER TABLE quizzes
  DROP CONSTRAINT IF EXISTS quizzes_auto_advance_delay_seconds_check;

ALTER TABLE quizzes
  ADD CONSTRAINT quizzes_auto_advance_delay_seconds_check
  CHECK (auto_advance_delay_seconds >= 2 AND auto_advance_delay_seconds <= 60);

ALTER TABLE quiz_game_sessions
  ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ;

ALTER TABLE quiz_game_sessions
  ADD COLUMN IF NOT EXISTS reveal_started_at TIMESTAMPTZ;

-- Avanza revelado / siguiente pregunta según timers y config del cuestionario.
CREATE OR REPLACE FUNCTION progress_quiz_timers(p_game_id UUID)
RETURNS quiz_game_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game quiz_game_sessions%ROWTYPE;
  v_question quiz_questions%ROWTYPE;
  v_auto_advance BOOLEAN;
  v_delay INT;
  v_question_count INT;
BEGIN
  SELECT * INTO v_game
  FROM quiz_game_sessions
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND OR v_game.status <> 'active' THEN
    RETURN v_game;
  END IF;

  SELECT auto_advance, auto_advance_delay_seconds
  INTO v_auto_advance, v_delay
  FROM quizzes
  WHERE id = v_game.quiz_id;

  SELECT COUNT(*)::INT INTO v_question_count
  FROM quiz_questions
  WHERE quiz_id = v_game.quiz_id;

  SELECT * INTO v_question
  FROM quiz_questions
  WHERE quiz_id = v_game.quiz_id
  ORDER BY sort_order, created_at
  OFFSET v_game.current_question_idx
  LIMIT 1;

  -- Tiempo agotado → revelar respuesta automáticamente
  IF v_game.question_phase = 'answering'
     AND v_question.id IS NOT NULL
     AND v_question.time_limit_seconds IS NOT NULL
     AND v_game.question_started_at IS NOT NULL
     AND now() >= v_game.question_started_at + make_interval(secs => v_question.time_limit_seconds)
  THEN
    UPDATE quiz_game_sessions
    SET
      question_phase = 'reveal',
      reveal_started_at = now(),
      updated_at = now()
    WHERE id = p_game_id
    RETURNING * INTO v_game;
  END IF;

  -- Avance automático tras revelar
  IF v_game.question_phase = 'reveal'
     AND COALESCE(v_auto_advance, false) = true
     AND v_game.reveal_started_at IS NOT NULL
     AND now() >= v_game.reveal_started_at + make_interval(secs => COALESCE(v_delay, 5))
  THEN
    IF v_game.current_question_idx >= GREATEST(v_question_count - 1, 0) THEN
      UPDATE quiz_game_sessions
      SET
        status = 'finished',
        ended_at = now(),
        updated_at = now()
      WHERE id = p_game_id
      RETURNING * INTO v_game;
    ELSE
      UPDATE quiz_game_sessions
      SET
        current_question_idx = v_game.current_question_idx + 1,
        question_phase = 'answering',
        question_started_at = now(),
        reveal_started_at = NULL,
        updated_at = now()
      WHERE id = p_game_id
      RETURNING * INTO v_game;
    END IF;
  END IF;

  RETURN v_game;
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
  v_seconds_left INT;
BEGIN
  SELECT id INTO v_student_id
  FROM students
  WHERE student_code = p_student_code AND active = true;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Código de estudiante no válido');
  END IF;

  PERFORM register_quiz_presence(p_game_id, p_student_code);
  PERFORM progress_quiz_timers(p_game_id);

  SELECT
    gs.id,
    gs.quiz_id,
    gs.status,
    gs.current_question_idx,
    gs.question_phase,
    gs.question_started_at,
    gs.reveal_started_at,
    q.title AS quiz_title,
    q.auto_advance,
    q.auto_advance_delay_seconds
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
    'question_started_at', v_game.question_started_at,
    'reveal_started_at', v_game.reveal_started_at,
    'auto_advance', v_game.auto_advance,
    'auto_advance_delay_seconds', v_game.auto_advance_delay_seconds,
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
      qq.explanation_text,
      qq.time_limit_seconds
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

      v_seconds_left := NULL;
      IF v_game.question_phase = 'answering'
         AND v_question.time_limit_seconds IS NOT NULL
         AND v_game.question_started_at IS NOT NULL
      THEN
        v_seconds_left := GREATEST(
          0,
          CEIL(
            EXTRACT(
              EPOCH FROM (
                v_game.question_started_at
                + make_interval(secs => v_question.time_limit_seconds)
                - now()
              )
            )
          )::INT
        );
      ELSIF v_game.question_phase = 'reveal'
         AND COALESCE(v_game.auto_advance, false) = true
         AND v_game.reveal_started_at IS NOT NULL
      THEN
        v_seconds_left := GREATEST(
          0,
          CEIL(
            EXTRACT(
              EPOCH FROM (
                v_game.reveal_started_at
                + make_interval(secs => COALESCE(v_game.auto_advance_delay_seconds, 5))
                - now()
              )
            )
          )::INT
        );
      END IF;

      v_result := v_result || jsonb_build_object(
        'seconds_left', v_seconds_left,
        'question', jsonb_build_object(
          'id', v_question.id,
          'sort_order', v_question.sort_order,
          'question_text', v_question.question_text,
          'question_image_url', v_question.question_image_url,
          'option_a', v_question.option_a,
          'option_b', v_question.option_b,
          'option_c', v_question.option_c,
          'option_d', v_question.option_d,
          'time_limit_seconds', v_question.time_limit_seconds,
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

GRANT EXECUTE ON FUNCTION progress_quiz_timers(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_quiz_game_state(UUID, CHAR(4)) TO anon, authenticated;
