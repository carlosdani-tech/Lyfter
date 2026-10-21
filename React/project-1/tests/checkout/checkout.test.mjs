import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Router, Routes, Route } from "react-router-dom";
import { createServer } from "vite";
import { mountProvider } from "../helpers/providerHarness.mjs";
import { canSubmitCheckout } from "../../src/context/checkoutSession.js";
import { purchaseSummary, purchaseStatusText } from "../../src/utils/purchase.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { default: AuthProvider } = await server.ssrLoadModule("/src/context/AuthProvider.jsx");
const { default: useAuthContext } = await server.ssrLoadModule("/src/hooks/useAuthContext.js");
const { default: CheckoutProvider } = await server.ssrLoadModule("/src/context/CheckoutProvider.jsx");
const { default: CheckoutPage } = await server.ssrLoadModule("/src/components/checkout/CheckoutPage.jsx");
const { default: ConfirmationPage } = await server.ssrLoadModule("/src/components/checkout/ConfirmationPage.jsx");
const { default: PurchaseConfirmation } = await server.ssrLoadModule("/src/components/checkout/PurchaseConfirmation.jsx");
const { default: useCheckoutContext } = await server.ssrLoadModule("/src/hooks/useCheckoutContext.js");
const { CheckoutContext } = await server.ssrLoadModule("/src/context/CheckoutContext.js");
const { CartContext } = await server.ssrLoadModule("/src/context/CartContext.js");
const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");
const { getPurchaseConfirmation } = await server.ssrLoadModule("/src/api/salesApi.js");
const { createAuthSession } = await server.ssrLoadModule("/src/context/authSession.js");

// The adapter mounts the actual provider and exposes actions for the existing scenarios.
function mountCheckout(services, auth, cart) {
  let context, cleanup;
  const session = { ...auth, registerSessionCleanup: (reset) => {
    cleanup = reset; return auth.registerSessionCleanup?.(reset) || (() => {}); } };
  const api = { getProducts: async () => [], ...services };
  const cartActions = { getCartSnapshot: () => cart.getCartSnapshot(),
    beginCheckout: (...args) => cart.beginCheckout(...args),
    refreshCart: (...args) => cart.refreshCart?.(...args), clearCartState: () => cart.clearCartState?.() };
  function Probe() { context = useCheckoutContext(); return null; }
  const host = mountProvider(() => React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value: { ...auth, registerSessionCleanup: session.registerSessionCleanup } },
      React.createElement(CartContext.Provider, { value: { ...cart.getCartSnapshot(), ...cartActions } },
        React.createElement(CheckoutProvider, { services: api }, React.createElement(Probe))))));
  const actions = Object.fromEntries(["setField", "submit", "cancelDraft", "startNewPurchase"]
    .map((name) => [name, (...args) => { host.render(); return host.start(() => context[name](...args)); }]));
  return { ...actions, reset: () => host.start(() => cleanup()), host, getSnapshot: () => { host.render(); return context; } };
}

const COMPLETED_PURCHASE_TITLE = "¡Gracias por tu compra!";
const EMAIL_MESSAGES = {
  sent: "Hemos enviado un correo de confirmación con los detalles de tu pedido.",
  pending: "Tu compra fue registrada. El envío del correo de confirmación está pendiente.",
  failed: "Tu compra fue registrada, pero no pudimos enviar el correo de confirmación.",
  unknown: "Tu compra fue registrada. No pudimos confirmar el estado del correo.",
};

