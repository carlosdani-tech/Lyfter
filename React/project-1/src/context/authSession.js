const EXPIRED_SESSION_MESSAGE = "Tu sesión expiró. Inicia sesión nuevamente.";
const LOGIN_ERROR_MESSAGE = "No se pudo iniciar sesión. Revisa los datos e intenta nuevamente.";

export class SessionChangedError extends Error {
  constructor() {
    super("The authentication session changed.");
    this.name = "SessionChangedError";
  }
}

function loginErrorMessage(error) {
  if (error?.status === 401) {
    return "Las credenciales proporcionadas no son válidas. Por favor, verifica tu correo electrónico y tu contraseña.";
  }
  if (error?.status === 0) {
    return "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.";
  }
  if (error?.status >= 500) {
    return "El servidor no pudo iniciar la sesión. Intenta nuevamente.";
  }
  return LOGIN_ERROR_MESSAGE;
}

// One provider-owned store; immutable snapshots keep session transitions atomic.
export function createAuthSession(loginRequest, onSessionEnd = () => {}) {
  let version = 0;
  let loginController = null;
  const listeners = new Set();
  const sessionCleanups = new Set();
  const anonymous = (authError = "", authLoading = false) => Object.freeze({
    currentUser: null, accessToken: "", isAuthenticated: false,
    isAdmin: false, isClient: false, authLoading, authError, sessionVersion: version,
  });
  let snapshot = anonymous();
  const publish = (next) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const reset = (message = "", loading = false) => {
    version += 1;
    loginController?.abort();
    loginController = null;
    sessionCleanups.forEach((cleanup) => {
      try { cleanup(); } catch { /* A consumer cannot prevent session invalidation. */ }
    });
    // Invalidate pending work before notifying consumers or clearing UI actions.
    publish(anonymous(message, loading));
    onSessionEnd();
  };
  const logout = () => reset();
  const invalidateSession = () => reset(EXPIRED_SESSION_MESSAGE);

  const login = async (credentials) => {
    reset("", true);
    const requestVersion = version;
    const controller = new AbortController();
    loginController = controller;
    try {
      const response = await loginRequest(credentials, { signal: controller.signal });
      if (version !== requestVersion || controller.signal.aborted) return null;
      const user = response?.user;
      const token = response?.access_token;
      if (!user || !["admin", "client"].includes(user.role) || user.is_active === false ||
        typeof token !== "string" || !token.trim()) {
        throw new Error("Invalid authentication response.");
      }
      // Copy only the backend's safe user fields; never trust credentials for roles.
      const currentUser = Object.freeze({
        id: user.id, email: user.email, first_name: user.first_name,
        last_name: user.last_name, role: user.role, is_active: user.is_active,
      });
      publish(Object.freeze({
        currentUser, accessToken: token, isAuthenticated: true,
        isAdmin: currentUser.role === "admin", isClient: currentUser.role === "client",
        authLoading: false, authError: "", sessionVersion: version,
      }));
      // The caller can suppress navigation if logout happens before its continuation.
      return { user: currentUser, isCurrent: () => version === requestVersion && snapshot.isAuthenticated };
    } catch (error) {
      if (version !== requestVersion || controller.signal.aborted) return null;
      publish(anonymous(loginErrorMessage(error)));
      return null;
    } finally {
      if (version === requestVersion) loginController = null;
    }
  };

  const runProtectedRequest = async (operation, expectedVersion) => {
    const requestVersion = version;
    if (!snapshot.isAuthenticated || expectedVersion !== requestVersion) throw new SessionChangedError();
    try {
      const result = await operation(snapshot.accessToken);
      if (version !== requestVersion) throw new SessionChangedError();
      return result;
    } catch (error) {
      if (version !== requestVersion) throw new SessionChangedError();
      // Flask JWT uses 422 for malformed tokens; app payload validation uses 400.
      if (error?.status === 401 || error?.status === 422) {
        invalidateSession();
        const expired = new Error("Protected session expired.");
        expired.status = 401;
        throw expired;
      }
      throw error;
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    login, logout, invalidateSession, runProtectedRequest,
    registerSessionCleanup: (cleanup) => {
      sessionCleanups.add(cleanup);
      return () => sessionCleanups.delete(cleanup);
    },
    isCurrentSession: (expectedVersion) => snapshot.isAuthenticated && version === expectedVersion,
    clearAuthError: () => publish(Object.freeze({ ...snapshot, authError: "" })),
  };
}
