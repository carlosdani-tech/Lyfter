import { useState } from "react";

function Login({ onSubmit, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({ email, password });
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Iniciar sesión</h1>
        <p>Ingresa tu correo y contraseña para continuar.</p>

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
