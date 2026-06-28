import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

function nextSortOrder(phases) {
  return phases.reduce((max, p) => Math.max(max, p.sort_order ?? p.phase_number ?? 0), 0) + 1;
}

function uniqueCode(phases, sortOrder) {
  let code = `B${sortOrder}`;
  const used = new Set(phases.map((p) => p.code));
  while (used.has(code)) {
    code = `B${sortOrder}_${Math.random().toString(36).slice(2, 5)}`;
  }
  return code;
}

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

  const createPhase = async (metadata) => {
    const title = metadata.title?.trim();
    if (!title) throw new Error("El nombre del bloque es obligatorio");

    const sort_order = metadata.sort_order
      ? Number(metadata.sort_order)
      : nextSortOrder(phases);
    const code = metadata.code?.trim() || uniqueCode(phases, sort_order);

    const insertData = {
      title,
      subtitle: metadata.subtitle?.trim() || null,
      color: metadata.color || "#534AB7",
      sort_order,
      phase_number: sort_order,
      code,
      objective: metadata.objective?.trim() || null,
      deliverable: metadata.deliverable?.trim() || null,
      bridge_to_classroom: metadata.bridge_to_classroom?.trim() || null,
    };

    const { data, error: err } = await supabase
      .from("phases")
      .insert(insertData)
      .select()
      .single();

    if (err) throw new Error(err.message || "Error al crear el bloque didáctico");
    await load();
    return data;
  };

  const updatePhase = async (metadata) => {
    const { id } = metadata;
    if (!id) throw new Error("Bloque no válido");

    const title = metadata.title?.trim();
    if (!title) throw new Error("El nombre del bloque es obligatorio");

    const sort_order = Number(metadata.sort_order);
    if (!sort_order || sort_order < 1) {
      throw new Error("Indica la posición en la secuencia (1, 2, 3…)");
    }

    const updateData = {
      title,
      subtitle: metadata.subtitle?.trim() || null,
      color: metadata.color || "#534AB7",
      sort_order,
      phase_number: sort_order,
    };

    const { data, error: err } = await supabase
      .from("phases")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (err) throw new Error(err.message || "Error al actualizar el bloque");
    await load();
    return data;
  };

  const deletePhase = async (phaseId) => {
    const { error: err } = await supabase.from("phases").delete().eq("id", phaseId);
    if (err) throw new Error(err.message || "Error al eliminar el bloque");
    await load();
  };

  return {
    phases,
    loading,
    error,
    reload: load,
    createPhase,
    updatePhase,
    deletePhase,
  };
}
