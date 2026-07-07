import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { computeAttendanceStats } from "../kernel/attendanceConstants";

export function useAttendance(user) {
  const [rollCalls, setRollCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRollCallsForSession = useCallback(async (sessionId) => {
    if (!sessionId) return [];
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("attendance_roll_calls")
      .select("*")
      .eq("session_id", sessionId)
      .order("taken_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return [];
    }
    setRollCalls(data || []);
    setLoading(false);
    return data || [];
  }, []);

  const loadAllRollCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("attendance_roll_calls")
      .select("*, sessions(title, session_number, phase_id)")
      .order("taken_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return [];
    }
    setRollCalls(data || []);
    setLoading(false);
    return data || [];
  }, []);

  const loadRecordsForRollCall = useCallback(async (rollCallId) => {
    if (!rollCallId) return [];
    const { data, error: err } = await supabase
      .from("attendance_records")
      .select("*, students(id, full_name, id_number, email, student_code, active)")
      .eq("roll_call_id", rollCallId)
      .order("students(full_name)");
    if (err) throw new Error(err.message);
    return (data || []).sort((a, b) =>
      (a.students?.full_name || "").localeCompare(b.students?.full_name || "", "es")
    );
  }, []);

  const createRollCall = async ({ sessionId, label, studentIds, recordedBy }) => {
    const takenAt = new Date().toISOString();
    const { data: rollCall, error: rcErr } = await supabase
      .from("attendance_roll_calls")
      .insert({
        session_id: sessionId,
        label: label?.trim() || null,
        taken_at: takenAt,
        recorded_by: recordedBy || null,
      })
      .select()
      .single();
    if (rcErr) throw new Error(rcErr.message);

    const records = studentIds.map((studentId) => ({
      roll_call_id: rollCall.id,
      student_id: studentId,
      status: "ausente",
      updated_by: recordedBy || null,
      updated_at: takenAt,
    }));

    const { error: recErr } = await supabase.from("attendance_records").insert(records);
    if (recErr) throw new Error(recErr.message);

    return rollCall;
  };

  /**
   * Agrega registros "ausente" para estudiantes activos que aún no
   * tienen fila en este llamado (p. ej. registrados después de crearlo).
   */
  const syncRollCallRecords = useCallback(async ({ rollCallId, studentIds, recordedBy }) => {
    if (!rollCallId || !studentIds?.length) return false;
    const { data: existing, error: err } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("roll_call_id", rollCallId);
    if (err) throw new Error(err.message);

    const existingIds = new Set((existing || []).map((r) => r.student_id));
    const missing = studentIds.filter((id) => !existingIds.has(id));
    if (missing.length === 0) return false;

    const now = new Date().toISOString();
    const newRecords = missing.map((studentId) => ({
      roll_call_id: rollCallId,
      student_id: studentId,
      status: "ausente",
      updated_by: recordedBy || null,
      updated_at: now,
    }));
    const { error: insErr } = await supabase.from("attendance_records").insert(newRecords);
    if (insErr) throw new Error(insErr.message);
    return true;
  }, []);

  const updateRecordStatus = async ({ recordId, status, updatedBy }) => {
    const { error: err } = await supabase
      .from("attendance_records")
      .update({
        status,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);
    if (err) throw new Error(err.message);
  };

  const deleteRollCall = async (rollCallId) => {
    const { error: err } = await supabase
      .from("attendance_roll_calls")
      .delete()
      .eq("id", rollCallId);
    if (err) throw new Error(err.message);
  };

  const updateRollCallLabel = async (rollCallId, label) => {
    const { error: err } = await supabase
      .from("attendance_roll_calls")
      .update({ label: label?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", rollCallId);
    if (err) throw new Error(err.message);
  };

  const fetchStatsSummary = useCallback(async () => {
    const { data: records, error: err } = await supabase
      .from("attendance_records")
      .select("status, student_id, roll_call_id, attendance_roll_calls(session_id, taken_at, sessions(title, session_number))");
    if (err) throw new Error(err.message);

    const byStudent = {};
    for (const row of records || []) {
      const sid = row.student_id;
      if (!byStudent[sid]) byStudent[sid] = [];
      byStudent[sid].push(row);
    }

    const studentStats = Object.entries(byStudent).map(([studentId, rows]) => ({
      studentId,
      ...computeAttendanceStats(rows),
      rollCallCount: rows.length,
    }));

    const overall = computeAttendanceStats(records || []);
    return { overall, studentStats, totalRecords: records?.length || 0 };
  }, []);

  return {
    rollCalls,
    loading,
    error,
    loadRollCallsForSession,
    loadAllRollCalls,
    loadRecordsForRollCall,
    createRollCall,
    syncRollCallRecords,
    updateRecordStatus,
    deleteRollCall,
    updateRollCallLabel,
    fetchStatsSummary,
  };
}

export function useAttendanceStats(user) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { fetchStatsSummary } = useAttendance(user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await fetchStatsSummary();
      setStats(summary);
    } finally {
      setLoading(false);
    }
  }, [fetchStatsSummary]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  return { stats, loading, reload: load };
}
