import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { getCart, addCartItem, updateCartItem, removeCartItem } = await server.ssrLoadModule("/src/api/cartApi.js");
const { checkoutPurchase } = await server.ssrLoadModule("/src/api/salesApi.js");
const { request } = await server.ssrLoadModule("/src/api/apiClient.js");
const cart = { id: 1, items: [], subtotal: "0.00", total: "0.00" };
const purchase = { sale: { id: 1, email_status: "failed", total_amount: "25.00" }, invoice: { id: 2 } };
const buyer = {
  items: [{ product_id: 12, quantity: 2 }], total_amount: "17000.00",
  full_name: "Ana Ejemplo", buyer_email: "ana@example.com",
  shipping_address: "Del parque central de San José, 200 metros al norte, edificio azul.",
};
const credential = "test-only-credential";

function mockFetch(t, payload = { data: { cart } }, status = 200) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  });
  return calls;
}
function checkAuthorization(call) {
  assert.equal(call.headers.get("Authorization") === `Bearer ${credential}`, true);
  assert.equal(call.url.includes(credential), false);
  assert.equal(call.body?.includes(credential) ?? false, false);
}

test("cart methods use the verified paths, bodies, and unwrapped backend cart", async (t) => {
  const calls = mockFetch(t);
  assert.deepEqual(await getCart(credential), cart);
  assert.deepEqual(await addCartItem("4", "2", credential), cart);
  assert.deepEqual(await updateCartItem(7, 3, credential), cart);
  assert.deepEqual(await removeCartItem("7", credential), cart);
  assert.deepEqual(calls.map((call) => [new URL(call.url).pathname, call.method]), [
    ["/cart", "GET"], ["/cart/items", "POST"], ["/cart/items/7", "PUT"], ["/cart/items/7", "DELETE"],
  ]);
  assert.equal(calls[0].body, undefined);
  assert.deepEqual(JSON.parse(calls[1].body), { product_id: 4, quantity: 2 });
  assert.deepEqual(JSON.parse(calls[2].body), { quantity: 3 });
  assert.equal(calls[3].body, undefined);
  for (const call of calls) checkAuthorization(call);
  assert.equal(calls[1].headers.get("Content-Type"), "application/json");
});

test("invalid IDs and quantities fail locally without sending requests", async (t) => {
  const calls = mockFetch(t);
  for (const invalid of [null, undefined, true, false, {}, [], 0, -1, 1.5, NaN, Infinity, 2147483648, "1x", "1e3", "01", "1\n", " 1"]) {
    for (const operation of [() => addCartItem(invalid, 1, credential),
      () => addCartItem(1, invalid, credential), () => updateCartItem(invalid, 1, credential),
      () => updateCartItem(1, invalid, credential), () => removeCartItem(invalid, credential)]) {
      await assert.rejects(operation(), (error) => error.status === 400 && Boolean(error.details));
    }
  }
  assert.equal(calls.length, 0);
});

test("missing or unsafe credentials never reach fetch", async (t) => {
  const calls = mockFetch(t);
  for (const value of [undefined, "", {}, "Bearer value", "bad\nheader", "bad\u0000header", "badé"]) {
    await assert.rejects(getCart(value), (error) => error.status === 401);
    await assert.rejects(checkoutPurchase(buyer, value, "attempt-1"), (error) => error.status === 401);
  }
  assert.equal(calls.length, 0);
});

test("checkout sends only approved buyer/address/snapshot fields and exact idempotency header", async (t) => {
  const calls = mockFetch(t, { data: purchase }, 201);
  const source = {
    ...buyer, user_id: 99, role: "admin", price: 1, total: 1, items: [{ product_id: 12, quantity: 2, price: 8500, name: "Alimento", product: { id: 12 }, toJSON: () => ({ user_id: 99 }) }], invoice_number: "ignored", status: "completed",
    toJSON: () => ({ total: 1 }), shipping_address: `  ${buyer.shipping_address}  `, country: "CR", line1: "ignored", city: "ignored", province: "ignored", postal_code: "ignored", line2: "ignored",
  };
  const result = await checkoutPurchase(source, credential, "purchase._:-123");
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/sales/checkout");
  assert.equal(calls[0].method, "POST");
  checkAuthorization(calls[0]);
  assert.equal(calls[0].headers.get("Idempotency-Key"), "purchase._:-123");
  assert.deepEqual(JSON.parse(calls[0].body), buyer);
  assert.equal(typeof JSON.parse(calls[0].body).shipping_address, "string");
  assert.deepEqual(result.sale, purchase.sale);
  assert.deepEqual(result.invoice, purchase.invoice);
  assert.equal(result.idempotencyKey, "purchase._:-123");
  // Email delivery failure remains a successful purchase response.
  assert.equal(result.sale.email_status, "failed");
});

test("omitted checkout key generates a valid key and makes it available to the caller", async (t) => {
  const calls = mockFetch(t, { data: purchase }, 201);
  const result = await checkoutPurchase(buyer, credential);
  assert.match(result.idempotencyKey, /^[A-Za-z0-9._:-]{1,128}$/);
  assert.equal(calls[0].headers.get("Idempotency-Key"), result.idempotencyKey);
});

