import { useState } from "react";
import { login as loginRequest } from "../api/authApi";

const INVALID_CREDENTIALS_MESSAGE =
  "Las credenciales proporcionadas no son válidas. Por favor verifica tu correo y contraseña.";
const LOGIN_NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.";
const LOGIN_SERVER_ERROR_MESSAGE =
  "El servidor no pudo iniciar la sesión. Intenta nuevamente.";
const LOGIN_REQUEST_ERROR_MESSAGE =
  "No se pudo iniciar sesión. Revisa los datos e intenta nuevamente.";

function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const login = async (credentials) => {
    setAuthLoading(true);
    setAuthError("");

    try {
      const session = await loginRequest(credentials);
      setCurrentUser(session.user);
      setAccessToken(session.access_token);
      return session;
    } catch (error) {
      if (error.status === 401) {
        setAuthError(INVALID_CREDENTIALS_MESSAGE);
      } else if (error.status === 0) {
        setAuthError(LOGIN_NETWORK_ERROR_MESSAGE);
      } else if (error.status >= 500) {
        setAuthError(LOGIN_SERVER_ERROR_MESSAGE);
      } else {
        setAuthError(LOGIN_REQUEST_ERROR_MESSAGE);
      }

      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setAccessToken("");
  };

  const invalidateSession = (message) => {
    setCurrentUser(null);
    setAccessToken("");
    setAuthError(message);
  };

  const showAuthError = (message) => {
    setAuthError(message);
  };

  const clearAuthError = () => {
    setAuthError("");
  };

  return {
    currentUser,
    accessToken,
    isAdmin,
    authError,
    authLoading,
    login,
    logout,
    invalidateSession,
    showAuthError,
    clearAuthError,
  };
}

export default useAuth;
