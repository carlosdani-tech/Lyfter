import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createServer } from "vite";
import { mountProvider } from "../helpers/providerHarness.mjs";
import { toast } from "react-toastify";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { default: CartPage } = await server.ssrLoadModule("/src/components/cart/CartPage.jsx");
const { default: ProductThumbnail } = await server.ssrLoadModule("/src/components/products/ProductThumbnail.jsx");
const { default: AddToCartButton } = await server.ssrLoadModule("/src/components/products/AddToCartButton.jsx");
const { default: Header } = await server.ssrLoadModule("/src/components/layout/Header.jsx");
const { default: CartFeedback } = await server.ssrLoadModule("/src/components/cart/CartFeedback.jsx");
const { default: CartProvider } = await server.ssrLoadModule("/src/context/CartProvider.jsx");
const { default: useCartContext } = await server.ssrLoadModule("/src/hooks/useCartContext.js");
const { CartContext } = await server.ssrLoadModule("/src/context/CartContext.js");
const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");
const { canCheckoutCart } = await server.ssrLoadModule("/src/utils/cartPresentation.js");
const { formatDecimalColones } = await server.ssrLoadModule("/src/utils/formatters.js");
const { default: AdminPage } = await server.ssrLoadModule("/src/components/admin/AdminPage.jsx");
const { default: ProductDetailPage } = await server.ssrLoadModule("/src/components/products/ProductDetailPage.jsx");
const { default: useProductForm } = await server.ssrLoadModule("/src/hooks/useProductForm.js");

function fixture(patch = {}) {
  const items = [
    { id: 7, product_id: 4, name: "Alimento para gatos", quantity: 2, unit_price: "12.50", line_total: "25.00" },
    { id: 8, product_id: 5, name: "Cama para mascotas", quantity: 1, unit_price: "30.00", line_total: "30.00" },
  ];
  const context = {
    items, cart: { id: 1, user_id: 1, status: "active", items }, itemCount: 3,
    productsById: { 4: { stock: 10, is_active: true, image_url: "https://example.com/alimento.jpg" },
      5: { stock: 5, is_active: true, image_url: null } },
    totals: { subtotal: "55.00", total: "55.00" },
    displayTotals: { subtotal: formatDecimalColones("55.00"), total: formatDecimalColones("55.00") },
    loading: false, error: "", productError: "", isStale: false, notice: "Carrito actualizado.",
    pendingItemIds: [], pendingProductIds: [],
    refreshCart: async () => null, incrementItem: async () => null, decrementItem: async () => null,
    removeItem: async () => null, setItemQuantity: async () => null, addItem: async () => null,
    ...patch,
  };
  return { ...context, canCheckout: canCheckoutCart(context) };
}
function render(context, element = React.createElement(CartPage), location = "/carrito",
  auth = { isAuthenticated: true, isClient: true, authLoading: false, currentUser: { first_name: "Ana" } }) {
  return renderToString(React.createElement(MemoryRouter, { initialEntries: [location] },
    React.createElement(AuthContext.Provider, { value: auth },
      React.createElement(CartContext.Provider, { value: context }, element)))).replace(/<!--[\s\S]*?-->/g, "");
}