function purchase(emailStatus = "sent") {
  return { sale: { id: 10, user_id: 2, cart_id: 3, status: "completed", email_status: emailStatus,
    full_name: "Ana Ejemplo", buyer_email: "ana@example.com", shipping_address: "Calle 1",
    subtotal_amount: "25.00", tax_amount: "0.00", total_amount: "25.00",
    items: [{ id: 11, product_id: 4, product_name: "Alimento", quantity: 2, unit_price: "12.50", line_total: "25.00" }] },
  invoice: { id: 9, sale_id: 10, invoice_number: "INV-000010", status: "issued", total_amount: "25.00" } };
}
function fixture(operation = async () => purchase()) {
  let current = true;
  const calls = [], successes = [];
  let keys = 0;
  let cartState = { cart: { id: 3, total: "25.00" }, items: [{ id: 11, product_id: 4, quantity: 2 }], canCheckout: true, cartVersion: 1, loading: false, checkoutLocked: false };
  const auth = { isClient: true, currentUser: { id: 2, first_name: "Ana", last_name: "Ejemplo", email: "ana@example.com" },
    isCurrentSession: () => current, runProtectedRequest: (work) => work("test-only-credential") };
  const cart = { getCartSnapshot: () => cartState, beginCheckout: () => {
    if (cartState.checkoutLocked) return null;
    cartState = { ...cartState, checkoutLocked: true };
    return () => { cartState = { ...cartState, checkoutLocked: false }; };
  } };
  const store = mountCheckout({ checkoutPurchase: (...args) => { calls.push(args); return operation(...args); },
    createKey: () => `attempt-${++keys}`, onSuccess: (value) => successes.push(value) }, auth, cart);
  store.setField("shipping_address", "Calle 1");
  return { store, calls, successes, auth, cart, keys: () => keys,
    patchCart: (patch) => { cartState = { ...cartState, ...patch }; },
    logout: () => { current = false; store.reset(); } };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test("synchronous double click and Enter share one request and one key", async () => {
  const pending = deferred(); const f = fixture(() => pending.promise);
  const first = f.store.submit(); const second = f.store.submit();
  assert.equal(first, second);
  await Promise.resolve(); assert.equal(f.calls.length, 1);
  assert.equal(f.cart.getCartSnapshot().checkoutLocked, true);
  pending.resolve(purchase()); await first;
  assert.equal(f.keys(), 1); assert.equal(f.successes.length, 1);
  assert.equal(f.cart.getCartSnapshot().checkoutLocked, false);
  assert.equal(f.store.getSnapshot().draft.buyer_email, "");
  assert.equal(f.store.getSnapshot().draft.shipping_address, "");
  assert.equal(Object.hasOwn(f.successes[0].sale, "shipping_address"), false);
});

test("network ambiguity freezes buyer data and replays the identical key and payload even after cart closes", async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw { status: 0 }; return purchase("failed"); });
  await f.store.submit(); assert.equal(f.store.getSnapshot().status, "uncertain");
  assert.equal(f.successes.length, 0);
  f.store.setField("full_name", "Otro nombre"); f.store.cancelDraft();
  f.patchCart({ cart: { id: 5, total: "25.00" }, items: [], canCheckout: false });
  fail = false; await f.store.submit();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[0][0], f.calls[1][0]);
  assert.equal(f.calls[0][2], f.calls[1][2]); assert.equal(f.keys(), 1);
  assert.equal(f.store.getSnapshot().status, "succeeded");
});

test("SMTP failed and pending remain successful purchases; malformed and wrong-owner responses do not", async () => {
  for (const status of ["failed", "pending", "sent"]) {
    const f = fixture(async () => purchase(status)); await f.store.submit();
    assert.equal(f.successes.length, 1);
    assert.equal(f.successes[0].sale.email_status, status);
    const message = purchaseStatusText(f.successes[0].sale);
    assert.equal(message.success, true);
    assert.equal(message.title, COMPLETED_PURCHASE_TITLE);
    assert.equal(message.message, EMAIL_MESSAGES[status]);
    assert.equal(message.message === EMAIL_MESSAGES.sent, status === "sent");
  }
  for (const data of [{}, { ...purchase(), sale: { ...purchase().sale, user_id: 999 } }]) {
    const f = fixture(async () => data); await f.store.submit();
    assert.equal(f.successes.length, 0); assert.equal(f.store.getSnapshot().status, "uncertain");
  }
});

test("validation retains form and replaces the rejected attempt key; stock conflicts require an authoritative cart review", async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw { status: 400, details: { buyer_email: "untrusted personal data" } }; return purchase(); });
  await f.store.submit();
  assert.equal(f.store.getSnapshot().status, "rejected");
  assert.equal(f.store.getSnapshot().draft.shipping_address, "Calle 1");
  assert.doesNotMatch(f.store.getSnapshot().fieldErrors.buyer_email, /untrusted/);
  f.store.setField("buyer_email", "otra@example.com"); fail = false; await f.store.submit();
  assert.equal(f.keys(), 2);
  const stock = fixture(async () => { throw { status: 400, message: "Insufficient stock for one or more products." }; });
  await stock.store.submit();
  assert.equal(stock.store.getSnapshot().error,
    "El carrito o el stock cambiaron. Revisa el carrito antes de volver a confirmar.");
  assert.equal(canSubmitCheckout(stock.store.getSnapshot(), stock.cart.getCartSnapshot()), false);
  await stock.store.submit(); assert.equal(stock.calls.length, 1);
  stock.patchCart({ cartVersion: 2 });
  assert.equal(canSubmitCheckout(stock.store.getSnapshot(), stock.cart.getCartSnapshot()), true);
});

test("logout or expired-token invalidation ignores a late response and drops buyer memory", async () => {
  const pending = deferred(); const f = fixture(() => pending.promise);
  const submission = f.store.submit(); await Promise.resolve(); f.logout();
  pending.resolve(purchase()); await submission;
  assert.equal(f.successes.length, 0); assert.equal(f.store.getSnapshot().saleId, null);
  assert.equal(f.store.getSnapshot().draft.shipping_address, "");
  assert.equal(f.cart.getCartSnapshot().checkoutLocked, false);
});

