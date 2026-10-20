import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { loadProductResource } = await server.ssrLoadModule("/src/utils/productResource.js");
const { getProduct, getProducts, updateProduct, deleteProduct } = await server.ssrLoadModule("/src/api/productsApi.js");
const { formatProductValidationError } = await server.ssrLoadModule("/src/utils/apiValidation.js");
const product = { id: 4, name: "Alimento", description: null, category: "Mascotas", price: "12.50", stock: 10, image_url: null, is_active: true };
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } }); }

test("malformed product IDs cannot reach read/update/delete API paths", async (t) => {
  let calls = 0; t.mock.method(globalThis, "fetch", async () => { calls += 1; return json({ data: { product } }); });
  for (const id of [0, -1, 1.5, 2147483648, "1\n", "01", "1e3", "../auth", "//evil.example", {}, undefined]) {
    for (const operation of [() => getProduct(id), () => updateProduct(id, {}, "test-only-credential"), () => deleteProduct(id, "test-only-credential")]) {
      await assert.rejects(operation(), (error) => error.status === 400);
    }
  }
  assert.equal(calls, 0);
});

test("fresh product detail is fetched from its URL ID without prior selection", async (t) => {
  const calls = []; t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, options }); return json({ data: { product } }); });
  const result = await loadProductResource(4);
  assert.deepEqual(result, { product, loading: false, error: "" });
  assert.equal(new URL(calls[0].url).pathname, "/products/4");
  assert.equal(calls[0].options.headers.has("Authorization"), false);
});

test("404 and inactive products are missing; network, server and malformed successes are retryable errors", async (t) => {
  let response;
  t.mock.method(globalThis, "fetch", async () => {
    if (response === "network") throw new Error("sensitive transport contents");
    return response();
  });
  for (const missing of [() => json({ error: { message: "sensitive contents" } }, 404), () => json({ data: { product: { ...product, is_active: false } } })]) {
    response = missing;
    assert.deepEqual(await loadProductResource(4), { product: null, loading: false, error: "" });
  }
  for (const failure of ["network", () => json({ error: { message: "sensitive server contents" } }, 503),
    () => json({ data: {} }), () => json({ data: { product: null } }),
    () => json({ data: { product: { ...product, id: 5 } } }),
    () => json({ data: { product: { ...product, name: {} } } })]) {
    response = failure;
    const state = await loadProductResource(4);
    assert.equal(state.product, null); assert.match(state.error, /No se pudo cargar el producto/);
    assert.doesNotMatch(state.error, /sensitive|contents|stack|no existe/);
  }
});

test("route changes ignore stale product success and failure even when fetch ignores abort", async (t) => {
  for (const fail of [false, true]) {
    let resolve; const wait = new Promise((yes) => { resolve = yes; });
    t.mock.method(globalThis, "fetch", async () => { await wait; if (fail) throw new Error("stale error"); return json({ data: { product } }); });
    const controller = new AbortController();
    const pending = loadProductResource(4, { signal: controller.signal });
    controller.abort(); resolve(); assert.equal(await pending, null);
  }
});

test("malformed product catalogs fail as API errors instead of crashing or appearing empty", async (t) => {
  let products;
  t.mock.method(globalThis, "fetch", async () => json({ data: { products } }));
  for (const value of [undefined, null, {}, [null], [{ ...product, price: {} }]]) {
    products = value; await assert.rejects(getProducts(), (error) => error.status === 502);
  }
  products = []; assert.deepEqual(await getProducts(), []);
});

test("validation error UI contains only recognized field labels and fixed messages", () => {
  const result = formatProductValidationError({ status: 400, details: {
    "sensitive field name": "sensitive detail", price: "sensitive personal data", stack: "trace" } });
  assert.match(result, /Precio/); assert.doesNotMatch(result, /sensitive|stack|trace/);
  const unknown = formatProductValidationError({ status: 400, details: { "sensitive field name": "sensitive detail" } });
  assert.equal(unknown, "Revisa los datos del producto e intenta nuevamente.");
});

test("stock validation uses Spanish terminology and grammatical agreement", () => {
  for (const [detail, expected] of [
    ["required", "Revisa los datos del producto: Stock: la cantidad es obligatoria."],
    ["greater than or equal", "Revisa los datos del producto: Stock: la cantidad debe ser mayor o igual a 0."],
    ["unsafe-provider-content", "Revisa los datos del producto: Stock: la cantidad debe ser un número entero válido."],
  ]) {
    assert.equal(formatProductValidationError({ status: 400, details: { stock: detail } }), expected);
  }
});
