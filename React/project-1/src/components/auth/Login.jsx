import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthContext from "../../hooks/useAuthContext";
import { safeDestination } from "../../utils/routing";

function Login() {
  const { login, authLoading: loading, authError: error } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const session = await login({ email, password });
    if (!mountedRef.current || !session?.isCurrent()) return;
    setPassword("");
    const destination = safeDestination(location.state?.from);
    navigate(destination || (session.user.role === "admin" ? "/admin" : "/productos"), { replace: true });
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Iniciar sesión</h1>
        <p>Ingresa tu correo electrónico y tu contraseña para continuar.</p>
        {location.state?.cartReason === "login-required" && (
          <p className="access-message" role="status">Inicia sesión como cliente para agregar productos al carrito.</p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
            />
          </label>

          {error && (
            <p className="login-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