test("protected checkout 401/422 invalidates authentication and checkout memory instead of offering an unsafe retry", async () => {
  for (const status of [401, 422]) {
    const auth = createAuthSession(async () => ({ access_token: "test-only-credential", user: { id: 2, role: "client" } }));
    await auth.login({});
    const version = auth.getSnapshot().sessionVersion;
    const f = fixture();
    const store = mountCheckout({ createKey: () => "expiry-attempt", checkoutPurchase: async () => { throw { status }; },
      onSuccess: () => assert.fail("Expired request must not succeed") }, {
      ...auth.getSnapshot(), isCurrentSession: () => auth.isCurrentSession(version),
      runProtectedRequest: (operation) => auth.runProtectedRequest(operation, version),
    }, f.cart);
    auth.registerSessionCleanup(store.reset);
    store.setField("shipping_address", f.store.getSnapshot().draft.shipping_address);
    store.setField("full_name", "Ana Ejemplo"); store.setField("buyer_email", "ana@example.com");
    await store.submit();
    assert.equal(auth.getSnapshot().isAuthenticated, false);
    assert.equal(store.getSnapshot().status, "editing"); assert.equal(store.getSnapshot().draft.buyer_email, "");
    assert.equal(store.getSnapshot().draft.shipping_address, "");
  }
});

test("empty/admin/queued cart states cannot submit; only a new cart after success creates a new attempt", async () => {
  const f = fixture(async () => { const result = purchase(); result.sale.cart_id = f.cart.getCartSnapshot().cart.id; return result; });
  f.patchCart({ canCheckout: false }); await f.store.submit(); assert.equal(f.calls.length, 0);
  f.patchCart({ canCheckout: true, loading: true }); await f.store.submit(); assert.equal(f.calls.length, 0);
  f.patchCart({ loading: false }); f.auth.isClient = false; await f.store.submit(); assert.equal(f.calls.length, 0);
  assert.equal(f.store.getSnapshot().draft.shipping_address, "");
  f.auth.isClient = true; f.store.setField("shipping_address", "Calle 1");
  await f.store.submit(); await f.store.submit(); assert.equal(f.calls.length, 1);
  f.store.startNewPurchase(); assert.equal(f.store.getSnapshot().status, "succeeded");
  f.patchCart({ cart: { id: 5, total: "25.00" } }); f.store.startNewPurchase();
  assert.equal(f.store.getSnapshot().status, "editing");
  assert.equal(f.store.getSnapshot().draft.shipping_address, "");
  f.store.setField("shipping_address", "Calle 2, Heredia");
  await f.store.submit(); assert.equal(f.keys(), 2); assert.equal(f.successes.length, 2);
});

test("409 conflict cannot silently change the payload or start a new key", async () => {
  const f = fixture(async () => { throw { status: 409 }; }); await f.store.submit();
  f.store.setField("full_name", "Cambio"); await f.store.submit();
  assert.equal(f.keys(), 1); assert.equal(f.calls[0][0], f.calls[1][0]);
  assert.equal(f.store.getSnapshot().status, "conflict"); assert.equal(f.successes.length, 0);
});

test("confirmation GET validates IDs, uses Authorization, and drops buyer snapshots", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify({ data: purchase() }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  for (const id of ["0", "01", "1x", "2147483648", "1\n"]) await assert.rejects(getPurchaseConfirmation(id, "test-only-credential"));
  assert.equal(calls.length, 0);
  const result = await getPurchaseConfirmation("10", "test-only-credential");
  assert.equal(new URL(calls[0].url).pathname, "/sales/10/confirmation");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.has("Authorization"), true);
  assert.equal(calls[0].options.body, undefined);
  assert.equal(Object.hasOwn(result.sale, "buyer_email"), false);
  await assert.rejects(getPurchaseConfirmation(11, "test-only-credential"), (error) => error.status === 502);
});

test("confirmation lookup failures preserve HTTP status without claiming a purchase or email success", async (t) => {
  for (const status of [403, 404, 500]) {
    const calls = [];
    const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ error: { message: "Private backend diagnostics" } }), {
        status, headers: { "Content-Type": "application/json" },
      });
    });
    await assert.rejects(getPurchaseConfirmation(10, "test-only-credential"), (error) => {
      assert.equal(error.status, status);
      assert.equal(error.message.includes(COMPLETED_PURCHASE_TITLE), false);
      assert.equal(error.message.includes(EMAIL_MESSAGES.sent), false);
      assert.doesNotMatch(error.message, /Private backend diagnostics/);
      return true;
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "GET");
    assert.equal(new URL(calls[0].url).pathname, "/sales/10/confirmation");
    mock.mock.restore();
  }
});

test("purchase projection rejects missing, inconsistent and malformed references without inventing success", () => {
  assert.equal(purchaseSummary({}), null);
  const data = purchase(); data.invoice.total_amount = "1.00"; assert.equal(purchaseSummary(data), null);
  const cancelled = purchase(); cancelled.sale.status = "cancelled"; cancelled.invoice.status = "cancelled";
  assert.equal(purchaseStatusText(purchaseSummary(cancelled).sale).success, false);
});

