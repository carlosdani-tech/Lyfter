import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { createCartSession } = await server.ssrLoadModule("/src/context/cartSession.js");
const { createAuthSession } = await server.ssrLoadModule("/src/context/authSession.js");
const { formatDecimalColones } = await server.ssrLoadModule("/src/utils/formatters.js");
const { default: AuthProvider } = await server.ssrLoadModule("/src/context/AuthProvider.jsx");
const { default: CartProvider } = await server.ssrLoadModule("/src/context/CartProvider.jsx");
const { default: useCartContext } = await server.ssrLoadModule("/src/hooks/useCartContext.js");
const { default: Login } = await server.ssrLoadModule("/src/components/auth/Login.jsx");
const { default: Header } = await server.ssrLoadModule("/src/components/layout/Header.jsx");
const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function cartData(quantity = 1, userId = 1) {
  return {
    id: 1, user_id: userId, status: "active", subtotal: `${quantity * 10}.00`, total: `${quantity * 10}.00`,
    items: quantity ? [{ id: 7, product_id: 4, name: "Alimento", quantity, unit_price: "10.00", line_total: `${quantity * 10}.00` }] : [],
  };
}
async function setup(role = "client") {
  let userId = 1;
  const auth = createAuthSession(async () => ({ access_token: "test-only-credential", user: { id: userId, role, is_active: true } }));
  if (role) await auth.login({});
  const calls = [];
  let backend = cartData();
  const api = {
    getProducts: async () => [4, 5].map((id) => ({ id, stock: 1000, is_active: true, image_url: "" })),
    getCart: async () => { calls.push(["get"]); return structuredClone(backend); },
    addCartItem: async (id, quantity) => {
      calls.push(["add", id, quantity]); backend = cartData((backend.items[0]?.quantity ?? 0) + quantity, userId);
      return structuredClone(backend);
    },
    updateCartItem: async (id, quantity) => {
      calls.push(["put", id, quantity]); backend = cartData(quantity, userId); return structuredClone(backend);
    },
    removeCartItem: async (id) => { calls.push(["delete", id]); backend = cartData(0, userId); return structuredClone(backend); },
  };
  const scope = () => {
    const snapshot = auth.getSnapshot();
    const version = snapshot.sessionVersion;
    const store = createCartSession(api, {
      userId: snapshot.currentUser?.id, isClient: snapshot.isClient,
      isCurrentSession: () => auth.isCurrentSession(version),
      runProtectedRequest: (operation) => auth.runProtectedRequest(operation, version),
    });
    auth.registerSessionCleanup(store.clearCartState);
    return store;
  };
  return { auth, api, calls, scope,
    get backend() { return backend; },
    set backend(value) { backend = value; },
    switchUser: async () => { userId = 2; backend = cartData(0, userId); await auth.login({}); },
  };
}

test("client loads a single authoritative cart; itemCount sums quantities and snapshots do not mutate API objects", async () => {
  const fixture = await setup();
  const source = cartData(3);
  source.items.push({ ...source.items[0], id: 8, product_id: 5, quantity: 2 });
  fixture.api.getCart = async () => source;
  const store = fixture.scope();
  assert.equal(store.getSnapshot().cart, null);
  const first = store.refreshCart();
  const second = store.refreshCart();
  assert.equal(first, second);
  await first;
  assert.equal(store.getSnapshot().itemCount, 5);
  assert.equal(store.getSnapshot().totals.total, "30.00");
  assert.equal(Object.isFrozen(source), false);
  assert.equal(Object.isFrozen(source.items[0]), false);
  assert.equal(Object.isFrozen(store.getSnapshot().cart), true);
  assert.equal(Object.isFrozen(store.getSnapshot().items[0]), true);
  source.items[0].quantity = 99;
  assert.equal(store.getSnapshot().items[0].quantity, 3);
});

test("checkout lock refuses pending cart operations, blocks writes, and releases without corrupting the cart", async () => {
  const fixture = await setup(); const store = fixture.scope();
  const initial = store.refreshCart();
  assert.equal(store.beginCheckout(), null); await initial;
  const before = store.getSnapshot().cart;
  const unlock = store.beginCheckout();
  assert.equal(typeof unlock, "function");
  assert.equal(store.getSnapshot().canCheckout, false);
  assert.equal(store.beginCheckout(), null);
  const count = fixture.calls.length;
  await store.incrementItem(7); await store.addItem(4); await store.refreshCart();
  assert.equal(fixture.calls.length, count);
  assert.equal(store.getSnapshot().cart, before);
  unlock(); assert.equal(store.getSnapshot().checkoutLocked, false);
  assert.equal(store.getSnapshot().canCheckout, true);
  const releaseOld = store.beginCheckout();
  store.clearCartState(); releaseOld();
  assert.equal(store.getSnapshot().cart, null);
});

