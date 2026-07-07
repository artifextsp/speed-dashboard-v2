import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useStudents(user) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("students")
      .select("*")
      .order("full_name");
    if (err) {
      setError(err.message);
      setLoading(false);
      return [];
    }
    setStudents(data || []);
    setLoading(false);
    return data || [];
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const createStudent = async ({ full_name, id_number, email }) => {
    const { data, error: err } = await supabase
      .from("students")
      .insert({
        full_name: full_name.trim(),
        id_number: id_number.trim(),
        email: email?.trim() || null,
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    await load();
    return data;
  };

  const updateStudent = async (id, patch) => {
    const { error: err } = await supabase
      .from("students")
      .update({
        full_name: patch.full_name?.trim(),
        id_number: patch.id_number?.trim(),
        email: patch.email?.trim() || null,
        active: patch.active,
      })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  };

  const deactivateStudent = async (id) => {
    const { error: err } = await supabase
      .from("students")
      .update({ active: false })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  };

  const activateStudent = async (id) => {
    const { error: err } = await supabase
      .from("students")
      .update({ active: true })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  };

  return {
    students,
    activeStudents: students.filter((s) => s.active),
    loading,
    error,
    reload: load,
    createStudent,
    updateStudent,
    deactivateStudent,
    activateStudent,
  };
}