test("heading outline requires focus-visible while cart controls keep their focus indicator", async () => {
  const css = await readFile(new URL("../../src/index.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.cart-page h1:focus\s*\{/);
  assert.match(css, /\.cart-page h1:focus-visible\s*\{\s*outline: 0\.125rem solid #6366f1;\s*outline-offset: 0\.375rem;/);
  assert.match(css, /:is\(\.cart-page, \.header, \.footer, \.products-page, \.product-detail-page\) :is\(a, button\):focus-visible\s*\{\s*outline: 0\.1875rem solid #6366f1;/);
  assert.match(css, /\.cart-quantity button:focus-visible\s*\{\s*outline-offset: -0\.1875rem;/);
});

// Exercise the actual removal handlers with a simulated active element.
// Browser modality and painted outlines require a browser, not server rendering.
test("remove and decrement restore heading focus for disappearing middle and final items", async (t) => {
  const body = {};
  const document = { body, activeElement: body };
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const elements = (node) => !React.isValidElement(node) ? [] :
    [node, ...React.Children.toArray(node.props.children).flatMap(elements)];

  for (const action of ["removeItem", "decrementItem"]) {
    for (const finalItem of [false, true]) {
      for (const detached of [false, true]) {
        let heading, row, calls = 0, focused = 0;
        const context = fixture();
        const item = { ...context.items[1], quantity: 1 };
        context.items = finalItem ? [item] : [context.items[0], item, { ...context.items[0], id: 9 }];
        context[action] = async (id) => {
          assert.equal(id, item.id);
          calls += 1;
          if (detached) document.activeElement = body;
          return { items: context.items.filter((entry) => entry.id !== id) };
        };
        function Probe() {
          const page = CartPage();
          const nodes = elements(page);
          heading = nodes.find((node) => node.type === "h1");
          heading.props.ref.current = { focus: () => { focused += 1; document.activeElement = heading.props.ref.current; } };
          const itemElement = nodes.find((node) => node.props.item?.id === item.id);
          row = itemElement.type(itemElement.props);
          return page;
        }
        render(context, React.createElement(Probe));
        assert.equal(heading.props.id, "cart-title");
        assert.equal(heading.props.tabIndex, -1);
        assert.equal(heading.props.children, "Carrito de compras");
        assert.equal(heading.props.onClick, undefined);
        assert.equal(heading.props.onPointerDown, undefined);
        assert.equal(heading.props.onTouchStart, undefined);
        const button = elements(row).find((node) => node.type === "button" &&
          (action === "removeItem" ? node.props.className === "cart-item__remove" :
            node.props["aria-label"]?.startsWith("Disminuir")));
        document.activeElement = button;
        button.props.onClick({ currentTarget: button });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(calls, 1);
        assert.equal(focused, 1);
        assert.equal(document.activeElement, heading.props.ref.current);
      }
    }
  }
});

test("populated cart renders server fields, accessible steppers, exact labels, and checkout link", () => {
  const html = render(fixture());
  for (const text of ["Carrito de compras", "Producto #4", "Alimento para gatos", "Precio unitario", "Subtotal", "Total:", "Ir al checkout"]) {
    assert.equal(html.includes(text), true);
  }
  assert.match(html, /aria-label="Disminuir cantidad de Alimento para gatos"/);
  assert.match(html, /aria-label="Aumentar cantidad de Alimento para gatos"/);
  assert.match(html, /aria-label="Eliminar Alimento para gatos del carrito"/);
  assert.match(html, /<output[^>]*>2<\/output>/);
  assert.match(html, /href="\/checkout"/);
  assert.match(html, /<a[^>]*>Ir al checkout<\/a>/);
  assert.match(html, /https:\/\/example.com\/alimento.jpg/);
  assert.equal(html.includes("€"), false);
  assert.equal(html.includes("Mostrar carrito vacío"), false);
});

test("empty cart links to products and checkout is a real disabled button", () => {
  const html = render(fixture({ items: [], cart: { id: 1, items: [] } }));
  assert.match(html, /Tu carrito está vacío/);
  assert.match(html, /href="\/productos"/);
  assert.doesNotMatch(html, /href="\/checkout"/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Ir al checkout<\/button>/);
});

test("initial load does not flash empty state, and API errors offer a context refresh", () => {
  const html = render(fixture({ cart: null, items: [], loading: true }));
  assert.match(html, /Cargando tu carrito/);
  assert.doesNotMatch(html, /Tu carrito está vacío/);
  const failed = render(fixture({ cart: null, items: [], isStale: true, error: "No se pudo cargar el carrito." }));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /No pudimos cargar tu carrito/);
  assert.match(failed, /Actualizar carrito/);
  assert.doesNotMatch(failed, /href="\/checkout"/);
});

test("mutation disables only the affected row and marks the previous total busy", () => {
  const html = render(fixture({ loading: true, pendingItemIds: [7] }));
  const rows = html.match(/<li class="cart-item"[\s\S]*?<\/li>/g);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /aria-busy="true"/);
  assert.match(rows[0], /disabled=""/);
  assert.doesNotMatch(rows[1], /disabled=""/);
  assert.match(html, /class="cart-summary__total" aria-busy="true"/);
  assert.match(html, /Verificando total y disponibilidad/);
  assert.doesNotMatch(html, /href="\/checkout"/);
});

test("out-of-stock, unavailable, conflicting, and unknown product states prevent checkout", () => {
  for (const [productsById, expected] of [
    [{ 4: { stock: 0, is_active: true } }, "Sin stock. Elimina este artículo para continuar."],
    [{}, "ya no está disponible"],
    [{ 4: { stock: 1, is_active: true } }, "Stock disponible: 1. Ajusta la cantidad para continuar."],
    [null, "Verificando disponibilidad"],
  ]) {
    const html = render(fixture({ productsById }));
    assert.equal(html.includes(expected), true);
    assert.doesNotMatch(html, /href="\/checkout"/);
  }
});

test("quantity conflict text agrees for one or several available units", () => {
  for (const stock of [1, 2]) {
    const context = fixture();
    context.items = [{ ...context.items[0], quantity: 3 }];
    context.productsById = { 4: { stock, is_active: true } };
    context.canCheckout = false;
    const html = render(context);
    assert.ok(html.includes(`Stock disponible: ${stock}. Ajusta la cantidad para continuar.`));
    assert.ok(html.includes(`Usar el stock disponible (${stock})`));
  }
});

test("product forms, administration and detail use Spanish availability terminology", () => {
  let form;
  function Probe() { form = useProductForm(); return null; }
  render(fixture(), React.createElement(Probe));
  const html = render(fixture(), React.createElement(AdminPage, {
    loading: false, products: [], productForm: form.productForm,
    handleProductFormChange: form.handleFormChange,
  }));
  assert.match(html, /<label>\s*Stock\s*<input[^>]*name="stock"/);
  assert.ok(form.validateForm().includes("El stock debe ser un número entero mayor o igual a 0."));
  const populated = render(fixture(), React.createElement(AdminPage, {
    loading: false, products: [{ id: 4, name: "Alimento", price: "12.50", stock: 1 }],
    productForm: form.productForm, handleProductFormChange: form.handleFormChange,
    formatAdminId: String,
  }));
  assert.ok(populated.includes("<th>Stock</th>"));
  assert.ok(html.includes("Categoría del producto (p. ej., alimento o juguetes)"));
  const detail = render(fixture(), React.createElement(ProductDetailPage, { selectedProduct: {
    id: 4, name: "Alimento", price: "12.50", stock: 1, is_active: true,
  } }));
  assert.ok(detail.includes("Stock disponible: 1"));
  const loading = render(fixture(), React.createElement(AdminPage, { loading: true }));
  assert.ok(loading.includes("Cargando el panel de administración..."));
});

test("a missing thumbnail has an accessible stable fallback; supplied URLs retain alt text", () => {
  const missing = renderToString(React.createElement(ProductThumbnail, { name: "Cama", imageUrl: null }));
  assert.match(missing, /role="img"/);
  assert.match(missing, /aria-label="Imagen no disponible de Cama"/);
  assert.doesNotMatch(missing, /<img/);
  const provided = renderToString(React.createElement(ProductThumbnail, { name: "Cama", imageUrl: "/paw.png" }));
  assert.match(provided, /alt="Imagen de Cama"/);
  assert.match(provided, /width="112" height="112"/);
});

test("detail add retains exact text with a Spanish explanation when stock is zero", () => {
  const html = render(fixture(), React.createElement(AddToCartButton, { detail: true, product: { id: 4, stock: 0, is_active: true } }));
  assert.match(html, /Agregar al carrito/);
  assert.match(html, /<button[^>]*>Agregar al carrito<\/button>/);
  assert.match(html, /<p[^>]*>Sin stock por el momento\.<\/p>/);
  assert.match(html, /disabled=""/);
});

test("header reuses quantity sum and NavLink active state on the cart route", () => {
  const html = render(fixture(), React.createElement(Header));
  assert.match(html, /aria-current="page" class="active" href="\/carrito"/);
  assert.match(html, /aria-label="Carrito, 3 productos en el carrito"/);
  assert.match(html, /Carrito \(3\)/);
  assert.match(html, /Cerrar sesión/);
});

test("long and untrusted product names are escaped and retain stable item IDs", () => {
  const context = fixture();
  context.items = [{ ...context.items[0], name: `${"Nombre largo ".repeat(30)}<script>no ejecutar</script>` }];
  const html = render(context);
  assert.match(html, /&lt;script&gt;no ejecutar&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /id="cart-item-7-title"/);
});

// Capture the actual action closure while React provides the hooks and contexts.
// No DOM renderer is installed; this also exercises clicks before a re-render.
function addButtonAction(context, product = { id: 4, name: "Alimento", stock: 10, is_active: true }) {
  let button;
  function Probe() {
    const element = AddToCartButton({ product });
    button = element.props.children[0];
    return element;
  }
  render(context, React.createElement(React.StrictMode, null, React.createElement(Probe)));
  return button.props.onClick;
}

test("add action notifies only after confirmation and permits a later successful addition", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  let resolve;
  const response = new Promise((yes) => { resolve = yes; });
  const calls = [];
  const click = addButtonAction(fixture({ addItem: (...args) => { calls.push(args); return response; } }));
  assert.equal(success.mock.callCount(), 0);
  const first = click();
  await click();
  assert.deepEqual(calls, [[4, 1]]);
  assert.equal(success.mock.callCount(), 0);
  resolve(fixture().cart);
  await first;
  assert.deepEqual(success.mock.calls.map(({ arguments: args }) => args), [["Alimento se agregó al carrito."]]);
  await click();
  assert.equal(calls.length, 2);
  assert.equal(success.mock.callCount(), 2);
});

test("null outcomes including access denial, session changes, and reconciled failures never notify", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  let calls = 0;
  const click = addButtonAction(fixture({ addItem: async () => { calls += 1; return null; } }));
  await click();
  await click();
  assert.equal(calls, 2);
  assert.equal(success.mock.callCount(), 0);
});

test("unexpected rejection never notifies and releases the action guard", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  let calls = 0;
  const click = addButtonAction(fixture({ addItem: async () => { calls += 1; throw new Error("Request failed"); } }));
  await assert.rejects(click(), /Request failed/);
  await assert.rejects(click(), /Request failed/);
  assert.equal(calls, 2);
  assert.equal(success.mock.callCount(), 0);
});

test("unavailable, pending, and checkout-locked actions do not request or notify", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  let calls = 0;
  const addItem = async () => { calls += 1; return fixture().cart; };
  for (const [patch, product] of [
    [{}, { id: 4, stock: 0, is_active: true }],
    [{}, { id: 4, stock: 10, is_active: false }],
    [{ pendingProductIds: [4] }, undefined],
    [{ checkoutLocked: true }, undefined],
  ]) {
    await addButtonAction(fixture({ addItem, ...patch }), product)();
  }
  assert.equal(calls, 0);
  assert.equal(success.mock.callCount(), 0);
});

test("success messages use trimmed plain text and fall back for invalid product names", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  for (const name of [undefined, null, {}, 42, "", "   ", "  <b>Alimento</b>  "]) {
    await addButtonAction(fixture({ addItem: async () => fixture().cart }),
      { id: 4, stock: 10, is_active: true, name })();
  }
  assert.deepEqual(success.mock.calls.map(({ arguments: args }) => args), [
    ...Array.from({ length: 6 }, () => ["Producto agregado al carrito."]),
    ["<b>Alimento</b> se agregó al carrito."],
  ]);
});

