import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_SAVE_MS = 2500;

/**
 * Autoguardado con debounce + aviso al cerrar pestaña si hay cambios pendientes.
 */
export function useSessionAutoSave({
  buildPayload,
  onSave,
  readOnly = false,
  enabled = true,
}) {
  const savedSerialized = useRef(JSON.stringify(buildPayload()));
  const saveInFlight = useRef(false);
  const [saveStatus, setSaveStatus] = useState("saved");

  const serialized = JSON.stringify(buildPayload());
  const isDirty = serialized !== savedSerialized.current;

  useEffect(() => {
    if (readOnly || saveInFlight.current) return;
    if (!isDirty) {
      setSaveStatus((prev) => (prev === "error" ? "error" : "saved"));
      return;
    }
    setSaveStatus((prev) => (prev === "saving" || prev === "error" ? prev : "unsaved"));
  }, [isDirty, readOnly]);

  const performSave = useCallback(
    async (silent = false) => {
      if (readOnly || !enabled) return false;
      if (saveInFlight.current) return false;

      saveInFlight.current = true;
      setSaveStatus("saving");

      try {
        const payload = buildPayload();
        const ok = await onSave(payload, { silent });
        if (ok === false) {
          setSaveStatus("error");
          return false;
        }
        savedSerialized.current = JSON.stringify(payload);
        setSaveStatus("saved");
        return true;
      } catch {
        setSaveStatus("error");
        return false;
      } finally {
        saveInFlight.current = false;
      }
    },
    [buildPayload, enabled, onSave, readOnly]
  );

  useEffect(() => {
    if (!enabled || readOnly || !isDirty) return undefined;

    const timer = window.setTimeout(() => {
      performSave(true);
    }, AUTO_SAVE_MS);

    return () => window.clearTimeout(timer);
  }, [serialized, enabled, readOnly, isDirty, performSave]);

  useEffect(() => {
    if (readOnly) return undefined;

    const handleBeforeUnload = (event) => {
      if (!isDirty && saveStatus !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, readOnly, saveStatus]);

  const confirmLeave = useCallback(() => {
    if (readOnly) return true;
    if (!isDirty && saveStatus !== "saving") return true;

    if (saveStatus === "saving") {
      return window.confirm(
        "Aún se están guardando los cambios. ¿Quieres salir de todos modos?"
      );
    }

    return window.confirm(
      "Tienes cambios sin guardar. Si sales ahora, podrías perder lo que no se haya guardado aún.\n\n¿Salir sin esperar?"
    );
  }, [isDirty, readOnly, saveStatus]);

  return {
    saveStatus,
    isDirty,
    saveNow: () => performSave(false),
    confirmLeave,
  };
}
