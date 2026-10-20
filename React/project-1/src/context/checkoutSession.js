import { purchaseSummary } from "../utils/purchase.js";

const ADDRESS_FIELDS = ["line1", "line2", "city", "province", "postal_code", "country"];
export function initialCheckoutDraft(user) {
  const text = (value) => typeof value === "string" ? value : "";
  return Object.freeze({
    full_name: [text(user?.first_name), text(user?.last_name)].filter(Boolean).join(" "),
    buyer_email: text(user?.email),
    shipping_address: Object.freeze({ line1: "", line2: "", city: "", province: "", postal_code: "", country: "CR" }),
  });
}

function normalizedBuyer(draft) {
  return Object.freeze({ full_name: draft.full_name.trim(), buyer_email: draft.buyer_email.trim(),
    shipping_address: Object.freeze(Object.fromEntries(ADDRESS_FIELDS.map((field) => {
      const value = draft.shipping_address[field].trim();
      return [field, field === "line2" ? value || null : field === "country" ? value.toUpperCase() : value];
    }))),
  });
}

function fieldErrors(details) {
  if (!details || typeof details !== "object") return {};
  const known = ["full_name", "buyer_email", ...ADDRESS_FIELDS.map((field) => `shipping_address.${field}`)];
  return Object.fromEntries(known.filter((field) => Object.hasOwn(details, field))
    .map((field) => [field, "Revisa este campo e intenta nuevamente."]));
}

function checkoutError(error) {
  if (error?.status === 409) return "No pudimos conciliar este intento con una compra existente. Conservamos el mismo intento; no se iniciará otra compra automáticamente.";
  if (error?.status === 403) return "No tienes permiso para realizar esta compra.";
  if (error?.status === 400 && /stock|Product not found|no items/.test(error.message || "")) {
    return "El carrito o el stock cambiaron. Revisa el carrito antes de volver a confirmar.";
  }
  if (error?.status === 404) return "Un producto ya no está disponible. Revisa el carrito antes de continuar.";
  if (error?.status === 400) return "No se pudo confirmar la compra. Revisa los datos del formulario.";
  return "No pudimos confirmar el resultado de la compra. Reintenta la misma compra para consultar o completar este intento de forma segura.";
}

export function canSubmitCheckout(state, cart) {
  if (state.status === "submitting" || ["succeeded", "resolved"].includes(state.status) || cart.loading || cart.checkoutLocked) return false;
  if (["uncertain", "conflict"].includes(state.status)) {
    return !(cart.cart && cart.cart.id !== state.attemptCartId && cart.items.length);
  }
  return Boolean(cart.canCheckout && (state.reviewAfterVersion === null || cart.cartVersion > state.reviewAfterVersion));
}

