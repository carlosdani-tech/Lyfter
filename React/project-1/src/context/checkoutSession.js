import { checkoutSnapshot } from "../api/checkoutValidation.js";

export function initialCheckoutDraft(user) {
  const text = (value) => typeof value === "string" ? value : "";
  return {
    full_name: [text(user?.first_name), text(user?.last_name)].filter(Boolean).join(" "),
    buyer_email: text(user?.email),
    shipping_address: "",
  };
}

export function fieldErrors(details) {
  if (!details || typeof details !== "object") return {};
  const known = ["full_name", "buyer_email", "shipping_address"];
  return Object.fromEntries(known.filter((field) => Object.hasOwn(details, field))
    .map((field) => [field, field === "shipping_address"
      ? (typeof details[field] === "string" && details[field].includes("500")) ? "La dirección de envío debe tener como máximo 500 caracteres." : "Ingresa la dirección de envío."
      : "Revisa este campo e intenta nuevamente."]));
}

export function checkoutError(error) {
  if (error?.status === 409) return "No pudimos conciliar este intento con una compra existente. Conservamos el mismo intento; no se iniciará otra compra automáticamente.";
  if (error?.status === 403) return "No tienes permiso para realizar esta compra.";
  if (error?.status === 400 && /stock|Product not found|no items/.test(error.message || "")) {
    return "El carrito o el stock cambiaron. Revisa el carrito antes de volver a confirmar.";
  }
  if (error?.status === 404) return "Un producto ya no está disponible. Revisa el carrito antes de continuar.";
  if (error?.status === 400) return "No se pudo confirmar la compra. Revisa los datos del formulario.";
  return "No pudimos confirmar el resultado de la compra. Reintenta la misma compra para consultar o completar este intento de forma segura.";
}

export const SNAPSHOT_CONFLICTS = new Set([
  "Checkout cart snapshot does not match the active cart.",
  "Checkout total does not match the current cart total.",
]);

export function canSubmitCheckout(state, cart) {
  if (state.status === "submitting" || ["succeeded", "resolved"].includes(state.status) || cart.loading || cart.checkoutLocked) return false;
  if (["uncertain", "conflict"].includes(state.status)) {
    return !(cart.cart && cart.cart.id !== state.attemptCartId && cart.items.length);
  }
  try { checkoutSnapshot(cart.items, cart.cart?.total); } catch { return false; }
  return Boolean(cart.canCheckout && (state.reviewAfterVersion === null || cart.cartVersion > state.reviewAfterVersion));
}

export function initialCheckoutState(user, ownerKey) {
  return { ownerKey, draft: initialCheckoutDraft(user), status: "editing", error: "",
    fieldErrors: {}, saleId: null, attempt: null, completedCartId: null,
    attemptCartId: null, reviewAfterVersion: null };
}

export function checkoutReducer(state, action) {
  switch (action.type) {
    case "session": return initialCheckoutState(action.user, action.ownerKey);
    case "reset": return initialCheckoutState(action.user, state.ownerKey);
    case "field": {
      if (["submitting", "uncertain", "conflict", "succeeded", "resolved"].includes(state.status) ||
        !["full_name", "buyer_email", "shipping_address"].includes(action.field) || typeof action.value !== "string") return state;
      const errors = { ...state.fieldErrors };
      delete errors[action.field];
      return { ...state, draft: { ...state.draft, [action.field]: action.value }, fieldErrors: errors };
    }
    case "cancel": return { ...state, draft: initialCheckoutDraft(action.user), fieldErrors: {},
      error: "", attempt: null, status: state.status === "rejected" ? "editing" : state.status };
    case "localError": return { ...state, error: action.error, fieldErrors: action.fieldErrors ?? state.fieldErrors,
      status: state.status === "rejected" ? "editing" : state.status };
    case "submitting": return { ...state, attempt: action.attempt, status: "submitting", error: "",
      fieldErrors: {}, attemptCartId: action.attempt.cartId };
    case "failed": return { ...state, status: action.status, error: action.error, fieldErrors: action.fieldErrors,
      attempt: action.snapshotConflict ? null : state.attempt, reviewAfterVersion: action.reviewAfterVersion };
    case "succeeded": return { ...state, status: action.status, saleId: action.saleId,
      completedCartId: action.cartId, attempt: null, draft: initialCheckoutDraft(null), reviewAfterVersion: null };
    case "notice": return { ...state, error: action.error };
    default: return state;
  }
}
