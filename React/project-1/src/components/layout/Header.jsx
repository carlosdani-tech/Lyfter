import { Link, NavLink } from "react-router-dom";

import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAuthContext from "../../hooks/useAuthContext";
import useCartContext from "../../hooks/useCartContext";

const LOGOUT_CONFIRMATION_TOAST_ID = "logout-confirmation";

export default function Header() {
  const { currentUser, isAdmin, isClient, logout } = useAuthContext();
  const { itemCount, loading: cartLoading } = useCartContext();
  const navigate = useNavigate();
  const location = useLocation();
  const logoutInProgressRef = useRef(false);
  const handleLogout = () => {
    if (logoutInProgressRef.current || toast.isActive(LOGOUT_CONFIRMATION_TOAST_ID)) return;
    toast.warning(
      <div className="toast-confirmation">
        <p>¿Deseas cerrar la sesión?</p>
        <div className="toast-confirmation__actions">
          <button type="button" className="toast-confirmation__confirm" onClick={() => {
            logoutInProgressRef.current = true;
            logout();
            if (/^\/(admin|carrito|checkout|compra)(\/|$)/.test(location.pathname)) {
              navigate("/productos", { replace: true });
            }
            logoutInProgressRef.current = false;
          }}>Cerrar sesión</button>
          <button type="button" className="toast-confirmation__cancel"
            onClick={() => toast.dismiss(LOGOUT_CONFIRMATION_TOAST_ID)}>Cancelar</button>
        </div>
      </div>,
      { toastId: LOGOUT_CONFIRMATION_TOAST_ID, autoClose: false, closeOnClick: false, draggable: false },
    );
  };
  const sessionName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || currentUser.email
    : "";
  return (
    <header className="header">
      <Link className="header__logo" to="/">
        <span className="header__logo-icon">🐾</span><span>PawStore</span>
      </Link>
      <nav className="header__nav">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/productos">Productos</NavLink>
        <NavLink to="/contacto">Contacto</NavLink>
        {isClient && <NavLink to="/carrito" aria-busy={cartLoading}>Carrito ({itemCount})</NavLink>}
        {(!currentUser || isAdmin) && <NavLink to="/admin"
          className={({ isActive }) => `btn-administracion${isActive ? " active" : ""}`}>
          Administración
        </NavLink>}
        {currentUser ? (
          <div className="header__session">
            <span>Sesión iniciada como: {sessionName}</span>
            <button type="button" className="header__logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        ) : <NavLink to="/login">Iniciar sesión</NavLink>}
      </nav>
    </header>
  );
}
