import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function usePhases(user) {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("phases")
      .select("*")
      .order("sort_order");
    if (err) {
      setError(err.message);
    } else {
      setPhases(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  return { phases, loading, error, reload: load };
}