// Provider-owned memory only. An ambiguous attempt survives route changes, never logout.
export function createCheckoutSession(services, auth, cart) {
  let revision = 0;
  let attempt = null;
  let inFlight = null;
  let locked = false;
  let release = null;
  let completedCartId = null;
  const listeners = new Set();
  const empty = (user) => Object.freeze({ draft: initialCheckoutDraft(user), status: "editing", error: "",
    fieldErrors: Object.freeze({}), saleId: null, attemptCartId: null, reviewAfterVersion: null });
  let snapshot = empty(auth.currentUser);
  const publish = (patch) => {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    listeners.forEach((listener) => listener());
  };
  // A new local failure is form guidance, not another rejected purchase request.
  const publishLocalError = (patch) => publish({ ...patch,
    status: snapshot.status === "rejected" ? "editing" : snapshot.status });
  const reset = () => {
    revision += 1;
    release?.(); release = null;
    attempt = null; inFlight = null; locked = false; completedCartId = null;
    snapshot = empty(null);
    listeners.forEach((listener) => listener());
  };
  const current = (ticket) => ticket === revision && auth.isClient && auth.isCurrentSession();
  const setField = (field, value) => {
    if (locked || ["uncertain", "conflict", "succeeded", "resolved"].includes(snapshot.status) || typeof value !== "string") return;
    const errors = { ...snapshot.fieldErrors }; delete errors[field];
    if (["full_name", "buyer_email"].includes(field)) publish({ draft: Object.freeze({ ...snapshot.draft, [field]: value }), fieldErrors: Object.freeze(errors) });
    else if (field.startsWith("shipping_address.") && ADDRESS_FIELDS.includes(field.slice(17))) {
      const name = field.slice(17);
      publish({ draft: Object.freeze({ ...snapshot.draft,
        shipping_address: Object.freeze({ ...snapshot.draft.shipping_address, [name]: value }) }), fieldErrors: Object.freeze(errors) });
    }
  };
  const cancelDraft = () => {
    if (locked || ["uncertain", "conflict"].includes(snapshot.status)) return;
    if (attempt) attempt.payload = null;
    publish({ draft: initialCheckoutDraft(auth.currentUser), fieldErrors: Object.freeze({}), error: "",
      status: snapshot.status === "rejected" ? "editing" : snapshot.status });
  };
  const startNewPurchase = () => {
    const state = cart.getCartSnapshot();
    if (locked || !["succeeded", "resolved"].includes(snapshot.status) || !state.canCheckout || state.cart.id === completedCartId) return;
    attempt = null;
    snapshot = empty(auth.currentUser);
    listeners.forEach((listener) => listener());
  };
  const submit = () => {
    if (locked) return inFlight || Promise.resolve(null);
    if (!auth.isClient || !auth.isCurrentSession()) return Promise.resolve(null);
    const cartState = cart.getCartSnapshot();
    if (!canSubmitCheckout(snapshot, cartState)) {
      publishLocalError({ error: "Revisa el carrito y espera a que termine de actualizarse antes de confirmar." });
      return Promise.resolve(null);
    }
    const retry = ["uncertain", "conflict"].includes(snapshot.status);
    const payload = retry ? attempt.payload : normalizedBuyer(snapshot.draft);
    const missing = {};
    for (const [field, value] of Object.entries(payload)) {
      if (field !== "shipping_address" && !value) missing[field] = "Este campo es obligatorio.";
    }
    for (const field of ADDRESS_FIELDS.filter((name) => name !== "line2")) {
      if (!payload.shipping_address[field]) missing[`shipping_address.${field}`] = "Este campo es obligatorio.";
    }
    if (Object.keys(missing).length) {
      publishLocalError({ error: "Completa los campos obligatorios.", fieldErrors: Object.freeze(missing) });
      return Promise.resolve(null);
    }
    if (!attempt) {
      let key;
      try { key = services.createKey(); } catch { key = null; }
      if (typeof key !== "string" || !key || key.length > 128 || /[^A-Za-z0-9._:-]/.test(key)) {
        publishLocalError({ error: "No se pudo preparar la compra. Usa un navegador compatible e intenta nuevamente." });
        return Promise.resolve(null);
      }
      attempt = { key, payload, cartId: cartState.cart.id };
    } else if (!retry) { attempt.payload = payload; attempt.cartId = cartState.cart.id; }
    const unlock = cart.beginCheckout({ retry });
    if (!unlock) {
      publishLocalError({ error: "Espera a que termine la actualización del carrito." });
      return Promise.resolve(null);
    }
    release = unlock;
    const ticket = revision;
    locked = true;
    publish({ status: "submitting", error: "", fieldErrors: Object.freeze({}), attemptCartId: attempt.cartId });
    const promise = Promise.resolve().then(async () => {
      try {
        if (!current(ticket)) return null;
        const data = await auth.runProtectedRequest((token) => services.checkoutPurchase(attempt.payload, token, attempt.key));
        if (!current(ticket)) return null;
        const summary = purchaseSummary(data);
        if (!summary || summary.sale.user_id !== auth.currentUser.id || summary.sale.cart_id !== attempt.cartId) {
          throw { status: 502 };
        }
        completedCartId = attempt.cartId;
        attempt = null; // Drop key and buyer/address snapshots after verification.
        publish({ status: summary.sale.status === "completed" ? "succeeded" : "resolved",
          saleId: summary.sale.id, draft: initialCheckoutDraft(null), reviewAfterVersion: null });
        // A post-purchase refresh/navigation failure must never become checkout failure.
        try { services.onSuccess(summary); }
        catch { publish({ error: "La compra fue registrada. Abre su confirmación para consultar el detalle." }); }
        return summary;
      } catch (error) {
        if (!current(ticket)) return null;
        const uncertain = ![400, 403, 404].includes(error?.status);
        const needsReview = error?.status === 404 || (error?.status === 400 && /stock|Product not found|no items/.test(error.message || ""));
        publish({ status: error?.status === 409 ? "conflict" : uncertain ? "uncertain" : "rejected",
          error: checkoutError(error), fieldErrors: Object.freeze(fieldErrors(error?.details)),
          reviewAfterVersion: needsReview ? cart.getCartSnapshot().cartVersion : null });
        return null;
      } finally {
        unlock();
        if (ticket === revision) { release = null; inFlight = null; locked = false; }
      }
    });
    inFlight = promise;
    return promise;
  };
  return { getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    setField, submit, reset, cancelDraft, startNewPurchase };
}
