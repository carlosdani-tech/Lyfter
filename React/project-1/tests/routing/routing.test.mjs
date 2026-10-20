import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { createServer } from "vite";
import { parseRouteId, safeDestination } from "../../src/utils/routing.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => server.close());
const { RequireAuth, RequireRole } = await server.ssrLoadModule("/src/components/routing/RouteGuards.jsx");
const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.js");
const { default: ProductRoute } = await server.ssrLoadModule("/src/components/routing/ProductRoute.jsx");
const { default: App } = await server.ssrLoadModule("/src/App.jsx");
const { default: AuthProvider } = await server.ssrLoadModule("/src/context/AuthProvider.jsx");
const { default: useAuthContext } = await server.ssrLoadModule("/src/hooks/useAuthContext.js");
const { default: useAuth } = await server.ssrLoadModule("/src/hooks/useAuth.js");
const { default: useSession } = await server.ssrLoadModule("/src/hooks/useSession.js");
const { default: CartProvider } = await server.ssrLoadModule("/src/context/CartProvider.jsx");
const { default: CheckoutProvider } = await server.ssrLoadModule("/src/context/CheckoutProvider.jsx");
const { RenderBoundary } = await server.ssrLoadModule("/src/components/routing/RouteErrorBoundary.jsx");
const { default: Header } = await server.ssrLoadModule("/src/components/layout/Header.jsx");

function render(element, path = "/", session = {}) {
  const isAuthenticated = Boolean(session.currentUser && session.accessToken);
  const context = {
    ...session, isAuthenticated,
    isAdmin: isAuthenticated && session.currentUser.role === "admin",
    isClient: isAuthenticated && session.currentUser.role === "client",
  };
  return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
    React.createElement(AuthContext.Provider, { value: context },
      React.createElement(CartProvider, null, React.createElement(CheckoutProvider, null, element)))));
}

function protectedContent(role, session) {
  return render(React.createElement(Routes, null,
    React.createElement(Route, { element: React.createElement(RequireAuth) },
      React.createElement(Route, { element: React.createElement(RequireRole, { role }) },
        React.createElement(Route, { path: "/admin", element: React.createElement("p", null, "protected content") })))), "/admin", session);
}

test("route IDs require positive safe decimal integers", () => {
  for (const value of [undefined, "", "0", "01", "-1", "1.5", "1e3", "1x", " 1", "9007199254740992", "%31", "1\n", "2147483648"]) {
    assert.equal(parseRouteId(value), null);
  }
  assert.equal(parseRouteId("123"), 123);
  assert.equal(parseRouteId("2147483647"), 2147483647);
});

test("login destinations permit only internal application routes", () => {
  for (const value of [null, {}, "https://example.com", "//example.com", "/\\example.com", "/login", "/unknown", "/admin\n", "/admin/../login",
    "javascript:alert(1)", "/productos/1\n", "/productos/2147483648", "/compra/01", "/admin/editar/0", "/%2f%2fevil.example", "/admin%2f..%2flogin"]) {
    assert.equal(safeDestination(value), null);
  }
  for (const value of ["/", "/productos/1", "/admin/editar/12?source=list#form", "/carrito", "/checkout", "/compra/3"]) {
    assert.equal(safeDestination(value), value);
  }
});

test("pending authentication renders status without protected content or redirect", () => {
  const html = protectedContent("admin", { authLoading: true, currentUser: { role: "admin" }, accessToken: "test-only-credential" });
  assert.match(html, /Verificando sesión/); assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /protected content|Acceso restringido/);
});

test("guards do not render admin content without an admin session", () => {
  assert.doesNotMatch(protectedContent("admin", {}), /protected content/);
  assert.doesNotMatch(protectedContent("admin", { currentUser: { role: "admin" } }), /protected content/);
  const client = protectedContent("admin", { currentUser: { role: "client" }, accessToken: "test-token" });
  assert.match(client, /Acceso restringido/);
  assert.doesNotMatch(client, /protected content/);
  assert.match(protectedContent("admin", { currentUser: { role: "admin" }, accessToken: "test-token" }), /protected content/);
});

test("admin cannot render client-only content", () => {
  const result = protectedContent("client", { currentUser: { role: "admin" }, accessToken: "test-token" });
  assert.match(result, /Acceso restringido/);
  assert.doesNotMatch(result, /protected content/);
});

test("malformed detail IDs render Spanish status without mounting the resource", () => {
  const route = React.createElement(Routes, null, React.createElement(Route, {
    path: "/productos/:id", element: React.createElement(ProductRoute, null, () => React.createElement("p", null, "product content")),
  }));
  const result = render(route, "/productos/1x");
  assert.match(result, /identificador del producto no es válido/);
  assert.doesNotMatch(result, /product content/);
});

test("route tree handles direct public URLs and 404", () => {
  const session = { currentUser: null };
  for (const [path, text] of [["/", "Bienvenido"], ["/contacto", "Contacto"], ["/login", "Iniciar sesión"], ["/missing", "Página no encontrada"]]) {
    assert.match(render(React.createElement(App), path, session), new RegExp(text));
  }
});

test("unknown paths offer home and catalog to every role; product errors remain product-specific", () => {
  for (const session of [{}, { currentUser: { id: 2, role: "client" }, accessToken: "test-only-credential" },
    { currentUser: { id: 1, role: "admin" }, accessToken: "test-only-credential" }]) {
    const html = render(React.createElement(App), "/missing/nested", session);
    assert.match(html, /Página no encontrada/); assert.match(html, /href="\/"/); assert.match(html, /href="\/productos"/);
  }
  for (const id of ["bad", "0", "01", "1e3", "2147483648", "1%0A"]) {
    const html = render(React.createElement(App), `/productos/${id}`);
    assert.match(html, /identificador del producto no es válido/);
    assert.doesNotMatch(html, /Página no encontrada|Stock disponible/);
  }
});

