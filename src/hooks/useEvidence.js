import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const BUCKET = "bitacora-evidencias";

export function useEvidence(user) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("student_evidence")
      .select("*, students(id, full_name, student_code)")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return [];
    }
    setEvidence(data || []);
    setLoading(false);
    return data || [];
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const updateStatus = async (id, status, comment, reviewedBy) => {
    const { error: err } = await supabase
      .from("student_evidence")
      .update({
        status,
        reviewer_comment: comment?.trim() || null,
        reviewed_by: reviewedBy || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  };

  const deleteEvidence = async (id, filePath) => {
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([filePath]);
    if (storageErr) throw new Error(storageErr.message);

    const { error: err } = await supabase
      .from("student_evidence")
      .delete()
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  };

  const getSignedUrl = async (filePath) => {
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 300);
    if (err) throw new Error(err.message);
    return data.signedUrl;
  };

  return {
    evidence,
    loading,
    error,
    reload: load,
    updateStatus,
    deleteEvidence,
    getSignedUrl,
  };
}