test("invalid checkout keys and non-scalar buyer fields fail before fetch", async (t) => {
  const calls = mockFetch(t);
  for (const key of [null, "", "bad key", "key\n", "é", "a".repeat(129), {}]) {
    await assert.rejects(checkoutPurchase(buyer, credential, key),
      (error) => error.status === 400 && Boolean(error.details["Idempotency-Key"]));
  }
  for (const data of [null, [], {}, { ...buyer, full_name: {} },
    { ...buyer, shipping_address: [] }, { ...buyer, shipping_address: { ...buyer.shipping_address, city: {} } }]) {
    await assert.rejects(checkoutPurchase(data, credential, "attempt-1"), (error) => error.status === 400);
  }
  assert.equal(calls.length, 0);
});

test("backend structured validation is retained, with untrusted fields/messages sanitized", async (t) => {
  mockFetch(t, { error: { message: "Invalid request payload.", details: {
    buyer_email: "Must be a valid email address.",
    shipping_address: "Must contain 1 to 500 characters without control characters except line breaks.",
    full_name: "unsafe-provider-content", debug: "unsafe-provider-content",
  } } }, 400);
  await assert.rejects(checkoutPurchase(buyer, credential, "attempt-1"), (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.message, "Invalid request payload.");
    assert.deepEqual(error.details, {
      buyer_email: "Must be a valid email address.",
      shipping_address: "Must contain 1 to 500 characters without control characters except line breaks.", full_name: "Invalid value.",
    });
    assert.equal(error.idempotencyKey, "attempt-1");
    return true;
  });
});

test("stock and idempotency conflict errors retain safe business meaning and status", async (t) => {
  const calls = mockFetch(t, { error: { message: "Insufficient stock for one or more products." } }, 400);
  await assert.rejects(checkoutPurchase(buyer, credential, "attempt-1"),
    (error) => error.status === 400 && error.message === "Insufficient stock for one or more products.");
  assert.equal(calls.length, 1);
});

test("explicit-key conflict preserves the key and does not auto-retry", async (t) => {
  const calls = mockFetch(t, { error: { message: "Idempotency key was already used with different details." } }, 409);
  for (let index = 0; index < 2; index += 1) {
    await assert.rejects(checkoutPurchase(buyer, credential, "attempt-1"),
      (error) => error.status === 409 && error.idempotencyKey === "attempt-1" && error.message.includes("different details"));
  }
  assert.equal(calls.length, 2);
  assert.equal(calls.every((call) => call.headers.get("Idempotency-Key") === "attempt-1"), true);
});

test("matching caller-initiated replay returns the backend purchase with the same key", async (t) => {
  const calls = mockFetch(t, { data: purchase }, 201);
  const first = await checkoutPurchase(buyer, credential, "attempt-1");
  const replay = await checkoutPurchase(buyer, credential, first.idempotencyKey);
  assert.deepEqual(replay, first);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers.get("Idempotency-Key"), calls[1].headers.get("Idempotency-Key"));
});

test("network failure is sanitized, retains the attempt key, and never retries automatically", async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async () => { attempts += 1; throw new Error("unsafe-provider-content"); });
  await assert.rejects(checkoutPurchase(buyer, credential), (error) => {
    assert.equal(error.status, 0);
    assert.equal(error.message, "Unable to connect to the API.");
    assert.equal(error.details, null);
    assert.equal(typeof error.idempotencyKey, "string");
    return true;
  });
  assert.equal(attempts, 1);
});

test("server internals and HTML errors never escape the boundary", async (t) => {
  mockFetch(t, { error: { message: "unsafe-provider-content", details: { debug: "unsafe-provider-content" } } }, 503);
  await assert.rejects(checkoutPurchase(buyer, credential, "attempt-1"),
    (error) => error.status === 503 && error.message === "The service is temporarily unavailable." && error.details === null);
});

test("HTML or malformed JSON errors preserve auth HTTP status without exposing the body", async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async () => ++attempts === 1
    ? new Response("<html>unsafe-provider-content</html>", { status: 401 })
    : new Response("{bad JSON", { status: 422, headers: { "Content-Type": "application/json" } }));
  for (const status of [401, 422]) {
    await assert.rejects(getCart(credential), (error) => error.status === status && !error.message.includes("unsafe-provider-content"));
  }
});

test("malformed successful responses fail safely with 502 and keep the checkout key", async (t) => {
  mockFetch(t, { data: {} });
  await assert.rejects(getCart(credential), (error) => error.status === 502);
  await assert.rejects(checkoutPurchase(buyer, credential, "attempt-1"),
    (error) => error.status === 502 && error.idempotencyKey === "attempt-1");
});

test("apiClient preserves structured product validation", async (t) => {
  const details = { price: ["Must be greater than or equal to 0."] };
  mockFetch(t, { error: { message: "Invalid request payload.", details } }, 400);
  await assert.rejects(request("/products"), (error) => {
    assert.equal(error.status, 400);
    assert.deepEqual(error.details, details);
    return true;
  });
});