test("access feedback is visible only at its origin, including the initial default key", () => {
  const context = fixture({ accessFeedback: {
    message: "Los administradores no pueden utilizar el carrito.", locationKey: "default",
  } });
  const feedback = React.createElement(CartFeedback);
  assert.match(render(context, feedback, "/productos"), /role="alert"/);
  assert.equal(render(context, feedback, { pathname: "/admin", key: "destination" }), "");
  assert.equal(render(context, feedback, { pathname: "/productos", key: "return-entry" }), "");
  assert.equal(render(context, feedback, "/carrito"), "");
  const operational = fixture({ error: "No se pudo actualizar el carrito.", isStale: true });
  for (const pathname of ["/productos", "/contacto"]) {
    const html = render(operational, feedback, { pathname, key: "new-entry" });
    assert.match(html, /No se pudo actualizar el carrito/);
    assert.match(html, /Actualizar carrito/);
  }
});

test("admin add goes through provider denial without a cart request or success Toast", async (t) => {
  const success = t.mock.method(toast, "success", () => {});
  const request = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected request"); });
  let context, click;
  function Probe() {
    context = useCartContext();
    const element = AddToCartButton({ product: { id: 4, name: "Alimento", stock: 10, is_active: true } });
    click = element.props.children[0].props.onClick;
    return element;
  }
  const auth = { isAuthenticated: true, isClient: false, currentUser: { id: 1, role: "admin" },
    isCurrentSession: () => true, runProtectedRequest: async () => { throw new Error("Unexpected protected request"); } };
  const host = mountProvider(() => React.createElement(MemoryRouter, { initialEntries: ["/productos"] },
    React.createElement(AuthContext.Provider, { value: auth },
      React.createElement(CartProvider, null, React.createElement(Probe)))));
  await host.run(click);
  const snapshot = context.getCartSnapshot();
  assert.deepEqual(snapshot.accessFeedback, {
    message: "Los administradores no pueden utilizar el carrito.", locationKey: "default",
  });
  assert.equal(snapshot.error, "");
  assert.equal(request.mock.callCount(), 0);
  assert.equal(success.mock.callCount(), 0);
  host.start(() => context.clearTransientFeedback(snapshot.accessFeedback));
  assert.equal(context.getCartSnapshot().accessFeedback, null);
  host.unmount();
});

