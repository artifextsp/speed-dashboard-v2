import { useState } from "react";
import { IconX } from "@tabler/icons-react";

export function ChangePasswordModal({ onClose, onSave }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (next.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (next !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      await onSave(next);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Cambiar contraseña</h3>
          <button className="btn-icon" onClick={onClose}><IconX size={18} /></button>
        </div>

        {success ? (
          <p className="modal-success">¡Contraseña actualizada correctamente!</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field__label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="Mínimo 6 caracteres"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={6}
            />
            <label className="field__label">Confirmar contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="Repite la nueva contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
