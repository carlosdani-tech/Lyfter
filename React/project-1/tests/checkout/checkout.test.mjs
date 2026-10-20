import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createServer } from "vite";
import { createCheckoutSession, canSubmitCheckout } from "../../src/context/checkoutSession.js";
import { purchaseSummary, purchaseStatusText } from "../../src/utils/purchase.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { default: CheckoutPage } = await server.ssrLoadModule("/src/components/checkout/CheckoutPage.jsx");
const { default: ConfirmationPage } = await server.ssrLoadModule("/src/components/checkout/ConfirmationPage.jsx");
const { default: PurchaseConfirmation } = await server.ssrLoadModule("/src/components/checkout/PurchaseConfirmation.jsx");
const { default: useCheckoutContext } = await server.ssrLoadModule("/src/hooks/useCheckoutContext.js");
const { CheckoutContext } = await server.ssrLoadModule("/src/context/CheckoutContext.js");
const { CartContext } = await server.ssrLoadModule("/src/context/CartContext.js");
const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");
const { getPurchaseConfirmation } = await server.ssrLoadModule("/src/api/salesApi.js");
const { createAuthSession } = await server.ssrLoadModule("/src/context/authSession.js");

const COMPLETED_PURCHASE_TITLE = "¡Gracias por tu compra!";
const EMAIL_MESSAGES = {
  sent: "Hemos enviado un correo de confirmación con los detalles de tu pedido.",
  pending: "Tu compra fue registrada. El envío del correo de confirmación está pendiente.",
  failed: "Tu compra fue registrada, pero no pudimos enviar el correo de confirmación.",
  unknown: "Tu compra fue registrada. No pudimos confirmar el estado del correo.",
};

function purchase(emailStatus = "sent") {
  return { sale: { id: 10, user_id: 2, cart_id: 3, status: "completed", email_status: emailStatus,
    full_name: "Ana Ejemplo", buyer_email: "ana@example.com", shipping_address: { line1: "Calle 1" },
    subtotal_amount: "25.00", tax_amount: "0.00", total_amount: "25.00",
    items: [{ id: 11, product_id: 4, product_name: "Alimento", quantity: 2, unit_price: "12.50", line_total: "25.00" }] },
  invoice: { id: 9, sale_id: 10, invoice_number: "INV-000010", status: "issued", total_amount: "25.00" } };
}
function fixture(operation = async () => purchase()) {
  let current = true;
  const calls = [], successes = [];
  let keys = 0;
  let cartState = { cart: { id: 3 }, items: [{ id: 11 }], canCheckout: true, cartVersion: 1, loading: false, checkoutLocked: false };
  const auth = { isClient: true, currentUser: { id: 2, first_name: "Ana", last_name: "Ejemplo", email: "ana@example.com" },
    isCurrentSession: () => current, runProtectedRequest: (work) => work("test-only-credential") };
  const cart = { getCartSnapshot: () => cartState, beginCheckout: () => {
    if (cartState.checkoutLocked) return null;
    cartState = { ...cartState, checkoutLocked: true };
    return () => { cartState = { ...cartState, checkoutLocked: false }; };
  } };
  const store = createCheckoutSession({ checkoutPurchase: (...args) => { calls.push(args); return operation(...args); },
    createKey: () => `attempt-${++keys}`, onSuccess: (value) => successes.push(value) }, auth, cart);
  for (const [field, value] of Object.entries({ line1: "Calle 1", city: "San José", province: "San José", postal_code: "10101" })) {
    store.setField(`shipping_address.${field}`, value);
  }
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
  assert.equal(Object.hasOwn(f.successes[0].sale, "shipping_address"), false);
});

test("network ambiguity freezes buyer data and replays the identical key and payload even after cart closes", async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw { status: 0 }; return purchase("failed"); });
  await f.store.submit(); assert.equal(f.store.getSnapshot().status, "uncertain");
  assert.equal(f.successes.length, 0);
  f.store.setField("full_name", "Otro nombre"); f.store.cancelDraft();
  f.patchCart({ cart: { id: 5 }, items: [], canCheckout: false });
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

test("validation retains form and attempt key; stock conflicts require an authoritative cart review", async () => {
  let fail = true;
  const f = fixture(async () => { if (fail) throw { status: 400, details: { buyer_email: "untrusted personal data" } }; return purchase(); });
  await f.store.submit();
  assert.equal(f.store.getSnapshot().status, "rejected");
  assert.equal(f.store.getSnapshot().draft.shipping_address.line1, "Calle 1");
  assert.doesNotMatch(f.store.getSnapshot().fieldErrors.buyer_email, /untrusted/);
  f.store.setField("buyer_email", "otra@example.com"); fail = false; await f.store.submit();
  assert.equal(f.keys(), 1);
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
  assert.equal(f.store.getSnapshot().draft.shipping_address.line1, "");
  assert.equal(f.cart.getCartSnapshot().checkoutLocked, false);
});