test("apiClient preserves cancellation without exposing a transport error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("Request aborted.", "AbortError"); });
  await assert.rejects(request("/products"), (error) => error.name === "AbortError");
});


test("checkout serializes every ID and quantity in cart order without product fields", async (t) => {
  const calls = mockFetch(t, { data: purchase }, 201);
  await checkoutPurchase({ ...buyer, items: [
    { product_id: 19, quantity: 1, name: "Cama", unit_price: "21500.00", line_total: "21500.00" },
    { product_id: 12, quantity: 2, product: { name: "Alimento" }, price: "8500.00" },
  ], total_amount: "38500.00", email_status: "sent", subtotal: "1.00", tax: "0.00" }, credential, "snapshot-1");
  assert.deepEqual(JSON.parse(calls[0].body), { ...buyer,
    items: [{ product_id: 19, quantity: 1 }, { product_id: 12, quantity: 2 }], total_amount: "38500.00" });
});

test("checkout rejects empty, duplicate and malformed snapshots before fetch", async (t) => {
  const calls = mockFetch(t);
  for (const items of [undefined, null, [], Array(1), {}, Array.from({ length: 1001 }, (_, i) => ({ product_id: i + 1, quantity: 1 })),
    [{ product_id: 12, quantity: 1 }, { product_id: 12, quantity: 2 }]]) {
    await assert.rejects(checkoutPurchase({ ...buyer, items }, credential, "snapshot-1"), (error) => error.status === 400);
  }
  for (const value of [undefined, null, true, "2", 0, -1, 1.5, NaN, Infinity, 2147483648, Number.MAX_SAFE_INTEGER + 1]) {
    for (const field of ["product_id", "quantity"]) {
      await assert.rejects(checkoutPurchase({ ...buyer, items: [{ product_id: 12, quantity: 2, [field]: value }] }, credential, "snapshot-1"),
        (error) => error.status === 400);
    }
  }
  for (const total_amount of [undefined, null, 17000, "", "1", "1.0", "1.000", "01.00", "-1.00", " 1.00", "1.00\n", "₡17000.00", "17,000.00", "100000000.00", "1e2", "NaN"]) {
    await assert.rejects(checkoutPurchase({ ...buyer, total_amount }, credential, "snapshot-1"), (error) => error.status === 400);
  }
  for (const patch of [{ full_name: " " }, { full_name: "a".repeat(201) }, { buyer_email: "invalid" },
    { buyer_email: "a".repeat(255) }, { shipping_address: "a".repeat(501) }]) {
    await assert.rejects(checkoutPurchase({ ...buyer, ...patch }, credential, "snapshot-1"), (error) => error.status === 400);
  }
  assert.equal(calls.length, 0);
});

test("snapshot conflict messages survive sanitization and never auto-resubmit", async (t) => {
  for (const message of ["Checkout cart snapshot does not match the active cart.", "Checkout total does not match the current cart total."]) {
    const calls = mockFetch(t, { error: { message } }, 409);
    await assert.rejects(checkoutPurchase(buyer, credential, "snapshot-1"), (error) => error.status === 409 && error.message === message);
    assert.equal(calls.length, 1);
    t.mock.restoreAll();
  }
});


test("shipping address requires plain text and normalizes only surrounding whitespace and line endings", async (t) => {
  const calls = mockFetch(t, { data: purchase }, 201);
  for (const shipping_address of [undefined, null, {}, { line1: "Calle 1" }, [], 123, "", " ", "\n\r\n", "a".repeat(501), "Calle\u0000azul"]) {
    await assert.rejects(checkoutPurchase({ ...buyer, shipping_address }, credential, "address-attempt"),
      (error) => error.status === 400 && Object.hasOwn(error.details, "shipping_address"));
  }
  assert.equal(calls.length, 0);
  for (const shipping_address of ["a".repeat(500), "Del parque de San José, 200 metros al norte.", "  Edificio azul.\r\nApartamento 3.\rSan José.  "]) {
    await checkoutPurchase({ ...buyer, shipping_address }, credential, "address-attempt");
    assert.deepEqual(JSON.parse(calls.at(-1).body), { ...buyer,
      shipping_address: shipping_address.replace(/\r\n?/g, "\n").trim() });
  }
});


test("cart and checkout pass cancellation signals without changing bodies or authorization", async (t) => {
  const calls = mockFetch(t, { data: { cart, ...purchase } }, 201);
  const controller = new AbortController(), options = { signal: controller.signal };
  await getCart(credential, options);
  await addCartItem(4, 2, credential, options);
  await updateCartItem(7, 3, credential, options);
  await removeCartItem(7, credential, options);
  await checkoutPurchase(buyer, credential, "cancel-attempt", options);
  assert.equal(calls.length, 5);
  for (const call of calls) { assert.equal(call.signal, controller.signal); checkAuthorization(call); }
  assert.deepEqual(JSON.parse(calls[4].body), buyer);
  assert.equal(calls[4].headers.get("Idempotency-Key"), "cancel-attempt");
});
