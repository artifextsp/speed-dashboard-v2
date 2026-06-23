import { supabase } from "../lib/supabase";

/** Mapa session_id → videos[] para publicación y PDF. */
export async function fetchSessionVideosMap(sessionIds) {
  if (!sessionIds?.length) return {};

  const { data, error } = await supabase
    .from("session_videos")
    .select("*")
    .in("session_id", sessionIds)
    .order("sort_order");

  if (error) throw new Error(error.message || "Error al cargar videos");

  const map = {};
  for (const row of data || []) {
    if (!map[row.session_id]) map[row.session_id] = [];
    map[row.session_id].push(row);
  }
  return map;
}