test("guest header shows zero without fetching or exposing a previous client's cart", (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected cart request"); });
  for (const authLoading of [false, true]) {
    const html = render(fixture({ itemCount: 9, loading: true }), React.createElement(Header), "/productos",
      { isAuthenticated: false, isClient: false, isAdmin: false, currentUser: null, authLoading });
    const link = html.match(/<a[^>]*href="\/carrito"[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(link);
    assert.match(link, /aria-label="Carrito, 0 productos en el carrito"/);
    assert.match(link, /Carrito \(0\)/);
    assert.match(link, /aria-busy="false"/);
    assert.doesNotMatch(link, /9|<button|<input|tabindex="-1"/);
  }
  assert.equal(request.mock.callCount(), 0);
});

test("cart link announces quantity once with correct singular and plural and remains a keyboard link", () => {
  for (const itemCount of [0, 1, 2, 5]) {
    const html = render(fixture({ itemCount }), React.createElement(Header));
    const link = html.match(/<a[^>]*href="\/carrito"[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(link);
    assert.ok(link.includes(`aria-label="Carrito, ${itemCount} ${itemCount === 1 ? "producto" : "productos"} en el carrito"`));
    assert.ok(link.includes(`>Carrito (${itemCount})</a>`));
    assert.doesNotMatch(link, /<button|<input|tabindex="-1"/);
    assert.equal((link.match(/aria-label=/g) || []).length, 1);
  }
});

test("pending client authentication shows neutral zero and a known admin never sees the cart", () => {
  const cart = fixture({ itemCount: 9, loading: true });
  const pendingClient = render(cart, React.createElement(Header), "/",
    { isAuthenticated: true, isClient: true, isAdmin: false, authLoading: true });
  assert.match(pendingClient, /aria-label="Carrito, 0 productos en el carrito"/);
  assert.doesNotMatch(pendingClient, /\(9\)/);
  for (const authLoading of [false, true]) {
    const admin = render(cart, React.createElement(Header), "/admin",
      { isAuthenticated: true, isClient: false, isAdmin: true, authLoading });
    assert.doesNotMatch(admin, /href="\/carrito"|productos en el carrito|producto en el carrito/);
  }
});

test("guest add does not create a cart, call a protected API, or show a success Toast", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected protected request"); });
  const success = t.mock.method(toast, "success", () => {});
  let click, cart, location;
  function Probe() {
    cart = useCartContext();
    location = useLocation();
    const button = AddToCartButton({ product: { id: 4, name: "Alimento", stock: 10, is_active: true } });
    click = button.props.children[0].props.onClick;
    return button;
  }
  const host = mountProvider(() => React.createElement(MemoryRouter, { initialEntries: ["/productos/4"] },
    React.createElement(AuthContext.Provider, { value: { isAuthenticated: false, isClient: false, currentUser: null } },
      React.createElement(CartProvider, null, React.createElement(Probe)))));
  await host.run(click);
  assert.equal(location.pathname, "/login");
  assert.deepEqual(location.state, { from: "/productos/4", cartReason: "login-required" });
  assert.equal(request.mock.callCount(), 0);
  assert.equal(success.mock.callCount(), 0);
  assert.equal(cart.getCartSnapshot().cart, null);
  assert.equal(cart.getCartSnapshot().itemCount, 0);
  host.unmount();
});