function renderCheckout(patch = {}, cartPatch = {}) {
  const f = fixture();
  const value = { ...f.store.getSnapshot(), setField: f.store.setField, submit: f.store.submit, cancelDraft: f.store.cancelDraft,
    startNewPurchase: f.store.startNewPurchase, canSubmit: true, formLocked: false, ...patch };
  const cart = { cart: { id: 3 }, items: [{ id: 11, name: "Alimento", quantity: 2, unit_price: "12.50", line_total: "25.00" }],
    canCheckout: true, loading: false, cartVersion: 1, displayTotals: { total: "₡25,00" }, refreshCart: async () => null, ...cartPatch };
  return renderToString(React.createElement(MemoryRouter, null,
    React.createElement(CartContext.Provider, { value: cart }, React.createElement(CheckoutContext.Provider, { value }, React.createElement(CheckoutPage)))));
}
test("checkout has three labelled buyer fields, server summary, safe prefill and no payment or phone inputs", () => {
  const html = renderCheckout();
  for (const text of ["Información de compra", "Resumen del pedido", "Confirmar compra", "Cancelar", "Nombre completo", "Correo electrónico", "Dirección de envío"]) assert.equal(html.includes(text), true);
  assert.match(html, /name="shipping_address"/); assert.match(html, /value="Ana Ejemplo"/);
  assert.doesNotMatch(html, /name="(?:total|price|user_id|phone|telephone|payment)"/);
  assert.match(html, /href="\/carrito"/);
  const busy = renderCheckout({ status: "submitting", formLocked: true, canSubmit: false });
  assert.match(busy, /aria-busy="true"/); assert.match(busy, /fieldset[^>]*disabled/);
  assert.match(busy, /Confirmando tu compra/);
  const empty = renderCheckout({ canSubmit: false }, { items: [], canCheckout: false });
  assert.match(empty, /Tu carrito está vacío/); assert.match(empty, /button[^>]*disabled=""[^>]*>Confirmar compra/);
});

const GENERAL_CHECKOUT_ERROR = "Ocurrió un problema al procesar tu compra. Por favor intenta de nuevo.";

test("checkout displays exact assignment text with three associated buyer fields and one submit button", () => {
  const html = renderCheckout();
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.match(html, /<h1>Checkout<\/h1><p class="checkout-intro">Revisa los detalles de tu compra y completa la información necesaria para finalizar el pedido\.<\/p>/);
  for (const [field, label] of [
    ["full_name", "Nombre completo"], ["buyer_email", "Correo electrónico"],
    ["shipping_address", "Dirección de envío"],
  ]) {
    assert.ok(html.includes(`<label for="buyer-${field}">${label}</label>`));
    const name = field;
    const input = html.match(new RegExp(`<(?:input|textarea)[^>]*id="buyer-${field}"[^>]*>`))?.[0];
    assert.ok(input?.includes(`name="${name}"`));
  }
  assert.match(html, /<input(?=[^>]*name="buyer_email")(?=[^>]*type="email")(?=[^>]*autoComplete="email")[^>]*>/i);
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  assert.match(html, /type="submit">Confirmar compra<\/button>/);
  assert.equal(html.includes(GENERAL_CHECKOUT_ERROR), false);
  assert.doesNotMatch(html, /role="alert"/);
  assert.match(html, /class="purchase-progress" role="status" aria-live="polite"/);
  assert.ok(html.includes("Usamos esta información para completar tu compra y preparar la confirmación."));
  assert.ok(html.includes("La tienda verifica los precios y el stock al confirmar."));
  for (const status of ["submitting", "succeeded", "resolved"]) {
    assert.equal(renderCheckout({ status }).includes(GENERAL_CHECKOUT_ERROR), false);
  }
});

test("submitted failures announce one general alert and preserve safe details and retry guidance", async () => {
  for (const [error, status] of [
    [{ status: 400, details: { buyer_email: "untrusted buyer information" } }, "rejected"],
    [{ status: 400, message: "Insufficient stock for one or more products." }, "rejected"],
    [{ status: 404 }, "rejected"], [{ status: 0 }, "uncertain"], [{ status: 409 }, "conflict"],
  ]) {
    const f = fixture(async () => { throw error; });
    await f.store.submit();
    const snapshot = f.store.getSnapshot();
    assert.equal(snapshot.status, status);
    const html = renderCheckout({ ...snapshot, canSubmit: false }, { canCheckout: false });
    assert.equal(html.split(GENERAL_CHECKOUT_ERROR).length - 1, 1);
    assert.equal((html.match(/role="alert"/g) || []).length, 1);
    assert.ok(html.includes(snapshot.error));
    assert.doesNotMatch(html, /untrusted buyer information|attempt-1|test-only-credential/);
    assert.equal(f.calls.length, 1);
    assert.equal(f.successes.length, 0);
    assert.equal(f.cart.getCartSnapshot().cart.id, 3);
    if (status !== "rejected") {
      assert.match(html, /Conservamos los datos y el mismo intento para evitar duplicados/);
      assert.match(html, /no inicies otra compra mientras el resultado sea incierto/);
    }
    if (snapshot.fieldErrors.buyer_email) {
      assert.match(html, /aria-invalid="true" aria-describedby="buyer-buyer_email-error"/);
      assert.match(html, /id="buyer-buyer_email-error"/);
    }
  }
});

