import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";
import useCartContext from "../hooks/useCartContext";
import { checkoutPurchase } from "../api/salesApi";
import { getProducts } from "../api/productsApi";
import { CheckoutContext } from "./CheckoutContext";
import { canSubmitCheckout, createCheckoutSession } from "./checkoutSession";

export default function CheckoutProvider({ children }) {
  const { currentUser, isClient, isCurrentSession, runProtectedRequest, registerSessionCleanup } = useAuthContext();
  const cart = useCartContext();
  const { getCartSnapshot, beginCheckout, clearCartState, refreshCart } = cart;
  const navigate = useNavigate();
  const lastNavigation = useRef(null);
  const store = useMemo(() => createCheckoutSession({ checkoutPurchase,
    createKey: () => globalThis.crypto?.randomUUID?.(),
    onSuccess: (summary) => {
      if (summary.sale.status === "completed") {
        clearCartState();
        // Catalog/detail pages also fetch on entry; refresh stock reads best-effort.
        void Promise.allSettled([refreshCart(), getProducts()]);
      }
    },
  }, { currentUser, isClient, isCurrentSession, runProtectedRequest }, { getCartSnapshot, beginCheckout }),
  [currentUser, isClient, isCurrentSession, runProtectedRequest, getCartSnapshot, beginCheckout, clearCartState, refreshCart]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    if (!snapshot.saleId || !isClient || !isCurrentSession()) { lastNavigation.current = null; return; }
    if (lastNavigation.current === snapshot.saleId) return;
    lastNavigation.current = snapshot.saleId;
    navigate(`/compra/${snapshot.saleId}`, { replace: true });
  }, [snapshot.saleId, isClient, isCurrentSession, navigate]);
  useEffect(() => {
    const unregister = registerSessionCleanup(store.reset);
    return () => { unregister(); store.reset(); };
  }, [store, registerSessionCleanup]);
  const value = useMemo(() => ({ ...snapshot, setField: store.setField, submit: store.submit,
    cancelDraft: store.cancelDraft, startNewPurchase: store.startNewPurchase,
    canSubmit: isClient && canSubmitCheckout(snapshot, cart),
    formLocked: ["submitting", "uncertain", "conflict"].includes(snapshot.status),
  }), [snapshot, store, isClient, cart]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
