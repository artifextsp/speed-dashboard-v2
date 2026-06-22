import { useState } from "react";
import { PHASE_COLORS } from "../../utils/constants";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password, "login");
    } catch (err) {
      setError(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title" style={{ color: PHASE_COLORS.A }}>
            SPEED
          </h1>
          <p className="login-subtitle">Dashboard del curso</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="input"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <div className="login-error">{error}</div>}
          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ background: PHASE_COLORS.A }}
          >
            {loading ? "..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="login-access-note">
          Acceso restringido a autores del curso
        </p>
      </div>
    </div>
  );
}