test("local validation, cart readiness and unavailable key generation never become purchase failures", async () => {
  const missing = fixture();
  missing.store.setField("full_name", "");
  await missing.store.submit();
  assert.equal(missing.calls.length, 0);
  const html = renderCheckout(missing.store.getSnapshot());
  assert.match(html, /Completa los campos obligatorios\./);
  assert.match(html, /aria-invalid="true" aria-describedby="buyer-full_name-error"/);
  assert.equal(html.includes(GENERAL_CHECKOUT_ERROR), false);

  const notReady = fixture(); notReady.patchCart({ canCheckout: false });
  await notReady.store.submit();
  assert.equal(notReady.calls.length, 0);
  const notReadyHtml = renderCheckout(notReady.store.getSnapshot(), { canCheckout: false });
  assert.equal((notReadyHtml.match(/role="alert"/g) || []).length, 1);
  assert.equal(notReadyHtml.includes(GENERAL_CHECKOUT_ERROR), false);

  let requests = 0;
  const f = fixture();
  const store = mountCheckout({ createKey: () => null,
    checkoutPurchase: () => { requests += 1; } }, f.auth, f.cart);
  store.setField("shipping_address", f.store.getSnapshot().draft.shipping_address);
  await store.submit();
  assert.equal(requests, 0);
  const keyHtml = renderCheckout(store.getSnapshot());
  assert.match(keyHtml, /Usa un navegador compatible/);
  assert.equal(keyHtml.includes(GENERAL_CHECKOUT_ERROR), false);
});

test("local guidance after rejection clears failure classification without changing the attempt key", async () => {
  const f = fixture(async () => { throw { status: 400 }; });
  await f.store.submit();
  f.store.setField("full_name", "");
  await f.store.submit();
  assert.equal(f.calls.length, 1);
  assert.equal(f.store.getSnapshot().status, "editing");
  assert.equal(renderCheckout(f.store.getSnapshot()).includes(GENERAL_CHECKOUT_ERROR), false);
  f.store.setField("full_name", "Ana Ejemplo");
  await f.store.submit();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0][2], f.calls[1][2]);
  assert.equal(f.keys(), 1);
  f.store.cancelDraft();
  assert.equal(f.store.getSnapshot().status, "editing");
  assert.equal(renderCheckout(f.store.getSnapshot()).includes(GENERAL_CHECKOUT_ERROR), false);
});

test("direct confirmation initially makes no success claim and malformed IDs have a safe fallback", () => {
  const render = (path) => renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
    React.createElement(AuthContext.Provider, { value: { sessionVersion: 1 } },
      React.createElement(Routes, null, React.createElement(Route, { path: "/compra/:saleId", element: React.createElement(ConfirmationPage) })))));
  assert.match(render("/compra/10"), /Consultando tu compra/);
  assert.equal(render("/compra/10").includes(COMPLETED_PURCHASE_TITLE), false);
  assert.equal(render("/compra/10").includes(EMAIL_MESSAGES.sent), false);
  assert.match(render("/compra/2147483648"), /identificador de la compra no es válido/);
  function Probe() { useCheckoutContext(); return null; }
  assert.throws(() => renderToString(React.createElement(Probe)), /requires CheckoutProvider/);
});

test("verified confirmation renders a responsive semantic summary without buyer data and truthful email text", () => {
  for (const status of ["sent", "pending", "failed", "unknown", "unrecognized", null, undefined]) {
    const data = purchase(status);
    if (status === undefined) delete data.sale.email_status;
    data.sale.items[0].product_name = `${"Nombre largo ".repeat(30)}<script>oculto</script>`;
    const normalized = purchaseSummary(data);
    const emailStatus = ["sent", "pending", "failed"].includes(status) ? status : "unknown";
    assert.equal(normalized.sale.email_status, emailStatus);
    assert.deepEqual(purchaseStatusText(normalized.sale), {
      title: COMPLETED_PURCHASE_TITLE, message: EMAIL_MESSAGES[emailStatus], success: true,
    });
    const html = renderToString(React.createElement(MemoryRouter, null,
      React.createElement(PurchaseConfirmation, { purchase: normalized }))).replace(/<!--[\s\S]*?-->/g, "");
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(`<h1 id="confirmation-title">${COMPLETED_PURCHASE_TITLE}</h1>`));
    assert.ok(html.includes(`<p role="status">${EMAIL_MESSAGES[emailStatus]}</p>`));
    assert.match(html, /class="purchase-check" aria-hidden="true"/);
    assert.match(html, /INV-000010/); assert.match(html, /Resumen de la compra/);
    assert.ok(html.includes("Compra #10 · Factura INV-000010"));
    assert.match(html, /<table/); assert.match(html, /scope="row"/);
    assert.ok(html.includes('<caption class="sr-only">Artículos y total de la compra</caption>'));
    assert.ok(html.includes('<th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio unitario</th><th scope="col">Subtotal</th>'));
    assert.ok(html.includes("<td>2</td><td>₡12,50</td><td>₡25,00</td>"));
    assert.ok(html.includes('<tfoot><tr><th scope="row" colSpan="3">Total:</th><td>₡25,00</td></tr></tfoot>'));
    assert.match(html, /class="purchase-table-scroll" role="region"[^>]*tabindex="0"/);
    assert.match(html, /&lt;script&gt;oculto&lt;\/script&gt;/);
    assert.doesNotMatch(html, /ana@example.com|Calle 1/);
    assert.equal(html.includes(EMAIL_MESSAGES.sent), status === "sent");
    const catalogAction = html.match(/<a\b[^>]*class="cart-primary"[^>]*href="\/productos"[^>]*>Volver al catálogo<\/a>/)?.[0];
    assert.ok(catalogAction);
    assert.doesNotMatch(catalogAction, /aria-label|tabindex="-1"/);
    assert.match(html, /href="\/productos"/); assert.match(html, /href="\/"/);
  }
});

