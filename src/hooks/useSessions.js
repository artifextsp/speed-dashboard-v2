import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const EDITABLE_FIELDS = [
  "title",
  "scheduled_date",
  "duration_estimate",
  "learning_goal",
  "checklist_digital",
  "checklist_physical",
  "checklist_prior",
  "conceptual_content",
  "conceptual_references",
  "practical_content",
  "practical_checkpoints",
  "has_pro_challenge",
  "pro_challenge_content",
  "bridge_content",
  "bridge_scenarios",
  "bridge_mini_deliverable",
  "deliverable_description",
  "deliverable_format",
  "deliverable_criteria",
  "closing_summary",
  "next_session_prep",
  "use_interleaved_mode",
  "interleaved_blocks",
  "class_components",
  "status",
];

export function useSessions(user) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("sessions")
      .select("*")
      .order("sort_order");
    if (err) {
      setError(err.message);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const saveSession = async (formData, videos, userEmail) => {
    const { id } = formData;

    const updateData = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in formData) updateData[key] = formData[key];
    }

    if (updateData.status === "publicado" && !formData.published_at) {
      updateData.published_at = new Date().toISOString();
    }
    if (updateData.status !== "publicado") {
      updateData.published_at = null;
    }

    if (userEmail) {
      updateData.last_edited_by = userEmail;
      updateData.last_edited_at = new Date().toISOString();
    }

    const { error: sErr } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", id);
    if (sErr) throw new Error(sErr.message || "Error al guardar la sesión");

    if (userEmail) {
      await supabase.from("edit_log").insert({
        session_id: id,
        user_email: userEmail,
        action: "update",
      });
    }

    await supabase.from("session_videos").delete().eq("session_id", id);
    if (videos.length > 0) {
      const videosToInsert = videos.map((v, i) => ({
        session_id: id,
        title: v.title || "Sin título",
        youtube_url: v.youtube_url || "",
        duration: v.duration || null,
        description: v.description || null,
        timing: v.timing || "durante",
        sort_order: i,
      }));
      const { error: vErr } = await supabase
        .from("session_videos")
        .insert(videosToInsert);
      if (vErr) throw new Error(vErr.message || "Error al guardar videos");
    }

    await load();
  };

  const getVideos = useCallback(async (sessionId) => {
    const { data, error: err } = await supabase
      .from("session_videos")
      .select("*")
      .eq("session_id", sessionId)
      .order("sort_order");
    if (err) throw new Error(err.message || "Error al cargar videos");
    return data || [];
  }, []);

  return { sessions, loading, error, reload: load, saveSession, getVideos };
}
