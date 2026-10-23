import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthContext from "../../hooks/useAuthContext";
import { safeDestination } from "../../utils/routing";
import RouteStatusPage from "./RouteStatusPage";
import Loading from "./Loading";

export function RequireAuth() {
  const { isAuthenticated, authLoading, sessionVersion } = useAuthContext();
  const location = useLocation();
  if (authLoading) return <Loading message="Verificando sesión..." />;
  if (!isAuthenticated) {
    const from = safeDestination(location.pathname + location.search + location.hash);
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet key={sessionVersion} />;
}

export function RequireRole({ role }) {
  const { isAuthenticated, isAdmin, isClient } = useAuthContext();
  const permitted = isAuthenticated && (role === "admin" ? isAdmin : role === "client" && isClient);
  return permitted ? <Outlet /> : (
    <RouteStatusPage title="Acceso restringido" message="No tienes permiso para acceder a esta sección." />
  );
}