test("cancelled and returned confirmations retain their non-success copy and purchase summary", () => {
  for (const [status, invoiceStatus, title, message] of [
    ["cancelled", "cancelled", "Compra cancelada", "Esta compra fue cancelada."],
    ["returned", "refunded", "Compra devuelta", "Esta compra fue devuelta."],
  ]) {
    const data = purchase("sent");
    data.sale.status = status;
    data.invoice.status = invoiceStatus;
    const normalized = purchaseSummary(data);
    assert.deepEqual(purchaseStatusText(normalized.sale), { title, message, success: false });
    const html = renderToString(React.createElement(MemoryRouter, null,
      React.createElement(PurchaseConfirmation, { purchase: normalized })));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(`<h1 id="confirmation-title">${title}</h1>`));
    assert.ok(html.includes(`<p role="status">${message}</p>`));
    assert.equal(html.includes(COMPLETED_PURCHASE_TITLE), false);
    assert.equal(html.includes(EMAIL_MESSAGES.sent), false);
    assert.doesNotMatch(html, /class="purchase-check"/);
    assert.match(html, /INV-000010/);
    assert.match(html, /Resumen de la compra/);
    assert.match(html, /Alimento/);
  }
});


test("attempt freezes the loaded cart and exact total before the request begins", async () => {
  const pending = deferred();
  const f = fixture(() => pending.promise);
  const originalItems = [{ product_id: 19, quantity: 1, name: "Cama" }, { product_id: 12, quantity: 2, unit_price: "8500.00" }];
  f.patchCart({ items: originalItems, cart: { id: 3, total: "38500.00" } });
  const submission = f.store.submit();
  originalItems[0].quantity = 99;
  f.patchCart({ items: [], cart: { id: 3, total: "0.00" } });
  await Promise.resolve();
  const payload = f.calls[0][0];
  assert.deepEqual(payload.items, [{ product_id: 19, quantity: 1 }, { product_id: 12, quantity: 2 }]);
  assert.equal(payload.total_amount, "38500.00");
  assert.equal(Object.isFrozen(payload.items[0]), true);
  assert.equal(payload.shipping_address, "Calle 1");
  pending.reject({ status: 0 }); await submission;
  await f.store.submit();
  assert.equal(f.calls[1][0], payload);
  assert.equal(f.calls[0][2], f.calls[1][2]);
});

test("invalid cart snapshots cannot submit even when readiness is incorrectly true", async () => {
  for (const patch of [{ items: [] }, { items: [{ product_id: 4, quantity: 0 }] },
    { items: [{ product_id: 4, quantity: 1 }, { product_id: 4, quantity: 2 }] },
    { cart: { id: 3 } }, { cart: { id: 3, total: 25 } }, { cart: { id: 3, total: "25,00" } }]) {
    const f = fixture(); f.patchCart(patch); await f.store.submit();
    assert.equal(f.calls.length, 0); assert.equal(f.keys(), 0);
  }
});

test("cart and total conflicts preserve the form, refresh and require explicit new confirmation", async () => {
  for (const message of ["Checkout cart snapshot does not match the active cart.", "Checkout total does not match the current cart total."]) {
    let fail = true, refreshes = 0;
    const f = fixture(async () => { if (fail) throw { status: 409, message }; return purchase(); });
    f.cart.refreshCart = async () => {
      assert.equal(f.cart.getCartSnapshot().checkoutLocked, false);
      refreshes += 1;
      f.patchCart({ cartVersion: 2, cart: { id: 3, total: "30.00" }, items: [{ product_id: 4, quantity: 3 }] });
    };
    const draft = f.store.getSnapshot().draft;
    await f.store.submit();
    assert.equal(f.calls.length, 1); assert.equal(refreshes, 1);
    assert.equal(f.store.getSnapshot().status, "rejected");
    assert.equal(f.store.getSnapshot().draft, draft);
    assert.equal(f.store.getSnapshot().error, "El carrito cambió desde que se preparó la compra. Revisa los productos y vuelve a intentarlo.");
    fail = false; await f.store.submit();
    assert.equal(f.calls.length, 2); assert.notEqual(f.calls[0][2], f.calls[1][2]);
    assert.equal(f.calls[1][0].total_amount, "30.00");
    assert.deepEqual(f.calls[1][0].items, [{ product_id: 4, quantity: 3 }]);
  }
});

