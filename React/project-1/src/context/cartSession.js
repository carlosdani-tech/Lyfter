import { positiveInteger } from "../api/commerceApiUtils";
import { formatDecimalColones } from "../utils/formatters";
import { canCheckoutCart } from "../utils/cartPresentation";

const EMPTY_ITEMS = Object.freeze([]);
const EMPTY_TOTALS = Object.freeze({ subtotal: "0.00", total: "0.00" });
const EMPTY_DISPLAY_TOTALS = Object.freeze({ subtotal: formatDecimalColones("0.00"), total: formatDecimalColones("0.00") });

function cartErrorMessage(error) {
  if (error?.message === "Quantity cannot be greater than available stock.") {
    return "La cantidad solicitada supera el stock disponible. Revisamos tu carrito.";
  }
  if (error?.status === 403) return "No tienes permiso para modificar este carrito.";
  if (error?.status === 404) return "El producto o artículo ya no está disponible. Revisamos tu carrito.";
  if (error?.status === 400) return "Revisa el producto y la cantidad solicitada.";
  return "No se pudo actualizar el carrito. Verifica su estado antes de volver a intentarlo.";
}

function immutableCart(cart, userId) {
  const validMoney = (value) => typeof value === "string" && !/\s/.test(value) && /^(0|[1-9]\d*)\.\d{2}$/.test(value);
  if (!cart || cart.user_id !== userId || cart.status !== "active" || !Array.isArray(cart.items) ||
    !validMoney(cart.subtotal) || !validMoney(cart.total)) throw new Error("Invalid cart response.");
  positiveInteger(cart.id, "cart_id");
  const items = cart.items.map((item) => {
    if (!validMoney(item.unit_price) || !validMoney(item.line_total) || typeof item.name !== "string") {
      throw new Error("Invalid cart item response.");
    }
    positiveInteger(item.id, "item_id");
    positiveInteger(item.product_id, "product_id");
    positiveInteger(item.quantity, "quantity");
    if (![item.id, item.product_id, item.quantity].every((value) => typeof value === "number")) {
      throw new Error("Invalid cart integer response.");
    }
    return Object.freeze({ ...item });
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!Number.isSafeInteger(itemCount)) throw new Error("Invalid cart count response.");
  return { cart: Object.freeze({ ...cart, items: Object.freeze(items) }), itemCount };
}

// One queue is necessary because every endpoint returns the entire cart.
export function createCartSession(api, session) {
  let revision = 0;
  let writeFence = 0;
  let pending = 0;
  let checkoutLocked = false;
  let cartVersion = 0;
  let tail = Promise.resolve();
  let refreshPromise = null;
  let lastQueued = null;
  const pendingItems = new Map();
  const pendingProducts = new Map();
  const listeners = new Set();
  const empty = () => Object.freeze({
    cart: null, items: EMPTY_ITEMS, itemCount: 0, totals: EMPTY_TOTALS,
    displayTotals: EMPTY_DISPLAY_TOTALS, loading: false, error: "", status: "idle", isStale: false,
    accessFeedback: null,
    pendingItemIds: EMPTY_ITEMS, pendingProductIds: EMPTY_ITEMS,
    productsById: null, productError: "", canCheckout: false, notice: "",
    checkoutLocked: false, cartVersion,
  });
  let snapshot = empty();
  const publish = (patch) => {
    const next = { ...snapshot, ...patch };
    snapshot = Object.freeze({ ...next, canCheckout: !next.checkoutLocked && canCheckoutCart(next) });
    listeners.forEach((listener) => listener());
  };
  const current = (ticket) => ticket === revision && session.isClient && session.isCurrentSession();
  const read = () => session.runProtectedRequest((token) => api.getCart(token));
  const accept = (response) => {
    const { cart, itemCount } = immutableCart(response, session.userId);
    const removed = snapshot.items.some((item) => !cart.items.some((entry) => entry.id === item.id));
    cartVersion += 1;
    publish({ cart, items: cart.items, itemCount, isStale: false,
      cartVersion,
      notice: removed ? "Uno o más artículos ya no aparecen en el carrito. Revisa el total actualizado." : "Carrito actualizado.",
      totals: Object.freeze({ subtotal: cart.subtotal, total: cart.total }),
      displayTotals: Object.freeze({ subtotal: formatDecimalColones(cart.subtotal), total: formatDecimalColones(cart.total) }),
    });
    return cart;
  };
  const loadProductAvailability = async (ticket) => {
    if (!snapshot.items.length) {
      publish({ productsById: Object.freeze({}), productError: "" });
      return;
    }
    try {
      const products = await api.getProducts();
      if (!current(ticket)) return;
      if (!Array.isArray(products)) throw new Error("Invalid product response.");
      const lookup = {};
      for (const product of products) {
        if (Number.isSafeInteger(product.id)) lookup[product.id] = Object.freeze({
          id: product.id, stock: product.stock, is_active: product.is_active, image_url: product.image_url,
        });
      }
      publish({ productsById: Object.freeze(lookup), productError: "" });
    } catch {
      if (current(ticket)) publish({ productsById: null,
        productError: "No se pudo verificar la disponibilidad de los productos. Actualiza el carrito antes de continuar.",
      });
    }
  };
  const clearCartState = () => {
    revision += 1;
    writeFence += 1;
    pending = 0;
    checkoutLocked = false;
    cartVersion += 1;
    // Keep the transport tail: clearing must not overlap a still-running write.
    refreshPromise = null;
    lastQueued = null;
    pendingItems.clear();
    pendingProducts.clear();
    snapshot = empty();
    listeners.forEach((listener) => listener());
  };
  // Access feedback belongs to one route; operational errors retain their recovery state.
  const denyAccess = (message, locationKey) => {
    if (session.isCurrentSession()) publish({ accessFeedback: Object.freeze({ message, locationKey }) });
    return Promise.resolve(null);
  };
  const clearTransientFeedback = (expectedFeedback) => {
    // Object identity protects newer alerts, including after a session reset.
    if (session.isCurrentSession() && expectedFeedback && snapshot.accessFeedback === expectedFeedback) {
      publish({ accessFeedback: null });
    }
  };
  const rejectOperation = (message) => { publish({ error: message, status: "error" }); return Promise.resolve(null); };

  const enqueue = (operation, { readOnly = false, duplicateKey = null, itemId = null, productId = null } = {}) => {
    if (!session.isClient || !session.isCurrentSession()) return Promise.resolve(null);
    if (checkoutLocked) return readOnly ? Promise.resolve(snapshot.cart)
      : rejectOperation("Hay una compra en curso. Espera a que termine antes de modificar el carrito.");
    if (duplicateKey && lastQueued?.key === duplicateKey) return lastQueued.promise;
    const ticket = revision;
    const fence = writeFence;
    pending += 1;
    if (itemId !== null) pendingItems.set(itemId, (pendingItems.get(itemId) ?? 0) + 1);
    if (productId !== null) pendingProducts.set(productId, (pendingProducts.get(productId) ?? 0) + 1);
    publish({ loading: true, error: "", accessFeedback: null, notice: "", status: readOnly ? "loading" : "updating",
      pendingItemIds: Object.freeze([...pendingItems.keys()]),
      pendingProductIds: Object.freeze([...pendingProducts.keys()]),
    });
    const promise = tail.then(async () => {
      if (!current(ticket) || fence !== writeFence) return null;
      let attemptedWrite = false;
      try {
        if (!readOnly && (!snapshot.cart || snapshot.isStale)) {
          const data = await read();
          if (!current(ticket)) return null;
          accept(data);
        }
        if (!current(ticket)) return null;
        attemptedWrite = !readOnly;
        const data = await operation(snapshot.cart);
        if (!current(ticket)) return null;
        const cart = accept(data);
        await loadProductAvailability(ticket);
        if (!current(ticket)) return null;
        publish({ error: "", status: "ready" });
        return cart;
      } catch (error) {
        if (!current(ticket)) return null;
        let message = readOnly ? "No se pudo cargar el carrito. Intenta nuevamente." : cartErrorMessage(error);
        if (attemptedWrite) {
          // Never replay a POST after an uncertain outcome; read what actually committed.
          publish({ status: "reconciling", isStale: true });
          try {
            const data = await read();
            if (!current(ticket)) return null;
            accept(data);
            await loadProductAvailability(ticket);
            if (!current(ticket)) return null;
          } catch {
            if (!current(ticket)) return null;
            writeFence += 1; // Discard queued writes based on an unverifiable state.
            message += " No pudimos confirmar el estado actual. Actualiza el carrito para continuar.";
          }
        } else {
          publish({ isStale: true });
          if (!readOnly) writeFence += 1;
        }
        publish({ error: message, status: "error" });
        return null;
      }
    }).finally(() => {
      if (ticket !== revision) return;
      pending -= 1;
      if (itemId !== null) {
        const remaining = (pendingItems.get(itemId) ?? 1) - 1;
        if (remaining) pendingItems.set(itemId, remaining);
        else pendingItems.delete(itemId);
      }
      if (productId !== null) {
        const remaining = (pendingProducts.get(productId) ?? 1) - 1;
        if (remaining) pendingProducts.set(productId, remaining);
        else pendingProducts.delete(productId);
      }
      if (lastQueued?.promise === promise) lastQueued = null;
      publish({ loading: pending > 0, pendingItemIds: Object.freeze([...pendingItems.keys()]),
        pendingProductIds: Object.freeze([...pendingProducts.keys()]),
      });
    });
    tail = promise;
    lastQueued = duplicateKey ? { key: duplicateKey, promise } : null;
    return promise;
  };

  const refreshCart = () => {
    if (refreshPromise) return refreshPromise;
    const promise = enqueue(read, { readOnly: true });
    refreshPromise = promise;
    void promise.finally(() => { if (refreshPromise === promise) refreshPromise = null; });
    return promise;
  };
  const validate = (callback) => {
    try { return callback(); }
    catch { return rejectOperation("La cantidad y el identificador deben ser números enteros positivos válidos."); }
  };
  const addItem = (productId, quantity = 1) => validate(() => {
    const id = positiveInteger(productId, "product_id");
    const amount = positiveInteger(quantity, "quantity");
    return enqueue(() => session.runProtectedRequest((token) => api.addCartItem(id, amount, token)),
      { duplicateKey: `add:${id}:${amount}`, productId: id });
  });
  const changeQuantity = (itemId, quantity, delta = 0) => validate(() => {
    const id = positiveInteger(itemId, "item_id");
    if (!delta) positiveInteger(quantity, "quantity");
    return enqueue((cart) => {
      const item = cart.items.find((entry) => entry.id === id);
      if (!item) return cart; // Already removed, including repeated decrement-at-one clicks.
      const next = delta ? item.quantity + delta : Number(quantity);
      if (next === item.quantity) return cart;
      if (next === 0 && delta === -1) return session.runProtectedRequest((token) => api.removeCartItem(id, token));
      positiveInteger(next, "quantity");
      return session.runProtectedRequest((token) => api.updateCartItem(id, next, token));
    }, { duplicateKey: delta ? null : `set:${id}:${quantity}`, itemId: id });
  });
  const removeItem = (itemId) => validate(() => {
    const id = positiveInteger(itemId, "item_id");
    return enqueue((cart) => cart.items.some((item) => item.id === id)
      ? session.runProtectedRequest((token) => api.removeCartItem(id, token)) : cart,
    { duplicateKey: `remove:${id}`, itemId: id });
  });

  const beginCheckout = ({ retry = false } = {}) => {
    if (!session.isClient || !session.isCurrentSession() || checkoutLocked || pending || (!retry && !snapshot.canCheckout)) return null;
    const ticket = revision;
    checkoutLocked = true;
    publish({ checkoutLocked: true });
    return () => {
      if (ticket !== revision) return;
      checkoutLocked = false;
      publish({ checkoutLocked: false });
    };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    refreshCart, addItem, removeItem, clearCartState, denyAccess, clearTransientFeedback, beginCheckout,
    incrementItem: (id) => changeQuantity(id, null, 1),
    decrementItem: (id) => changeQuantity(id, null, -1),
    setItemQuantity: (id, quantity) => changeQuantity(id, quantity),
  };
}
