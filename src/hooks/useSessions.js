import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { formatSpanishDate, toIsoDateString } from "../kernel/sortByDate";

const EDITABLE_FIELDS = [
  "title",
  "scheduled_date",
  "scheduled_date_iso",
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

const METADATA_FIELDS = [
  "phase_id",
  "title",
  "modality",
  "session_type",
  "session_number",
  "scheduled_date",
  "scheduled_date_iso",
  "duration_estimate",
  "learning_goal",
];

function buildDateFields(scheduledDateIso, scheduledDateText) {
  if (scheduledDateIso) {
    return {
      scheduled_date_iso: scheduledDateIso,
      scheduled_date: formatSpanishDate(scheduledDateIso) || scheduledDateText || null,
    };
  }
  if (scheduledDateText) {
    return {
      scheduled_date: scheduledDateText,
      scheduled_date_iso: toIsoDateString(scheduledDateText),
    };
  }
  return { scheduled_date: null, scheduled_date_iso: null };
}

async function logEdit(sessionId, userEmail, action) {
  if (!userEmail) return;
  await supabase.from("edit_log").insert({
    session_id: sessionId,
    user_email: userEmail,
    action,
  });
}

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

    if ("scheduled_date" in formData && !("scheduled_date_iso" in formData)) {
      Object.assign(updateData, buildDateFields(null, formData.scheduled_date));
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

    await logEdit(id, userEmail, "update");

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

  const createSession = async (metadata, userEmail) => {
    const title = metadata.title?.trim();
    if (!title) throw new Error("El título es obligatorio");
    if (!metadata.scheduled_date_iso) throw new Error("La fecha es obligatoria");

    const maxOrder = sessions.reduce(
      (max, s) => Math.max(max, s.sort_order ?? 0),
      0
    );

    const dateFields = buildDateFields(metadata.scheduled_date_iso, null);

    const insertData = {
      phase_id: metadata.phase_id || null,
      title,
      modality: metadata.modality || "virtual",
      session_type: metadata.session_type || "sesion",
      session_number: metadata.session_number
        ? Number(metadata.session_number)
        : null,
      duration_estimate: metadata.duration_estimate?.trim() || null,
      learning_goal: metadata.learning_goal?.trim() || null,
      status: "borrador",
      class_components: [],
      sort_order: maxOrder + 1,
      ...dateFields,
    };

    if (userEmail) {
      insertData.last_edited_by = userEmail;
      insertData.last_edited_at = new Date().toISOString();
    }

    const { data, error: err } = await supabase
      .from("sessions")
      .insert(insertData)
      .select()
      .single();

    if (err) throw new Error(err.message || "Error al crear la clase");

    await logEdit(data.id, userEmail, "create");
    await load();
    return data;
  };

  const updateSessionMetadata = async (metadata, userEmail) => {
    const { id } = metadata;
    if (!id) throw new Error("Sesión no válida");

    const title = metadata.title?.trim();
    if (!title) throw new Error("El título es obligatorio");
    if (!metadata.scheduled_date_iso) throw new Error("La fecha es obligatoria");

    const updateData = {};
    for (const key of METADATA_FIELDS) {
      if (key in metadata) {
        updateData[key] = key === "phase_id" ? metadata[key] || null : metadata[key];
      }
    }

    updateData.title = title;
    updateData.session_number = metadata.session_number
      ? Number(metadata.session_number)
      : null;

    Object.assign(
      updateData,
      buildDateFields(metadata.scheduled_date_iso, null)
    );

    if (userEmail) {
      updateData.last_edited_by = userEmail;
      updateData.last_edited_at = new Date().toISOString();
    }

    const { data, error: err } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (err) throw new Error(err.message || "Error al actualizar la clase");

    await logEdit(id, userEmail, "update");
    await load();
    return data;
  };

  const deleteSession = async (sessionId, userEmail) => {
    const { error: err } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (err) throw new Error(err.message || "Error al eliminar la clase");

    await logEdit(sessionId, userEmail, "delete");
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

  return {
    sessions,
    loading,
    error,
    reload: load,
    saveSession,
    createSession,
    updateSessionMetadata,
    deleteSession,
    getVideos,
  };
}