test("failed conflict refresh blocks submission until a successful authoritative refresh", async () => {
  const f = fixture(async () => { throw { status: 409, message: "Checkout total does not match the current cart total." }; });
  f.cart.refreshCart = async () => { throw new Error("Offline"); };
  await f.store.submit(); await f.store.submit();
  assert.equal(f.calls.length, 1);
  assert.equal(f.store.getSnapshot().draft.full_name, "Ana Ejemplo");
  assert.equal(canSubmitCheckout(f.store.getSnapshot(), f.cart.getCartSnapshot()), false);
});

test("known rejection followed by cart refresh starts a new attempt even for an identical snapshot", async () => {
  const f = fixture(async () => { throw { status: 400 }; });
  await f.store.submit(); f.patchCart({ cartVersion: 2 }); await f.store.submit();
  assert.equal(f.calls.length, 2); assert.notEqual(f.calls[0][2], f.calls[1][2]);
});


test("checkout exposes exactly three buyer controls and one accessible address textarea", () => {
  const html = renderCheckout();
  const fields = html.match(/<fieldset[\s\S]*?<\/fieldset>/)[0];
  assert.equal((fields.match(/<input /g) || []).length, 2);
  assert.equal((fields.match(/<textarea /g) || []).length, 1);
  assert.deepEqual([...fields.matchAll(/<(?:input|textarea)[^>]*name="([^"]+)"/g)].map((match) => match[1]),
    ["full_name", "buyer_email", "shipping_address"]);
  assert.match(fields, /<textarea[^>]*autoComplete="street-address"[^>]*maxLength="500"/i);
  assert.doesNotMatch(fields, /Ciudad|Provincia|Código postal|País|country|postal_code|line1|line2|shipping_address\./);
  assert.match(html, /<button[^>]*type="submit"[^>]*>Confirmar compra<\/button>/);
});

test("address validation maps to the visible control and accepts natural multiline text without codes", async () => {
  for (const address of ["", "  ", "\r\n  ", "a".repeat(501)]) {
    const f = fixture(); f.store.setField("shipping_address", address); await f.store.submit();
    assert.equal(f.calls.length, 0);
    const state = f.store.getSnapshot();
    assert.ok(state.fieldErrors.shipping_address);
    const html = renderCheckout(state);
    assert.match(html, /<textarea[^>]*aria-invalid="true"[^>]*aria-describedby="buyer-shipping_address-error"/);
    assert.ok(html.includes(`<p id="buyer-shipping_address-error" class="checkout-field-error">${state.fieldErrors.shipping_address}</p>`));
  }
  const f = fixture(async () => { throw { status: 0 }; });
  f.store.setField("shipping_address", "  Del parque de San José, 200 metros al norte.\r\nEdificio azul, apartamento 3.  ");
  await f.store.submit();
  assert.equal(f.calls[0][0].shipping_address, "Del parque de San José, 200 metros al norte.\nEdificio azul, apartamento 3.");
  f.store.setField("shipping_address", "Cambio"); await f.store.submit();
  assert.equal(f.calls[1][0], f.calls[0][0]);
  assert.equal(f.calls[1][2], f.calls[0][2]);
  assert.equal(typeof f.store.getSnapshot().draft.shipping_address, "string");
});


test("mounted StrictMode checkout submits once and navigates once after verified success", async (t) => {
  let calls = 0;
  const pending = deferred();
  t.mock.method(globalThis, "fetch", async (url) => {
    if (new URL(url).pathname === "/sales/checkout") { calls += 1; await pending.promise;
      return new Response(JSON.stringify({ data: purchase() }), { status: 201, headers: { "Content-Type": "application/json" } }); }
    return new Response(JSON.stringify({ data: { products: [] } }), { headers: { "Content-Type": "application/json" } });
  });
  let context;
  const navigations = [];
  const auth = { isClient: true, currentUser: { id: 2 }, isCurrentSession: () => true,
    runProtectedRequest: (work) => work("test-only-credential"), registerSessionCleanup: () => () => {} };
  const cart = { cart: { id: 3, total: "25.00" }, items: [{ product_id: 4, quantity: 2 }],
    canCheckout: true, cartVersion: 1, loading: false, checkoutLocked: false };
  const cartContext = { ...cart, getCartSnapshot: () => cart, beginCheckout: () => () => {},
    clearCartState() {}, refreshCart: async () => null };
  const navigator = { createHref: (to) => to.pathname, push: (to) => navigations.push(to),
    replace: (to) => navigations.push(to), go() {} };
  function Probe() { context = useCheckoutContext(); return null; }
  const host = mountProvider(() => React.createElement(Router, { location: "/checkout", navigator },
    React.createElement(AuthContext.Provider, { value: auth },
      React.createElement(CartContext.Provider, { value: cartContext },
        React.createElement(CheckoutProvider, null, React.createElement(Probe))))), { strict: true });
  assert.equal(calls, 0);
  host.start(() => { context.setField("full_name", "Ana Ejemplo"); context.setField("buyer_email", "ana@example.com");
    context.setField("shipping_address", "Calle 1"); });
  let first, second;
  host.start(() => { first = context.submit(); second = context.submit(); });
  assert.equal(first, second);
  await host.flush(); assert.equal(calls, 1);
  pending.resolve(); await host.run(() => first);
  assert.deepEqual(navigations.map((to) => to.pathname), ["/compra/10"]);
  await host.run(() => context.submit());
  assert.equal(calls, 1); assert.equal(navigations.length, 1);
  host.unmount();
});


