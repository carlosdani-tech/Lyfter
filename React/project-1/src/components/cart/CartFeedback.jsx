import useAuthContext from "../../hooks/useAuthContext";
import useCartContext from "../../hooks/useCartContext";
import { useLocation } from "react-router-dom";

export default function CartFeedback() {
  const { isClient } = useAuthContext();
  const { error, accessFeedback, isStale, loading, refreshCart } = useCartContext();
  const location = useLocation();
  // Location keys include the initial "default" entry. Hide before effect cleanup.
  const accessMessage = accessFeedback?.locationKey === location.key ? accessFeedback.message : "";
  const message = accessMessage || error;
  if (!message || /^\/carrito\/?$/.test(location.pathname)) return null;
  return (
    <div className="access-message" role="alert">
      <span>{message}</span>
      {isClient && isStale && <button type="button" className="home__link cart-refresh"
        disabled={loading} onClick={() => { void refreshCart(); }}>Actualizar carrito</button>}
    </div>
  );
}
