import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";
import * as cartApi from "../api/cartApi";
import { getProducts } from "../api/productsApi";
import { positiveInteger } from "../api/commerceApiUtils";
import { safeDestination } from "../utils/routing";
import { CartContext } from "./CartContext";
import { cartErrorMessage, cartReducer, cartView, initialCartState, normalizeCart } from "./cartSession";

const defaultServices = { ...cartApi, getProducts };

export default function CartProvider({ children, services = defaultServices }) {
  const auth = useAuthContext();
  const { isClient, isAuthenticated, isCurrentSession, runProtectedRequest, registerSessionCleanup } = auth;
  const userId = auth.currentUser?.id;
  const ownerKey = `${auth.sessionVersion}:${userId}:${isClient}`;
  const [state, dispatch] = useReducer(cartReducer, ownerKey, (key) => ({ ...initialCartState(), ownerKey: key }));
  // Adjust this provider's state before rendering consumers; keep their local UI mounted.
  if (state.ownerKey !== ownerKey) dispatch({ type: "session", ownerKey });
  const view = useMemo(() => cartView(state), [state]);
  // Only the latest committed view is mirrored, for the existing synchronous checkout reader.
  const viewRef = useRef(view);
  useLayoutEffect(() => { viewRef.current = view; }, [view]);
  // Queue identities and transport handles are imperative, not a second domain store.
  const work = useRef({ active: true, tail: Promise.resolve(), jobs: new Map(), nextId: 0,
    refresh: null, duplicate: null, checkout: null, ownerKey });
  // Queued mutations need the last server cart even before React commits that response.
  const serverCart = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const getCartSnapshot = useCallback(() => work.current.ownerKey === ownerKey
    ? viewRef.current : cartView(initialCartState()), [ownerKey]);
  const current = useCallback((id) => work.current.active && work.current.ownerKey === ownerKey && work.current.jobs.has(id) &&
    isClient && isCurrentSession(), [ownerKey, isClient, isCurrentSession]);
  const resetCart = useCallback(() => {
    for (const controller of work.current.jobs.values()) controller.abort();
    work.current.jobs.clear();
    work.current.refresh = null; work.current.duplicate = null; work.current.checkout = null;
    serverCart.current = null;
    viewRef.current = cartView(initialCartState(viewRef.current.cartVersion + 1));
    if (work.current.active) dispatch({ type: "reset" });
    // Retain the transport tail: an aborted write may still finish on the server.
  }, []);
  const clearCartState = useCallback(() => {
    if (work.current.ownerKey === ownerKey && work.current.active && isClient && isCurrentSession()) resetCart();
  }, [ownerKey, isClient, isCurrentSession, resetCart]);
  const clearTransientFeedback = useCallback((expected) => {
    if (work.current.active && expected && isCurrentSession()) dispatch({ type: "clearFeedback", expected });
  }, [isCurrentSession]);
  useEffect(() => {
    if (view.accessFeedback && view.accessFeedback.locationKey !== location.key) clearTransientFeedback(view.accessFeedback);
  }, [view.accessFeedback, location.key, clearTransientFeedback]);

  const enqueue = useCallback((operation, { readOnly = false, duplicateKey = null, itemId = null, productId = null } = {}) => {
    if (!work.current.active || !isClient || !isCurrentSession()) return Promise.resolve(null);
    if (work.current.checkout) {
      if (!readOnly) dispatch({ type: "failed", error: "Hay una compra en curso. Espera a que termine antes de modificar el carrito." });
      return Promise.resolve(readOnly ? serverCart.current : null);
    }
    if (duplicateKey && work.current.duplicate?.key === duplicateKey) return work.current.duplicate.promise;
    const id = ++work.current.nextId;
    const controller = new AbortController();
    work.current.jobs.set(id, controller);
    dispatch({ type: "queued", job: { id, itemId, productId }, readOnly });
    const read = () => runProtectedRequest((token) => services.getCart(token, { signal: controller.signal }));
    const accept = (response) => {
      const cart = normalizeCart(response, userId);
      serverCart.current = cart;
      dispatch({ type: "received", cart });
      return cart;
    };
    const availability = async (cart) => {
      if (!cart.items.length) { dispatch({ type: "availability", products: {} }); return; }
      try {
        const products = await services.getProducts({ signal: controller.signal });
        if (!current(id)) return;
        if (!Array.isArray(products)) throw new Error("Invalid product response.");
        const lookup = {};
        for (const product of products) {
          if (Number.isSafeInteger(product.id)) lookup[product.id] = {
            id: product.id, stock: product.stock, is_active: product.is_active, image_url: product.image_url };
        }
        dispatch({ type: "availability", products: lookup });
      } catch (error) {
        if (!current(id)) return;
        if (error.name === "AbortError") { dispatch({ type: "availability", products: null }); return; }
        dispatch({ type: "availability", products: null,
          error: "No se pudo verificar la disponibilidad de los productos. Actualiza el carrito antes de continuar." });
      }
    };
    const promise = work.current.tail.then(async () => {
      if (!current(id)) return null;
      let attemptedWrite = false;
      try {
        if (!readOnly && (!serverCart.current || viewRef.current.isStale)) {
          const response = await read();
          if (!current(id)) return null;
          accept(response);
        }
        attemptedWrite = !readOnly;
        const response = readOnly ? await read() : await operation(serverCart.current, controller.signal);
        if (!current(id)) return null;
        const cart = accept(response);
        await availability(cart);
        if (!current(id)) return null;
        dispatch({ type: "ready" });
        return cart;
      } catch (error) {
        if (!current(id)) return null;
        if (error.name === "AbortError") { serverCart.current = null; dispatch({ type: "aborted" }); return null; }
        let message = readOnly ? "No se pudo cargar el carrito. Intenta nuevamente." : cartErrorMessage(error);
        let stale;
        if (attemptedWrite) {
          dispatch({ type: "reconciling" });
          try {
            const response = await read();
            if (!current(id)) return null;
            const cart = accept(response);
            await availability(cart);
          } catch (recoveryError) {
            if (!current(id)) return null;
            if (recoveryError.name === "AbortError") { dispatch({ type: "aborted" }); return null; }
            // These queued intents were based on an unverified cart; never replay them.
            for (const [queuedId, queuedController] of work.current.jobs) {
              if (queuedId !== id) { queuedController.abort(); work.current.jobs.delete(queuedId); }
            }
            serverCart.current = null;
            dispatch({ type: "discardQueued", id });
            message += " No pudimos confirmar el estado actual. Actualiza el carrito para continuar.";
          }
        } else {
          stale = true;
          serverCart.current = null;
          if (!readOnly) {
            for (const [queuedId, queuedController] of work.current.jobs) {
              if (queuedId !== id) { queuedController.abort(); work.current.jobs.delete(queuedId); }
            }
            dispatch({ type: "discardQueued", id });
          }
        }
        if (!current(id)) return null;
        dispatch({ type: "failed", error: message, stale });
        return null;
      }
    }).finally(() => {
      if (!work.current.jobs.delete(id)) return;
      if (work.current.duplicate?.promise === promise) work.current.duplicate = null;
      if (work.current.active) dispatch({ type: "finished", id });
    });
    work.current.tail = promise;
    work.current.duplicate = duplicateKey ? { key: duplicateKey, promise } : null;
    return promise;
  }, [isClient, isCurrentSession, runProtectedRequest, services, userId, current]);

  const refreshCart = useCallback(() => {
    if (!work.current.active || !isClient || !isCurrentSession() || work.current.ownerKey !== ownerKey) return Promise.resolve(null);
    if (work.current.refresh) return work.current.refresh;
    const promise = enqueue(null, { readOnly: true });
    work.current.refresh = promise;
    void promise.finally(() => { if (work.current.refresh === promise) work.current.refresh = null; });
    return promise;
  }, [enqueue, ownerKey, isClient, isCurrentSession]);
  useEffect(() => {
    const runtime = work.current;
    if (runtime.ownerKey !== ownerKey) { runtime.tail = Promise.resolve(); runtime.ownerKey = ownerKey; }
    runtime.active = true;
    const unregister = registerSessionCleanup?.(resetCart);
    let active = true;
    queueMicrotask(() => { if (active && isClient && viewRef.current.status === "idle") void refreshCart(); });
    return () => { active = false; unregister?.(); runtime.active = false; resetCart(); };
  }, [ownerKey, isClient, registerSessionCleanup, resetCart, refreshCart]);

  const authorize = useCallback((operation) => {
    if (!isAuthenticated) {
      const from = safeDestination(location.pathname + location.search + location.hash) || "/productos";
      navigate("/login", { state: { from, cartReason: "login-required" } });
      return Promise.resolve(null);
    }
    if (!isClient) {
      if (isCurrentSession()) dispatch({ type: "denied", feedback: {
        message: "Los administradores no pueden utilizar el carrito.", locationKey: location.key } });
      return Promise.resolve(null);
    }
    try { return operation(); }
    catch {
      if (work.current.active) dispatch({ type: "failed", error: "La cantidad y el identificador deben ser números enteros positivos válidos." });
      return Promise.resolve(null);
    }
  }, [isAuthenticated, isClient, isCurrentSession, location, navigate]);
  const addItem = useCallback((productId, quantity = 1) => authorize(() => {
    const id = positiveInteger(productId, "product_id"), amount = positiveInteger(quantity, "quantity");
    return enqueue((cart, signal) => runProtectedRequest((token) => services.addCartItem(id, amount, token, { signal })),
      { duplicateKey: `add:${id}:${amount}`, productId: id });
  }), [authorize, enqueue, runProtectedRequest, services]);
  const changeQuantity = useCallback((itemId, quantity, delta = 0) => authorize(() => {
    const id = positiveInteger(itemId, "item_id");
    if (!delta) positiveInteger(quantity, "quantity");
    return enqueue((cart, signal) => {
      const item = cart.items.find((entry) => entry.id === id);
      if (!item) return cart;
      const next = delta ? item.quantity + delta : Number(quantity);
      if (next === item.quantity) return cart;
      if (next === 0 && delta === -1) return runProtectedRequest((token) => services.removeCartItem(id, token, { signal }));
      positiveInteger(next, "quantity");
      return runProtectedRequest((token) => services.updateCartItem(id, next, token, { signal }));
    }, { duplicateKey: delta ? null : `set:${id}:${quantity}`, itemId: id });
  }), [authorize, enqueue, runProtectedRequest, services]);
  const incrementItem = useCallback((id) => changeQuantity(id, null, 1), [changeQuantity]);
  const decrementItem = useCallback((id) => changeQuantity(id, null, -1), [changeQuantity]);
  const setItemQuantity = useCallback((id, quantity) => changeQuantity(id, quantity), [changeQuantity]);
  const removeItem = useCallback((itemId) => authorize(() => {
    const id = positiveInteger(itemId, "item_id");
    return enqueue((cart, signal) => cart.items.some((item) => item.id === id)
      ? runProtectedRequest((token) => services.removeCartItem(id, token, { signal })) : cart,
    { duplicateKey: `remove:${id}`, itemId: id });
  }), [authorize, enqueue, runProtectedRequest, services]);
  const beginCheckout = useCallback(({ retry = false } = {}) => {
    if (!work.current.active || !isClient || !isCurrentSession() || work.current.checkout || work.current.jobs.size ||
      (!retry && !viewRef.current.canCheckout)) return null;
    const lock = {};
    work.current.checkout = lock;
    dispatch({ type: "lock", locked: true });
    return () => {
      if (!work.current.active || work.current.checkout !== lock) return;
      work.current.checkout = null;
      dispatch({ type: "lock", locked: false });
    };
  }, [isClient, isCurrentSession]);
  const value = useMemo(() => ({ ...view, getCartSnapshot, refreshCart, clearCartState,
    clearTransientFeedback, addItem, incrementItem, decrementItem, setItemQuantity, removeItem, beginCheckout }),
  [view, getCartSnapshot, refreshCart, clearCartState, clearTransientFeedback, addItem, incrementItem,
    decrementItem, setItemQuantity, removeItem, beginCheckout]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