test("one mounted checkout drops old-user attempts and blocks saved callbacks after a new login", async (t) => {
  let userId = 1;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ data: {
    access_token: `test-only-${userId}`, user: { id: userId, role: "client", first_name: "Ana", email: "ana@example.com" }
  } }), { headers: { "Content-Type": "application/json" } }));
  const pending = deferred(), newer = deferred();
  let calls = 0, key = 0, oldSignal, auth, checkout;
  const successes = [], navigations = [];
  const services = { createKey: () => `attempt-${++key}`, getProducts: async () => [],
    checkoutPurchase: (payload, token, attempt, { signal }) => {
      calls += 1;
      if (calls === 1) { oldSignal = signal; return pending.promise; }
      return newer.promise;
    }, onSuccess: (summary) => successes.push(summary) };
  const cartState = { cart: { id: 3, total: "25.00" }, items: [{ product_id: 4, quantity: 2 }],
    canCheckout: true, cartVersion: 1, loading: false, checkoutLocked: false };
  const cart = { ...cartState, getCartSnapshot: () => cartState, beginCheckout: () => () => {},
    clearCartState() {}, refreshCart: async () => null };
  const navigator = { createHref: (to) => to.pathname, push: (to) => navigations.push(to),
    replace: (to) => navigations.push(to), go() {} };
  function Probe() { auth = useAuthContext(); checkout = useCheckoutContext(); return null; }
  const host = mountProvider(() => React.createElement(Router, { location: "/checkout", navigator },
    React.createElement(AuthProvider, null, React.createElement(CartContext.Provider, { value: cart },
      React.createElement(CheckoutProvider, { services }, React.createElement(Probe))))));
  await host.run(() => auth.login({}));
  host.start(() => checkout.setField("shipping_address", "Calle 1"));
  const previous = checkout, first = host.start(() => checkout.submit());
  await host.flush(); assert.equal(calls, 1);
  host.start(() => auth.logout()); assert.equal(oldSignal.aborted, true);
  assert.equal(checkout.draft.shipping_address, "");
  userId = 2; await host.run(() => auth.login({}));
  assert.equal(checkout.draft.shipping_address, ""); assert.equal(checkout.status, "editing");
  host.start(() => checkout.setField("shipping_address", "Calle 2"));
  const second = host.start(() => checkout.submit()); await host.flush();
  const ignored = await host.run(() => previous.submit());
  assert.equal(ignored, null); assert.equal(calls, 2); assert.equal(key, 2);
  host.start(() => { previous.setField("shipping_address", "Old user"); previous.cancelDraft(); });
  assert.equal(checkout.draft.shipping_address, "Calle 2");
  const oldPurchase = purchase(); oldPurchase.sale.user_id = 1;
  pending.resolve(oldPurchase); await host.run(() => first);
  assert.equal(successes.length, 0); assert.equal(checkout.status, "submitting");
  newer.resolve(purchase()); await host.run(() => second);
  assert.equal(successes.length, 1); assert.equal(successes[0].sale.user_id, 2);
  assert.deepEqual(navigations.map((to) => to.pathname), ["/compra/10"]);
  host.unmount();
});

test("editing one field clears only its own validation error", async () => {
  const f = fixture(async () => { throw { status: 400, details: { buyer_email: "Invalid value.", shipping_address: "Invalid value." } }; });
  await f.store.submit();
  const before = f.store.getSnapshot();
  assert.ok(before.fieldErrors.buyer_email); assert.ok(before.fieldErrors.shipping_address);
  f.store.setField("buyer_email", "otra@example.com");
  assert.equal(f.store.getSnapshot().fieldErrors.buyer_email, undefined);
  assert.equal(f.store.getSnapshot().fieldErrors.shipping_address, before.fieldErrors.shipping_address);
});


test("unmount aborts checkout transport and ignores its late successful result", async () => {
  const pending = deferred();
  let signal;
  const f = fixture((payload, token, key, options) => { signal = options.signal; return pending.promise; });
  const request = f.store.submit(); await Promise.resolve();
  assert.equal(signal.aborted, false);
  f.store.host.unmount();
  assert.equal(signal.aborted, true);
  pending.resolve(purchase()); await request;
  assert.equal(f.successes.length, 0);
});
