import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "./AuthContext";
import { createAuthSession } from "./authSession";
import { login as loginRequest } from "../api/authApi";

const SESSION_TOAST_IDS = [
  "logout-confirmation", "product-deactivation-confirmation",
  "product-deactivation-success", "product-deactivation-error",
  "product-creation", "product-creation-access", "product-creation-validation",
  "product-edit", "product-edit-access", "product-edit-validation",
];

export default function AuthProvider({ children }) {
  const [store] = useState(() => createAuthSession(loginRequest, () => {
    SESSION_TOAST_IDS.forEach((id) => toast.dismiss(id));
  }));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => () => store.logout(), [store]);
  const sessionActions = useMemo(() => ({
    runProtectedRequest: (operation) => store.runProtectedRequest(operation, snapshot.sessionVersion),
    isCurrentSession: () => store.isCurrentSession(snapshot.sessionVersion),
  }), [store, snapshot.sessionVersion]);
  const value = useMemo(() => ({
    ...snapshot,
    login: store.login,
    logout: store.logout,
    invalidateSession: store.invalidateSession,
    clearAuthError: store.clearAuthError,
    registerSessionCleanup: store.registerSessionCleanup,
    // Bind work to the session that rendered its event handler, including toast actions.
    ...sessionActions,
  }), [store, snapshot, sessionActions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