test("checkout readiness follows public stock while prices/totals remain authoritative cart data", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  assert.equal(store.getSnapshot().canCheckout, true);
  fixture.api.getProducts = async () => [{ id: 4, stock: 0, is_active: true, price: "999.99", image_url: "/paw.png" }];
  await store.refreshCart();
  assert.equal(store.getSnapshot().canCheckout, false);
  assert.equal(store.getSnapshot().totals.total, "10.00");
  assert.equal(store.getSnapshot().items[0].unit_price, "10.00");
  fixture.api.getProducts = async () => { throw new Error("untrusted failure"); };
  await store.refreshCart();
  assert.equal(store.getSnapshot().canCheckout, false);
  assert.equal(store.getSnapshot().productsById, null);
  assert.match(store.getSnapshot().productError, /disponibilidad/);
});

test("context marks only affected items/products busy and reports items removed by refresh", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  const pending = deferred();
  fixture.api.updateCartItem = async () => { await pending.promise; return cartData(2); };
  const update = store.incrementItem(7);
  assert.deepEqual(store.getSnapshot().pendingItemIds, [7]);
  assert.equal(store.getSnapshot().canCheckout, false);
  pending.resolve();
  await update;
  assert.deepEqual(store.getSnapshot().pendingItemIds, []);
  assert.equal(store.getSnapshot().canCheckout, true);
  fixture.backend = cartData(0);
  await store.refreshCart();
  assert.match(store.getSnapshot().notice, /ya no aparecen/);
  assert.equal(store.getSnapshot().canCheckout, false);
});

test("logged-out and admin stores never request a cart or write to it", async () => {
  for (const role of [null, "admin"]) {
    const fixture = await setup(role);
    const store = fixture.scope();
    await store.refreshCart();
    await store.addItem(4);
    await store.incrementItem(7);
    assert.equal(store.getSnapshot().cart, null);
    assert.equal(fixture.calls.length, 0);
  }
});

test("rapid increments serialize against each previous server quantity", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  await Promise.all([store.incrementItem(7), store.incrementItem(7), store.incrementItem(7)]);
  assert.deepEqual(fixture.calls.filter(([method]) => method === "put"), [["put", 7, 2], ["put", 7, 3], ["put", 7, 4]]);
  assert.equal(store.getSnapshot().itemCount, 4);
  assert.equal(store.getSnapshot().loading, false);
});

test("duplicate in-flight adds and identical quantity assignments issue one write", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  const one = store.addItem(4, 1);
  const two = store.addItem(4, 1);
  assert.equal(one, two);
  await Promise.all([one, two]);
  await Promise.all([store.setItemQuantity(7, 5), store.setItemQuantity(7, 5)]);
  assert.equal(fixture.calls.filter(([method]) => method === "add").length, 1);
  assert.equal(fixture.calls.filter(([method]) => method === "put").length, 1);
  assert.equal(store.getSnapshot().itemCount, 5);
});

test("decrement at one removes once, and invalid zero quantity never writes", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  await store.setItemQuantity(7, 0);
  assert.equal(fixture.calls.length, 1);
  assert.match(store.getSnapshot().error, /enteros positivos/);
  await Promise.all([store.decrementItem(7), store.decrementItem(7), store.removeItem(7)]);
  assert.equal(fixture.calls.filter(([method]) => method === "delete").length, 1);
  assert.equal(fixture.calls.some(([method, , quantity]) => method === "put" && quantity <= 0), false);
  assert.equal(store.getSnapshot().itemCount, 0);
});

test("whole-cart responses for distinct items never overlap or overwrite another mutation", async () => {
  const fixture = await setup();
  fixture.backend.items.push({ ...fixture.backend.items[0], id: 8, product_id: 5 });
  const store = fixture.scope();
  await store.refreshCart();
  const write = deferred();
  let active = 0;
  let maxActive = 0;
  fixture.api.updateCartItem = async (id, quantity) => {
    active += 1; maxActive = Math.max(maxActive, active);
    if (id === 7) await write.promise;
    fixture.backend.items.find((item) => item.id === id).quantity = quantity;
    active -= 1;
    return structuredClone(fixture.backend);
  };
  const first = store.incrementItem(7);
  const next = store.incrementItem(8);
  await Promise.resolve();
  write.resolve();
  await Promise.all([first, next]);
  assert.equal(maxActive, 1);
  assert.equal(store.getSnapshot().itemCount, 4);
  assert.deepEqual(store.getSnapshot().items.map((item) => item.quantity), [2, 2]);
});