test("protected checkout 401/422 invalidates authentication and checkout memory instead of offering an unsafe retry", async () => {
  for (const status of [401, 422]) {
    const auth = createAuthSession(async () => ({ access_token: "test-only-credential", user: { id: 2, role: "client" } }));
    await auth.login({});
    const version = auth.getSnapshot().sessionVersion;
    const f = fixture();
    const store = createCheckoutSession({ createKey: () => "expiry-attempt", checkoutPurchase: async () => { throw { status }; },
      onSuccess: () => assert.fail("Expired request must not succeed") }, {
      ...auth.getSnapshot(), isCurrentSession: () => auth.isCurrentSession(version),
      runProtectedRequest: (operation) => auth.runProtectedRequest(operation, version),
    }, f.cart);
    auth.registerSessionCleanup(store.reset);
    for (const [field, value] of Object.entries(f.store.getSnapshot().draft.shipping_address)) store.setField(`shipping_address.${field}`, value);
    store.setField("full_name", "Ana Ejemplo"); store.setField("buyer_email", "ana@example.com");
    await store.submit();
    assert.equal(auth.getSnapshot().isAuthenticated, false);
    assert.equal(store.getSnapshot().status, "editing"); assert.equal(store.getSnapshot().draft.buyer_email, "");
  }
});

test("empty/admin/queued cart states cannot submit; only a new cart after success creates a new attempt", async () => {
  const f = fixture(async () => { const result = purchase(); result.sale.cart_id = f.cart.getCartSnapshot().cart.id; return result; });
  f.patchCart({ canCheckout: false }); await f.store.submit(); assert.equal(f.calls.length, 0);
  f.patchCart({ canCheckout: true, loading: true }); await f.store.submit(); assert.equal(f.calls.length, 0);
  f.patchCart({ loading: false }); f.auth.isClient = false; await f.store.submit(); assert.equal(f.calls.length, 0);
  f.auth.isClient = true; await f.store.submit(); await f.store.submit(); assert.equal(f.calls.length, 1);
  f.store.startNewPurchase(); assert.equal(f.store.getSnapshot().status, "succeeded");
  f.patchCart({ cart: { id: 5 } }); f.store.startNewPurchase();
  assert.equal(f.store.getSnapshot().status, "editing");
  assert.equal(f.store.getSnapshot().draft.shipping_address.line1, "");
  for (const [name, value] of Object.entries({ line1: "Calle 2", city: "Heredia", province: "Heredia", postal_code: "40101" })) f.store.setField(`shipping_address.${name}`, value);
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
test("checkout has structured labelled fields, server summary, safe prefill and no payment or phone inputs", () => {
  const html = renderCheckout();
  for (const text of ["Información de compra", "Resumen del pedido", "Confirmar compra", "Cancelar", "Nombre completo", "Correo electrónico", "Código postal"]) assert.equal(html.includes(text), true);
  assert.match(html, /name="shipping_address.line1"/); assert.match(html, /value="Ana Ejemplo"/);
  assert.doesNotMatch(html, /name="(?:total|price|user_id|phone|telephone|payment)"/);
  assert.match(html, /href="\/carrito"/);
  const busy = renderCheckout({ status: "submitting", formLocked: true, canSubmit: false });
  assert.match(busy, /aria-busy="true"/); assert.match(busy, /fieldset[^>]*disabled/);
  assert.match(busy, /Confirmando tu compra/);
  const empty = renderCheckout({ canSubmit: false }, { items: [], canCheckout: false });
  assert.match(empty, /Tu carrito está vacío/); assert.match(empty, /button[^>]*disabled=""[^>]*>Confirmar compra/);
});

const GENERAL_CHECKOUT_ERROR = "Ocurrió un problema al procesar tu compra. Por favor intenta de nuevo.";

test("checkout displays exact assignment text with associated structured fields and one submit button", () => {
  const html = renderCheckout();
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.match(html, /<h1>Checkout<\/h1><p class="checkout-intro">Revisa los detalles de tu compra y completa la información necesaria para finalizar el pedido\.<\/p>/);
  for (const [field, label] of [
    ["full_name", "Nombre completo"], ["buyer_email", "Correo electrónico"],
    ["line1", "Dirección de envío"], ["line2", "Dirección adicional (opcional)"],
    ["city", "Ciudad"], ["province", "Provincia"], ["postal_code", "Código postal"],
    ["country", "País (código de dos letras)"],
  ]) {
    assert.ok(html.includes(`<label for="buyer-${field}">${label}</label>`));
    const name = ["full_name", "buyer_email"].includes(field) ? field : `shipping_address.${field}`;
    const input = html.match(new RegExp(`<input[^>]*id="buyer-${field}"[^>]*>`))?.[0];
    assert.ok(input?.includes(`name="${name}"`));
  }
  assert.match(html, /id="buyer-buyer_email" type="email" autoComplete="email"/i);
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
  const store = createCheckoutSession({ createKey: () => null,
    checkoutPurchase: () => { requests += 1; } }, f.auth, f.cart);
  for (const [field, value] of Object.entries(f.store.getSnapshot().draft.shipping_address)) store.setField(`shipping_address.${field}`, value);
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
