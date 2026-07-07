import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useQuizzes(user) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("quizzes")
      .select("*, quiz_questions(count)")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return [];
    }
    const normalized = (data || []).map((quiz) => ({
      ...quiz,
      question_count: quiz.quiz_questions?.[0]?.count ?? 0,
    }));
    setQuizzes(normalized);
    setLoading(false);
    return normalized;
  }, []);

  useEffect(() => {
    if (user) loadQuizzes();
  }, [user, loadQuizzes]);

  const loadQuizQuestions = useCallback(async (quizId) => {
    if (!quizId) return [];
    const { data, error: err } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) throw new Error(err.message);
    return data || [];
  }, []);

  const createQuiz = async ({ title, description, questions, createdBy }) => {
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: createdBy || null,
      })
      .select()
      .single();
    if (quizErr) throw new Error(quizErr.message);

    if (questions?.length) {
      const payload = questions.map((q, index) => ({
        quiz_id: quiz.id,
        sort_order: index,
        question_text: q.question_text.trim(),
        question_image_url: q.question_image_url?.trim() || null,
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        explanation_text: q.explanation_text?.trim() || null,
      }));
      const { error: qErr } = await supabase.from("quiz_questions").insert(payload);
      if (qErr) throw new Error(qErr.message);
    }

    await loadQuizzes();
    return quiz;
  };

  const updateQuiz = async (quizId, { title, description, questions }) => {
    const { error: quizErr } = await supabase
      .from("quizzes")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quizId);
    if (quizErr) throw new Error(quizErr.message);

    const { error: delErr } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("quiz_id", quizId);
    if (delErr) throw new Error(delErr.message);

    if (questions?.length) {
      const payload = questions.map((q, index) => ({
        quiz_id: quizId,
        sort_order: index,
        question_text: q.question_text.trim(),
        question_image_url: q.question_image_url?.trim() || null,
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        explanation_text: q.explanation_text?.trim() || null,
      }));
      const { error: qErr } = await supabase.from("quiz_questions").insert(payload);
      if (qErr) throw new Error(qErr.message);
    }

    await loadQuizzes();
  };

  const deleteQuiz = async (quizId) => {
    const { error: err } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (err) throw new Error(err.message);
    await loadQuizzes();
  };

  const loadGameSessions = useCallback(async (quizId) => {
    const query = supabase
      .from("quiz_game_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (quizId) query.eq("quiz_id", quizId);
    const { data, error: err } = await query;
    if (err) throw new Error(err.message);
    return data || [];
  }, []);

  const launchGame = async ({ quizId, createdBy }) => {
    const { data: active } = await supabase
      .from("quiz_game_sessions")
      .select("id")
      .in("status", ["waiting", "active"])
      .limit(1);
    if (active?.length) {
      throw new Error("Ya hay un juego en curso. Finalízalo antes de lanzar otro.");
    }

    const { data, error: err } = await supabase
      .from("quiz_game_sessions")
      .insert({
        quiz_id: quizId,
        status: "waiting",
        current_question_idx: 0,
        question_phase: "answering",
        created_by: createdBy || null,
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data;
  };

  const startGame = async (gameId) => {
    const { data, error: err } = await supabase
      .from("quiz_game_sessions")
      .update({
        status: "active",
        current_question_idx: 0,
        question_phase: "answering",
        started_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data;
  };

  const revealAnswer = async (gameId) => {
    const { data, error: err } = await supabase
      .from("quiz_game_sessions")
      .update({ question_phase: "reveal" })
      .eq("id", gameId)
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data;
  };

  const advanceQuestion = async (gameId, nextIdx) => {
    const { data, error: err } = await supabase
      .from("quiz_game_sessions")
      .update({
        current_question_idx: nextIdx,
        question_phase: "answering",
      })
      .eq("id", gameId)
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data;
  };

  const finishGame = async (gameId) => {
    const { data, error: err } = await supabase
      .from("quiz_game_sessions")
      .update({
        status: "finished",
        ended_at: new Date().toISOString(),
      })
      .eq("id", gameId)
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data;
  };

  const loadGameState = useCallback(async (gameId) => {
    const { data: game, error: gameErr } = await supabase
      .from("quiz_game_sessions")
      .select("*, quizzes(id, title, description)")
      .eq("id", gameId)
      .single();
    if (gameErr) throw new Error(gameErr.message);

    const questions = await loadQuizQuestions(game.quiz_id);
    const currentQuestion = questions[game.current_question_idx] || null;

    const { data: responses, error: respErr } = await supabase
      .from("quiz_responses")
      .select("*, students(id, full_name, student_code)")
      .eq("game_session_id", gameId);
    if (respErr) throw new Error(respErr.message);

    const currentResponses = currentQuestion
      ? (responses || []).filter((r) => r.question_id === currentQuestion.id)
      : [];

    return {
      game,
      questions,
      currentQuestion,
      responses: responses || [],
      currentResponses,
    };
  }, [loadQuizQuestions]);

  const loadGameResults = useCallback(async (gameId) => {
    const { data: responses, error: respErr } = await supabase
      .from("quiz_responses")
      .select("*, students(id, full_name, student_code), quiz_questions(id, question_text, sort_order)")
      .eq("game_session_id", gameId);
    if (respErr) throw new Error(respErr.message);

    const byStudent = {};
    for (const row of responses || []) {
      const sid = row.student_id;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          student_id: sid,
          student_name: row.students?.full_name || "—",
          student_code: row.students?.student_code || "—",
          total_score: 0,
          responses: [],
        };
      }
      if (row.is_correct) byStudent[sid].total_score += 1;
      byStudent[sid].responses.push(row);
    }

    return Object.values(byStudent).sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return String(a.student_code).localeCompare(String(b.student_code), "es");
    });
  }, []);

  return {
    quizzes,
    loading,
    error,
    reload: loadQuizzes,
    loadQuizQuestions,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    loadGameSessions,
    launchGame,
    startGame,
    revealAnswer,
    advanceQuestion,
    finishGame,
    loadGameState,
    loadGameResults,
  };
}