test("stock conflicts retain confirmed state and re-fetch instead of retrying a write", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  let writes = 0;
  fixture.api.updateCartItem = async () => {
    writes += 1;
    throw { status: 400, message: "Quantity cannot be greater than available stock." };
  };
  await store.incrementItem(7);
  assert.equal(writes, 1);
  assert.equal(fixture.calls.filter(([method]) => method === "get").length, 2);
  assert.equal(store.getSnapshot().itemCount, 1);
  assert.equal(store.getSnapshot().isStale, false);
  assert.equal(store.getSnapshot().error, "La cantidad solicitada supera el stock disponible. Revisamos tu carrito.");
});

test("ambiguous committed add is reconciled by GET and is never replayed", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  let adds = 0;
  fixture.api.addCartItem = async () => { adds += 1; fixture.backend = cartData(2); throw { status: 0 }; };
  await store.addItem(4);
  assert.equal(adds, 1);
  assert.equal(store.getSnapshot().itemCount, 2);
  assert.equal(store.getSnapshot().isStale, false);
  assert.ok(store.getSnapshot().error);
});

test("failed reconciliation preserves the last cart and cancels queued writes until a fresh read", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  let writes = 0;
  fixture.api.updateCartItem = async () => { writes += 1; throw { status: 0 }; };
  fixture.api.getCart = async () => { throw { status: 0 }; };
  await Promise.all([store.incrementItem(7), store.incrementItem(7)]);
  assert.equal(writes, 1);
  assert.equal(store.getSnapshot().itemCount, 1);
  assert.equal(store.getSnapshot().isStale, true);
  assert.match(store.getSnapshot().error, /confirmar el estado/);
  fixture.api.getCart = async () => cartData(2);
  await store.refreshCart();
  assert.equal(store.getSnapshot().itemCount, 2);
  assert.equal(store.getSnapshot().error, "");
});

test("logout clears synchronously and ignores late cart reads and queued writes", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  const read = deferred();
  fixture.api.getCart = () => read.promise;
  const refresh = store.refreshCart();
  const add = store.addItem(4);
  await Promise.resolve();
  fixture.auth.logout();
  assert.equal(store.getSnapshot().cart, null);
  assert.equal(store.getSnapshot().itemCount, 0);
  read.resolve(cartData(9));
  await Promise.all([refresh, add]);
  assert.equal(store.getSnapshot().cart, null);
  assert.equal(fixture.calls.length, 0);
});

test("a new user starts empty and cannot receive the previous user's cart response", async () => {
  const fixture = await setup();
  const previous = fixture.scope();
  await previous.refreshCart();
  const oldRead = deferred();
  fixture.api.getCart = () => oldRead.promise;
  const refresh = previous.refreshCart();
  await Promise.resolve();
  await fixture.switchUser();
  const next = fixture.scope();
  assert.equal(next.getSnapshot().cart, null);
  assert.equal(previous.getSnapshot().cart, null);
  fixture.api.getCart = async () => cartData(0, 2);
  await next.refreshCart();
  oldRead.resolve(cartData(9, 1));
  await refresh;
  assert.equal(next.getSnapshot().cart.user_id, 2);
  assert.equal(next.getSnapshot().itemCount, 0);
});

test("expired authentication clears the cart and does not attempt a recovery read", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  fixture.api.updateCartItem = async () => { throw { status: 401 }; };
  await store.incrementItem(7);
  assert.equal(fixture.auth.getSnapshot().isAuthenticated, false);
  assert.equal(store.getSnapshot().cart, null);
  assert.equal(fixture.calls.filter(([method]) => method === "get").length, 1);
});

test("a mismatched owner response is never accepted or displayed", async () => {
  const fixture = await setup();
  fixture.api.getCart = async () => cartData(99, 2);
  const store = fixture.scope();
  await store.refreshCart();
  assert.equal(store.getSnapshot().cart, null);
  assert.equal(store.getSnapshot().itemCount, 0);
  assert.equal(store.getSnapshot().isStale, true);
});

test("server money strings remain exact, including amounts above floating-point precision", () => {
  const formatted = formatDecimalColones("9007199254740993.29");
  assert.equal(formatted.replace(/[^0-9]/g, ""), "900719925474099329");
  assert.equal(formatDecimalColones("12.3"), "Precio no disponible");
});

test("clearing state does not overlap or restore a still-running mutation", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  const write = deferred();
  fixture.api.updateCartItem = async () => { await write.promise; fixture.backend = cartData(2); return fixture.backend; };
  const mutation = store.incrementItem(7);
  await Promise.resolve();
  store.clearCartState();
  const refresh = store.refreshCart();
  assert.equal(store.getSnapshot().cart, null);
  write.resolve();
  await Promise.all([mutation, refresh]);
  assert.equal(store.getSnapshot().itemCount, 2);
});