test("direct admin edit checks role before loading even for invalid or missing products", () => {
  for (const path of ["/admin/editar/4", "/admin/editar/bad", "/admin/editar/2147483648"]) {
    const guest = render(React.createElement(App), path);
    assert.doesNotMatch(guest, /Editar producto|Cargando producto|Producto no encontrado/);
    const client = render(React.createElement(App), path, { currentUser: { id: 2, role: "client" }, accessToken: "test-only-credential" });
    assert.match(client, /Acceso restringido/); assert.doesNotMatch(client, /Editar producto|Cargando producto/);
  }
  const admin = { currentUser: { id: 1, role: "admin" }, accessToken: "test-only-credential" };
  assert.match(render(React.createElement(App), "/admin/editar/4", admin), /Cargando producto/);
  assert.match(render(React.createElement(App), "/admin/editar/bad", admin), /identificador del producto no es válido/);
});

test("detail, admin edit and client cart keep the correct header link active", () => {
  for (const [path, expected, role] of [["/productos/4", "/productos", "client"], ["/admin/editar/4", "/admin", "admin"], ["/carrito", "/carrito", "client"]]) {
    const html = render(React.createElement(Header), path, { currentUser: { id: 2, role }, accessToken: "test-only-credential" });
    assert.equal(html.includes(`aria-current="page" class="${expected === "/admin" ? "btn-administracion active" : "active"}" href="${expected}"`), true);
    assert.doesNotMatch(html, /aria-current="page" class="active" href="\/"/);
  }
});

test("memory history Back/Forward and fresh direct entry select the correct page and active link", async () => {
  const tree = React.createElement(AuthContext.Provider, { value: { isAuthenticated: false, currentUser: null } },
    React.createElement(CartProvider, null, React.createElement(CheckoutProvider, null, React.createElement(App))));
  const router = createMemoryRouter([{ path: "*", element: tree }], { initialEntries: ["/"] });
  try {
    const html = () => renderToString(React.createElement(RouterProvider, { router }));
    await router.navigate("/productos/4"); assert.match(html(), /Cargando producto/);
    await router.navigate("/missing"); assert.match(html(), /Página no encontrada/);
    await router.navigate(-1); assert.equal(router.state.location.pathname, "/productos/4"); assert.match(html(), /Cargando producto/);
    await router.navigate(-1); assert.match(html(), /Bienvenido/);
    await router.navigate(1); assert.match(html(), /Cargando producto/);
    assert.match(render(React.createElement(App), "/productos/4"), /Cargando producto/);
    assert.match(render(React.createElement(App), "/productos"), /Cargando productos/);
    assert.doesNotMatch(render(React.createElement(App), "/productos"), /No hay productos disponibles/);
  } finally { router.dispose(); }
});

test("render failure fallback does not retain or render exception contents and has safe recovery links", () => {
  const error = new Error("sensitive exception contents");
  const boundary = new RenderBoundary({ children: React.createElement("p", null, "normal content") });
  boundary.state = RenderBoundary.getDerivedStateFromError(error);
  const html = render(boundary.render());
  assert.match(html, /No se pudo mostrar esta página/);
  assert.match(html, /href="\/"/); assert.match(html, /href="\/productos"/);
  assert.doesNotMatch(html, /sensitive exception contents|normal content|Error:|stack/);
  assert.equal(Object.values(boundary.state).includes(error), false);
  assert.equal(RenderBoundary.getDerivedStateFromProps({ resetKey: "same-entry" }, { failed: false, resetKey: "same-entry" }), null);
  assert.deepEqual(RenderBoundary.getDerivedStateFromProps({ resetKey: "new-entry" }, { failed: true, resetKey: "old-entry" }), { failed: false, resetKey: "new-entry" });
});

test("purchase routes render only for clients and never flash success or admin checkout", () => {
  for (const path of ["/checkout", "/compra/10"]) {
    assert.doesNotMatch(render(React.createElement(App), path), /Información de compra|Consultando tu compra|¡Gracias por tu compra!/);
    const admin = render(React.createElement(App), path, { currentUser: { id: 1, role: "admin" }, accessToken: "test-only-credential" });
    assert.match(admin, /Acceso restringido/);
    assert.doesNotMatch(admin, /Información de compra|¡Gracias por tu compra!/);
  }
  const client = { currentUser: { id: 2, role: "client" }, accessToken: "test-only-credential" };
  assert.match(render(React.createElement(App), "/checkout", client), /Información de compra/);
  assert.match(render(React.createElement(App), "/compra/10", client), /Consultando tu compra/);
});

test("AuthProvider exposes the complete contract and both legacy hooks share it", () => {
  function Probe() {
    const auth = useAuthContext();
    assert.equal(auth, useAuth());
    assert.equal(auth, useSession());
    for (const field of ["currentUser", "accessToken", "isAuthenticated", "isAdmin", "isClient", "authLoading", "authError"]) {
      assert.equal(Object.hasOwn(auth, field), true);
    }
    for (const action of ["login", "logout", "invalidateSession", "clearAuthError", "runProtectedRequest", "isCurrentSession"]) {
      assert.equal(typeof auth[action], "function");
    }
    assert.equal(auth.isAuthenticated, false);
    return React.createElement("p", null, "context ready");
  }
  assert.match(renderToString(React.createElement(AuthProvider, null, React.createElement(Probe))), /context ready/);
});

test("useAuthContext fails clearly outside its provider", () => {
  function Probe() { useAuthContext(); return null; }
  assert.throws(() => renderToString(React.createElement(Probe)), /useAuthContext requires AuthProvider/);
});
