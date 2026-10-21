import { positiveInteger } from "../api/commerceApiUtils";
import { formatDecimalColones } from "../utils/formatters";
import { canCheckoutCart } from "../utils/cartPresentation";

export function cartErrorMessage(error) {
  if (error?.message === "Quantity cannot be greater than available stock.") {
    return "La cantidad solicitada supera el stock disponible. Revisamos tu carrito.";
  }
  if (error?.status === 403) return "No tienes permiso para modificar este carrito.";
  if (error?.status === 404) return "El producto o artículo ya no está disponible. Revisamos tu carrito.";
  if (error?.status === 400) return "Revisa el producto y la cantidad solicitada.";
  return "No se pudo actualizar el carrito. Verifica su estado antes de volver a intentarlo.";
}

export function normalizeCart(cart, userId) {
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
    return { ...item };
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!Number.isSafeInteger(itemCount)) throw new Error("Invalid cart count response.");
  return { ...cart, items };
}

export function initialCartState(cartVersion = 0) {
  return { cart: null, pending: [], status: "idle", error: "", isStale: false,
    accessFeedback: null, productsById: null, productError: "", notice: "",
    checkoutLocked: false, cartVersion };
}

export function cartReducer(state, action) {
  switch (action.type) {
    case "session": return { ...initialCartState(), ownerKey: action.ownerKey };
    case "reset": return { ...initialCartState(state.cartVersion + 1), ownerKey: state.ownerKey };
    case "queued": return { ...state, pending: [...state.pending, action.job],
      status: action.readOnly ? "loading" : "updating", error: "", notice: "", accessFeedback: null };
    case "finished": return { ...state, pending: state.pending.filter((job) => job.id !== action.id) };
    case "discardQueued": return { ...state, pending: state.pending.filter((job) => job.id === action.id) };
    case "received": return { ...state, cart: action.cart, cartVersion: state.cartVersion + 1, isStale: false,
      notice: state.cart?.items.some((item) => !action.cart.items.some((entry) => entry.id === item.id))
        ? "Uno o más artículos ya no aparecen en el carrito. Revisa el total actualizado." : "Carrito actualizado." };
    case "availability": return { ...state, productsById: action.products, productError: action.error || "" };
    case "ready": return { ...state, status: "ready", error: "" };
    case "reconciling": return { ...state, status: "reconciling", isStale: true };
    case "failed": return { ...state, status: "error", error: action.error, isStale: action.stale ?? state.isStale };
    case "aborted": return { ...state, status: state.cart ? "ready" : "idle", isStale: true };
    case "lock": return { ...state, checkoutLocked: action.locked };
    case "denied": return { ...state, accessFeedback: action.feedback };
    case "clearFeedback": return state.accessFeedback === action.expected ? { ...state, accessFeedback: null } : state;
    default: return state;
  }
}

export function cartView(state) {
  const items = state.cart?.items || [];
  const totals = { subtotal: state.cart?.subtotal || "0.00", total: state.cart?.total || "0.00" };
  const view = { ...state, items, totals,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0), loading: state.pending.length > 0,
    displayTotals: { subtotal: formatDecimalColones(totals.subtotal), total: formatDecimalColones(totals.total) },
    pendingItemIds: [...new Set(state.pending.map((job) => job.itemId).filter((id) => id != null))],
    pendingProductIds: [...new Set(state.pending.map((job) => job.productId).filter((id) => id != null))] };
  delete view.pending;
  delete view.ownerKey;
  return { ...view, canCheckout: !state.checkoutLocked && canCheckoutCart(view) };
}
