import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";
import useCartContext from "../hooks/useCartContext";
import { checkoutPurchase } from "../api/salesApi";
import { getProducts } from "../api/productsApi";
import { checkoutBody } from "../api/checkoutValidation.js";
import { purchaseSummary } from "../utils/purchase";
import { CheckoutContext } from "./CheckoutContext";
import { canSubmitCheckout, checkoutError, checkoutReducer, fieldErrors, initialCheckoutState, SNAPSHOT_CONFLICTS } from "./checkoutSession";

const defaultServices = { checkoutPurchase, getProducts, createKey: () => globalThis.crypto?.randomUUID?.() };

export default function CheckoutProvider({ children, services = defaultServices }) {
  const { currentUser, sessionVersion, isClient, isCurrentSession, runProtectedRequest, registerSessionCleanup } = useAuthContext();
  const cart = useCartContext();
  const { getCartSnapshot, beginCheckout, clearCartState, refreshCart } = cart;
  const ownerKey = `${sessionVersion}:${currentUser?.id}:${isClient}`;
  const [state, dispatch] = useReducer(checkoutReducer, { currentUser, ownerKey },
    (initial) => initialCheckoutState(initial.currentUser, initial.ownerKey));
  if (state.ownerKey !== ownerKey) dispatch({ type: "session", user: currentUser, ownerKey });
  // Stable actions read the last committed draft/attempt; this ref never owns transitions.
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; }, [state]);
  const work = useRef({ active: true, request: null, background: new Set() });
  const lastNavigation = useRef(null);
  const navigate = useNavigate();
  const cancelRequests = useCallback(() => {
    work.current.request?.controller.abort();
    work.current.request?.unlock();
    work.current.request = null;
    for (const controller of work.current.background) controller.abort();
    work.current.background.clear();
  }, []);
  const reset = useCallback(() => {
    cancelRequests();
    stateRef.current = initialCheckoutState(null, stateRef.current.ownerKey);
    if (work.current.active) dispatch({ type: "reset", user: null });
    lastNavigation.current = null;
  }, [cancelRequests]);
  useEffect(() => {
    const runtime = work.current;
    runtime.active = true;
    const unregister = registerSessionCleanup?.(reset);
    return () => { unregister?.(); runtime.active = false; cancelRequests(); };
  }, [ownerKey, registerSessionCleanup, reset, cancelRequests]);
  useEffect(() => {
    if (!state.saleId || !isClient || !isCurrentSession()) { lastNavigation.current = null; return; }
    if (lastNavigation.current === state.saleId) return;
    lastNavigation.current = state.saleId;
    navigate(`/compra/${state.saleId}`, { replace: true });
  }, [state.saleId, isClient, isCurrentSession, navigate]);
  const ownsSession = useCallback(() => work.current.active && stateRef.current.ownerKey === ownerKey &&
    isClient && isCurrentSession(), [ownerKey, isClient, isCurrentSession]);
  const setField = useCallback((field, value) => {
    if (!ownsSession() || work.current.request) return;
    dispatch({ type: "field", field, value });
  }, [ownsSession]);
  const cancelDraft = useCallback(() => {
    if (!ownsSession() || work.current.request ||
      ["uncertain", "conflict"].includes(stateRef.current.status)) return;
    dispatch({ type: "cancel", user: currentUser });
  }, [ownsSession, currentUser]);
  const startNewPurchase = useCallback(() => {
    if (!ownsSession() || work.current.request) return;
    const snapshot = stateRef.current, cartState = getCartSnapshot();
    if (!["succeeded", "resolved"].includes(snapshot.status) || !cartState.canCheckout ||
      cartState.cart.id === snapshot.completedCartId) return;
    dispatch({ type: "reset", user: currentUser });
  }, [ownsSession, getCartSnapshot, currentUser]);
  const submit = useCallback(() => {
    if (!ownsSession()) return Promise.resolve(null);
    if (work.current.request) return work.current.request.promise;
    const snapshot = stateRef.current, cartState = getCartSnapshot();
    if (!canSubmitCheckout(snapshot, cartState)) {
      dispatch({ type: "localError", error: "Revisa el carrito y espera a que termine de actualizarse antes de confirmar." });
      return Promise.resolve(null);
    }
    const retry = ["uncertain", "conflict"].includes(snapshot.status);
    let payload = retry ? snapshot.attempt.payload : snapshot.draft;
    const missing = {};
    for (const field of ["full_name", "buyer_email", "shipping_address"]) {
      if (!payload[field].trim()) missing[field] = field === "shipping_address"
        ? "Ingresa la dirección de envío." : "Este campo es obligatorio.";
    }
    if (Object.keys(missing).length) {
      dispatch({ type: "localError", error: "Completa los campos obligatorios.", fieldErrors: missing });
      return Promise.resolve(null);
    }
    try {
      if (!retry) payload = checkoutBody({ ...payload, items: cartState.items, total_amount: cartState.cart.total });
    } catch (error) {
      dispatch({ type: "localError", error: "No se pudo preparar la compra. Revisa los datos y el carrito.", fieldErrors: fieldErrors(error.details) });
      return Promise.resolve(null);
    }
    let attempt = snapshot.attempt;
    if (!retry && attempt && (attempt.cartVersion !== cartState.cartVersion ||
      JSON.stringify(attempt.payload) !== JSON.stringify(payload))) attempt = null;
    if (!attempt) {
      let key;
      try { key = services.createKey(); } catch { key = null; }
      if (typeof key !== "string" || !key || key.length > 128 || /[^A-Za-z0-9._:-]/.test(key)) {
        dispatch({ type: "localError", error: "No se pudo preparar la compra. Usa un navegador compatible e intenta nuevamente." });
        return Promise.resolve(null);
      }
      attempt = { key, payload, cartId: cartState.cart.id, cartVersion: cartState.cartVersion };
    }
    const unlock = beginCheckout({ retry });
    if (!unlock) {
      dispatch({ type: "localError", error: "Espera a que termine la actualización del carrito." });
      return Promise.resolve(null);
    }
    const request = { controller: new AbortController(), unlock, promise: null };
    work.current.request = request; // Close the same-event double-click window before React renders.
    const current = () => ownsSession() && work.current.request === request;
    dispatch({ type: "submitting", attempt });
    request.promise = Promise.resolve().then(async () => {
      try {
        if (!current()) return null;
        const data = await runProtectedRequest((token) => services.checkoutPurchase(attempt.payload, token, attempt.key,
          { signal: request.controller.signal }));
        if (!current()) return null;
        const summary = purchaseSummary(data);
        if (!summary || summary.sale.user_id !== currentUser.id || summary.sale.cart_id !== attempt.cartId) throw { status: 502 };
        dispatch({ type: "succeeded", status: summary.sale.status === "completed" ? "succeeded" : "resolved",
          saleId: summary.sale.id, cartId: attempt.cartId });
        try {
          if (summary.sale.status === "completed") {
            clearCartState?.();
            const controller = new AbortController();
            work.current.background.add(controller);
            void Promise.allSettled([refreshCart?.(), services.getProducts({ signal: controller.signal })])
              .finally(() => work.current.background.delete(controller));
          }
          services.onSuccess?.(summary);
        } catch { dispatch({ type: "notice", error: "La compra fue registrada. Abre su confirmación para consultar el detalle." }); }
        return summary;
      } catch (error) {
        if (!current()) return null;
        const snapshotConflict = error?.status === 409 && SNAPSHOT_CONFLICTS.has(error.message);
        const uncertain = !snapshotConflict && ![400, 403, 404].includes(error?.status);
        const needsReview = snapshotConflict || error?.status === 404 ||
          (error?.status === 400 && /stock|Product not found|no items/.test(error.message || ""));
        dispatch({ type: "failed", status: error?.status === 409 && !snapshotConflict ? "conflict" : uncertain ? "uncertain" : "rejected",
          error: snapshotConflict ? "El carrito cambió desde que se preparó la compra. Revisa los productos y vuelve a intentarlo." : checkoutError(error),
          fieldErrors: fieldErrors(error?.details), snapshotConflict,
          reviewAfterVersion: needsReview ? getCartSnapshot().cartVersion : null });
        if (snapshotConflict) {
          unlock();
          try { await refreshCart(); } catch { /* Failed refresh keeps explicit review blocked. */ }
        }
        return null;
      } finally {
        unlock();
        if (work.current.request === request) work.current.request = null;
      }
    });
    return request.promise;
  }, [ownsSession, getCartSnapshot, beginCheckout, services, runProtectedRequest,
    currentUser, clearCartState, refreshCart]);
  const value = useMemo(() => ({ draft: state.draft, status: state.status, error: state.error, fieldErrors: state.fieldErrors,
    saleId: state.saleId, attemptCartId: state.attemptCartId, reviewAfterVersion: state.reviewAfterVersion,
    setField, submit, cancelDraft, startNewPurchase, canSubmit: isClient && canSubmitCheckout(state, cart),
    formLocked: ["submitting", "uncertain", "conflict"].includes(state.status) }),
  [state, setField, submit, cancelDraft, startNewPurchase, isClient, cart]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
