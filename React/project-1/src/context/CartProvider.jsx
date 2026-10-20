import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";
import * as cartApi from "../api/cartApi";
import { getProducts } from "../api/productsApi";
import { safeDestination } from "../utils/routing";
import { CartContext } from "./CartContext";
import { createCartSession } from "./cartSession";

const api = { ...cartApi, getProducts };

export default function CartProvider({ children }) {
  const auth = useAuthContext();
  const { isClient, isCurrentSession, runProtectedRequest, registerSessionCleanup } = auth;
  const userId = auth.currentUser?.id;
  // Switch stores during render, before effects, while retaining public page state.
  const store = useMemo(() => createCartSession(api, {
    isClient, userId, isCurrentSession, runProtectedRequest,
  }), [isClient, userId, isCurrentSession, runProtectedRequest]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const navigate = useNavigate();
  const location = useLocation();
  const accessFeedback = snapshot.accessFeedback;
  useEffect(() => {
    if (accessFeedback && accessFeedback.locationKey !== location.key) {
      store.clearTransientFeedback(accessFeedback);
    }
  }, [accessFeedback, location.key, store]);
  useEffect(() => {
    let active = true;
    const unregister = registerSessionCleanup(store.clearCartState);
    // StrictMode's simulated setup/cleanup must not issue duplicate initial reads.
    queueMicrotask(() => {
      if (active && isClient && store.getSnapshot().status === "idle") void store.refreshCart();
    });
    return () => { active = false; unregister(); store.clearCartState(); };
  }, [store, isClient, registerSessionCleanup]);
  const value = useMemo(() => {
    const authorize = (action) => (...args) => {
      if (!auth.isAuthenticated) {
        const from = safeDestination(location.pathname + location.search + location.hash) || "/productos";
        navigate("/login", { state: { from, cartReason: "login-required" } });
        return Promise.resolve(null);
      }
      if (!auth.isClient) return store.denyAccess("Los administradores no pueden utilizar el carrito.", location.key);
      return action(...args);
    };
    return {
      ...snapshot,
      refreshCart: store.refreshCart,
      clearTransientFeedback: store.clearTransientFeedback,
      getCartSnapshot: store.getSnapshot,
      beginCheckout: store.beginCheckout,
      addItem: authorize(store.addItem), incrementItem: authorize(store.incrementItem),
      decrementItem: authorize(store.decrementItem), setItemQuantity: authorize(store.setItemQuantity),
      removeItem: authorize(store.removeItem), clearCartState: store.clearCartState,
    };
  }, [snapshot, store, auth.isAuthenticated, auth.isClient, location, navigate]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