test("CartProvider exposes the full contract and the hook fails outside its provider", () => {
  function Probe() {
    const cart = useCartContext();
    for (const field of ["cart", "items", "itemCount", "totals", "displayTotals", "loading", "error"]) {
      assert.equal(Object.hasOwn(cart, field), true);
    }
    for (const action of ["refreshCart", "addItem", "incrementItem", "decrementItem", "setItemQuantity", "removeItem", "clearCartState"]) {
      assert.equal(typeof cart[action], "function");
    }
    assert.equal(cart.cart, null);
    return React.createElement("p", null, "cart ready");
  }
  assert.throws(() => renderToString(React.createElement(Probe)), /useCartContext requires CartProvider/);
  const tree = React.createElement(MemoryRouter, null, React.createElement(AuthProvider, null,
    React.createElement(CartProvider, null, React.createElement(Probe))));
  assert.match(renderToString(tree), /cart ready/);
});

test("guest add explanation is fixed Spanish text and the admin header has no cart link", () => {
  const guestLogin = React.createElement(MemoryRouter, { initialEntries: [{ pathname: "/login", state: { cartReason: "login-required" } }] },
    React.createElement(AuthProvider, null, React.createElement(Login)));
  assert.match(renderToString(guestLogin), /Inicia sesión como cliente para agregar productos/);
  const admin = { currentUser: { id: 1, role: "admin" }, isAuthenticated: true, isAdmin: true, isClient: false };
  const header = React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: admin },
    React.createElement(CartProvider, null, React.createElement(Header))));
  assert.doesNotMatch(renderToString(header), /href="\/carrito"/);
});

test("checkout failure does not clear or change the current cart", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  const cart = store.getSnapshot().cart;
  const version = fixture.auth.getSnapshot().sessionVersion;
  for (const status of [400, 409, 503]) {
    await assert.rejects(fixture.auth.runProtectedRequest(async () => { throw { status }; }, version),
      (error) => error.status === status);
    assert.equal(store.getSnapshot().cart, cart);
  }
});

test("late mutation completion cannot restore cart data after logout", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  const write = deferred();
  fixture.api.addCartItem = () => write.promise;
  const add = store.addItem(4);
  await Promise.resolve();
  fixture.auth.logout();
  write.resolve(cartData(9));
  await add;
  assert.equal(store.getSnapshot().cart, null);
  assert.equal(store.getSnapshot().itemCount, 0);
});

test("access feedback is route-scoped and stale cleanup cannot erase a newer denial", async () => {
  const fixture = await setup("admin");
  const store = fixture.scope();
  const before = store.getSnapshot();
  assert.equal(await store.denyAccess("Los administradores no pueden utilizar el carrito.", "default"), null);
  const first = store.getSnapshot().accessFeedback;
  assert.equal(first.locationKey, "default");
  assert.equal(store.getSnapshot().error, "");
  assert.equal(store.getSnapshot().status, before.status);
  await store.denyAccess(first.message, "next-route");
  const second = store.getSnapshot().accessFeedback;
  store.clearTransientFeedback(first);
  assert.equal(store.getSnapshot().accessFeedback, second);
  store.clearTransientFeedback(second);
  assert.deepEqual(store.getSnapshot(), before);
  assert.equal(fixture.calls.length, 0);
});

test("transient cleanup preserves operational errors and all cart recovery state", async () => {
  const fixture = await setup();
  const store = fixture.scope();
  await store.refreshCart();
  fixture.api.addCartItem = async () => { throw { status: 400, message: "Quantity cannot be greater than available stock." }; };
  fixture.api.getCart = async () => { throw { status: 0 }; };
  await store.addItem(4);
  const failed = store.getSnapshot();
  assert.equal(failed.accessFeedback, null);
  assert.equal(failed.isStale, true);
  assert.equal(failed.error, "La cantidad solicitada supera el stock disponible. Revisamos tu carrito. No pudimos confirmar el estado actual. Actualiza el carrito para continuar.");
  await store.denyAccess("Los administradores no pueden utilizar el carrito.", "origin");
  store.clearTransientFeedback(store.getSnapshot().accessFeedback);
  assert.deepEqual(store.getSnapshot(), failed);
});

test("old session cleanup and actions cannot change a new session's feedback", async () => {
  const fixture = await setup("admin");
  const previous = fixture.scope();
  await previous.denyAccess("Los administradores no pueden utilizar el carrito.", "default");
  const oldFeedback = previous.getSnapshot().accessFeedback;
  await fixture.switchUser();
  const next = fixture.scope();
  await next.denyAccess(oldFeedback.message, "default");
  const current = next.getSnapshot();
  previous.clearTransientFeedback(oldFeedback);
  next.clearTransientFeedback(oldFeedback);
  await previous.denyAccess(oldFeedback.message, "stale-route");
  assert.equal(previous.getSnapshot().accessFeedback, null);
  assert.equal(next.getSnapshot(), current);
});
