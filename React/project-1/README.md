# PawStore React Frontend

PawStore is a React and Vite frontend integrated with the Flask API in
`../Pets ECommerce`.

## Current integration scope

The frontend provides:

- A public Home page.
- A public product catalog and product detail view.
- Login with email and password.
- Session information and logout in the header.
- `admin` and `client` role handling.
- Admin-only product creation, editing, and deletion/deactivation.
- Toast feedback and confirmation for product mutations and logout.

React Router 7 provides URL navigation. A global client cart loads from Flask,
supports catalog/detail adds, and supplies the header quantity badge. The
guarded cart page provides responsive item/quantity/total controls. Checkout
submits an idempotent purchase; confirmation reloads owner-only sale snapshots. Frontend
registration and user-management UI remain outside this phase.

## Product data source

Products are loaded from the Flask API with `GET /products`. Detail and edit
routes independently load `GET /products/<id>`. Product creation,
editing, and deletion call the protected API endpoints rather than changing a
local-only product list.

The former `src/data/products.json` file is historical sample data and is no
longer an active runtime source. Catalog and detail content are derived from
products returned by the backend.

The frontend uses the backend field names:

- `id`
- `name`
- `description`
- `price`
- `stock`
- `image_url`
- `category`
- `is_active`

## API configuration

The default API base URL is:

```text
http://127.0.0.1:5000
```

Override it with the optional Vite environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

If this variable is omitted, the frontend uses the default URL above. Restart
the Vite development server after changing a Vite environment variable.

The API layer is centralized under `src/api/`:

- `apiClient.js`: base URL, JSON parsing, errors, and Bearer tokens.
- `authApi.js`: login requests.
- `productsApi.js`: public catalog reads and protected product mutations.
- `cartApi.js`: authenticated authoritative cart reads/add/update/remove.
- `salesApi.js`: allowlisted buyer/shipping checkout with `Idempotency-Key`.

CartProvider uses the cart module; CheckoutProvider owns the in-memory purchase
attempt and structured form. See [checkout UI](docs/checkout-ui.md) for the state
machine, safe retries, confirmation, layout, and validation limits. See the
[exact API boundary contracts](docs/cart-checkout-api.md) for request bodies,
response shapes, safe errors, and caller-owned idempotency-key reuse.
See [global cart state](docs/cart-state.md) for context methods, identity
transitions, serialized mutations, reconciliation, and validation limits.
See [cart UI](docs/cart-ui.md) for accessibility, product availability,
responsive layout, wireframe assumptions, and manual verification limits.

The project uses the browser `fetch` API and does not use Axios.

Provider-owned state lives under `src/context/`; hooks under `src/hooks/`
read that state or coordinate focused product workflows:

- `AuthProvider` / `AuthContext`: in-memory user, token, login errors, and
  session invalidation; guarded `useAuthContext` reads the shared session.
  `useAuth` and `useSession` remain compatibility aliases of the same hook.
- `CartProvider` / `CartContext`: one immutable backend cart and mutation queue
  per active client session, read through guarded `useCartContext`.
- `CheckoutProvider` / `CheckoutContext`: structured draft, request locking,
  one in-memory idempotency attempt, safe retry, and verified success navigation.
- `useProducts`: backend product collection, loading, and refresh.
- `useProductForm`: shared create/edit form state and validation.
- `useProductMutations`: protected create/edit/delete workflows, request locks,
  and mutation Toast feedback.

`App.jsx` composes the route tree and preserves catalog search/filter state.
`AdminRoute` owns create/edit form and mutation hooks. `ProductRoute` loads
product resources by URL ID, cancels obsolete requests, and handles loading,
unavailable products, and retryable errors in Spanish.

## Authentication and roles

`POST /auth/login` returns `data.user` and `data.access_token`. The frontend
keeps them only in a provider-owned, in-memory session store. `main.jsx` mounts
one `AuthProvider`; there is no session state or session prop drilling in
`App.jsx`. Header, Login, route guards, and admin mutation hooks consume
`useAuthContext` directly. The hook throws a clear developer error outside its
provider.

The context exposes `currentUser`, `accessToken`, `isAuthenticated`, `isAdmin`,
`isClient`, `authLoading`, `authError`, `login`, `logout`, `invalidateSession`,
and `clearAuthError`. Flags derive from the backend login response; credentials
and UI controls cannot select a role. Invalid/inactive session payloads are
rejected, and the copied safe user data is immutable.

`AuthProvider` owns one store created by `createAuthSession`, with immutable
snapshots subscribed through React's
[`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
Logout or invalidation synchronously replaces user/token/role/loading/error
state in one snapshot, invalidates pending work, and dismisses session-specific
toasts. A session version keys the protected route subtree, discarding admin
forms and mutation state when the session changes, even between two admins.

Login requests are abortable and versioned. Only the latest request can
publish results, errors, or loading changes; cancellation is backed by version
checks even if the transport ignores abort. Logout, invalidation, and provider
unmount invalidate pending login responses. `login` returns safe user data and
an `isCurrent()` check for redirect eligibility, never a token-bearing result.
Login checks that eligibility and component lifetime before navigating.

- Logged-out users can browse products. Selecting Administration sends them to
  Login with the intended internal destination in router location state.
- A logged-in `client` can browse products but cannot open administration or
  edit views.
- A logged-in `admin` can create, edit, and delete products.
- Product mutations send `Authorization: Bearer <admin_token>`.
- Logout clears the in-memory session after user confirmation.
- Logged-out protected access redirects to `/login` with replacement history.
  Login returns to the intended route, or defaults to `/admin` for admins and
  `/productos` for clients. Only known internal application paths can be
  restored; external URLs, protocol-relative URLs, and backslashes are rejected.
- Role guards render a Spanish forbidden state before mounting protected page
  components. Clients cannot mount admin pages; admins cannot mount client
  purchase pages. Backend JWT, role, and ownership checks remain authoritative.
- A protected mutation returning `401` (expired/missing authentication) or
  Flask JWT's `422` (malformed token) invalidates the matching session with a
  fixed Spanish expiry message. Application payload validation uses `400`.
  The auth guard redirects to login while retaining the route destination.
  A `403` preserves the session and displays the existing permission error.
- Confirmed logout from a protected route navigates to `/productos`; public
  pages stay in place. Logout dismisses pending product deactivation
  confirmation. Browser Back still applies the auth guard.

Session persistence across a page reload is not required in this phase. A
protected URL refresh requires login again, then resumes the original route.
There is no localStorage/sessionStorage persistence, `/auth/me` restoration,
token decoding for roles, refresh-token flow, or proactive expiry timer. The
backend remains authoritative and detects token expiry on protected requests.

### Protected requests and checkout consumers

The context additionally exposes `runProtectedRequest(operation)`,
`isCurrentSession()`, and a non-secret `sessionVersion`. Admin mutation hooks
use the request helper to obtain the token only at request time. It binds work
to the session that rendered the handler and refuses stale handlers before
issuing a request. Late successes/errors are discarded; an old `401` cannot
invalidate a newer session. Consumers check `isCurrentSession()` after an
`await` before navigating, changing protected state, or showing success/error
feedback, covering logout between promise resolution and its UI continuation.

Checkout and other protected API consumers use the same auth context and
request helper, ignore `SessionChangedError`, and clear protected data owned
outside the guarded route subtree when the session changes. CartProvider uses
auth's `registerSessionCleanup` subscription to clear synchronously on logout,
expiry, and login/user changes. Checkout registers equivalent draft/attempt
cleanup. Already
submitted backend mutations cannot be undone by frontend logout.

Tokens stay in memory and authorization headers. They are never rendered,
logged, or placed in errors, URL/query parameters, or router location state.
Authentication errors shown to users are fixed Spanish messages; raw provider
errors are not displayed.

## Product administration

The UI labels the destructive action as **Eliminar**, while the backend keeps
soft-delete semantics: `DELETE /products/<product_id>` sets `is_active` to
`false`. Inactive products no longer appear in the public catalog and their
public detail endpoint returns `404`.

After a successful create, update, or delete request, the frontend reloads the
product list from the backend. Toast notifications report loading, success,
validation, and request errors without optimistic product changes.

## Navigation

A single `BrowserRouter` wraps the app in `main.jsx`. `Routes` / `Route` own
URL matching; `NavLink` / `Link` and `useNavigate` navigate without reloading
the document. The implementation follows the official
[declarative routing APIs](https://reactrouter.com/start/declarative/routing).
There is no competing view state or selected-product navigation state.
See [navigation audit](docs/navigation-audit.md) for hardened IDs, render error
recovery, search evidence, the role/state matrix, and verification limits.

| Route | Access | Behavior |
| --- | --- | --- |
| `/` | Public | Home |
| `/productos` | Public | Catalog, search, availability filter |
| `/productos/:id` | Public | Fetch detail by ID, including direct entry/refresh |
| `/contacto` | Public | Existing contact page |
| `/login` | Public | Login and safe intended-destination return |
| `/admin` | Admin | Product creation, list, edit/deactivation actions |
| `/admin/editar/:id` | Admin | Fetch product by ID and initialize edit form |
| `/carrito` | Client | Accessible responsive cart with authoritative quantities/totals |
| `/checkout` | Client | Structured buyer form, server summary, idempotent purchase |
| `/compra/:saleId` | Client owner | Authorized sale/invoice snapshot and truthful email status |
| `*` | Public | Spanish `NotFoundPage` |

Product and sale IDs must be canonical decimal integers from 1 to 2147483647. Malformed IDs
render Spanish status messages. Unknown or inactive products render an
unavailable message; transient detail failures offer retry. Route changes
cancel obsolete detail requests and cannot display a previous product.

Confirmation fetches the protected owner-only backend endpoint before displaying
purchase data. Missing or inaccessible data never produces a success claim.

### Production history fallback

Serve `dist/` with SPA history fallback: application URLs such as
`/productos/42` and `/admin/editar/42` must internally serve `index.html`
while preserving the requested browser URL. For example, when hosted at the
domain root, an Nginx application location can use:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Keep static assets and backend/API locations outside that fallback so missing
assets and API errors retain their normal responses. Vite development already
provides history fallback; production hosting must configure it independently.
The SPA's catch-all displays its own 404 page after the host serves the shell.

## Run locally

Developer-run commands below were not used to start live services during this
documentation update. First configure the backend privately and review the
[migration and seed gates](../Pets%20ECommerce/docs/database.md). Existing
schema readiness must be established before normal application use.

Start the Flask backend from `../Pets ECommerce`:

```powershell
.venv\Scripts\python -m flask --app run.py run --debug --port 5000
```

The backend uses PostgreSQL, reviewed Alembic migrations, and the required
security/seed variables in its README. App creation attempts seeding and can
write data; do not use startup as a read-only database diagnostic.

Then start the frontend from `project-1`:

```powershell
npm.cmd run dev
```

Use existing dependencies. If missing, obtain installation approval first;
this run sequence does not install or update packages.

Vite normally serves the application at `http://localhost:5173`. The backend
also permits `http://127.0.0.1:5173` through CORS.

## Available scripts

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run preview
```

Run `npm.cmd test` from `project-1`. The script explicitly lists all seven test
files under `tests/api/`, `tests/auth/`, `tests/cart/`, `tests/checkout/`, and
`tests/routing/`, without relying on shell wildcard expansion. Vite SSR module
paths remain rooted at the frontend project directory.

Provider order is `BrowserRouter > AuthProvider > CartProvider >
CheckoutProvider > App`, inside Strict Mode. Domain components live under
`src/components/{admin,auth,cart,checkout,layout,pages,products,routing}/`.
No invoices API module or frontend email-retry control is currently implemented;
invoice data is included in the sale confirmation response.

Auth, cart, and checkout attempt memory are lost on reload/logout. A known
confirmation URL reloads through owner-only GET after login; it never performs
checkout or sends email. An uncertain attempt with a lost key requires operator
reconciliation, not a fresh purchase. There is no cross-tab coordination.

Completed confirmations display `¡Gracias por tu compra!`. Only `sent` displays
`Hemos enviado un correo de confirmación con los detalles de tu pedido.`;
pending, failed, and unknown states retain purchase success with truthful
alternative delivery text. Cancelled/returned purchases retain distinct titles.
`Volver al catálogo` links to `/productos`; the secondary home action remains.

Authored CSS lengths use rem with an unmodified browser root font size;
the standard reference is 16 CSS pixels per rem. Breakpoints are 56.25rem and
35rem. User font preferences can change scaling and responsive transitions.

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

The auth and routing tests use Node's built-in test runner and installed Vite/React
packages; no test dependency was added. They cover defensive IDs, safe redirect
destinations, guard rendering for each role, malformed resource routes, safe
unverified confirmation states, and direct public route matching. Server-rendered
tests do not execute browser navigation, effects, real login, or HTTP resource
loads. Auth tests use deferred/mock responses to exercise logged-out, client,
admin, failed-login, invalid/expired-token, logout, overlapping login, and late
protected-response cases. They also verify atomic snapshots, stale redirect
eligibility, and logout between request resolution and the UI continuation.
Provider contract and missing-provider checks cover the guarded hook and its
compatibility aliases.
Cart tests additionally cover serialized quantity changes, duplicate adds,
stock rejection, ambiguous write reconciliation, identity isolation, exact
money display, and cart preservation when checkout fails.

### Manual browser matrix

Run with the backend available and existing client/admin accounts. The browser
matrix remains unverified in this implementation session because browser
automation reported no connected browser surfaces.

| Scenario | Expected result |
| --- | --- |
| Direct entry and refresh on `/`, `/productos`, `/contacto`, `/login` | Correct page, no host 404 |
| Catalog search/filter, detail link, Back/Forward | URL and content agree; filters persist during navigation |
| Direct/refresh `/productos/<active-id>` | Product fetched from API without prior selection |
| Detail with unknown/inactive ID | Spanish unavailable state |
| Detail/edit with `bad`, `0`, `-1`, `1x`, or unsafe integer ID | Spanish invalid-ID state; no crash |
| Detail network failure, then retry | Spanish error; retry loads product when API recovers |
| Logged-out `/admin` or `/admin/editar/<id>` | Login before any admin content; successful admin login resumes exact URL |
| Logged-out `/carrito`, `/checkout`, `/compra/1` | Login preserving intended URL |
| Client entry/Back/Forward to either admin route | Spanish forbidden state; no admin content |
| Admin entry to client purchase routes | Spanish forbidden state |
| Client on cart route | Items, controls, thumbnails, exact CRC prices/totals; empty/invalid carts cannot follow the checkout link |
| Client on checkout/confirmation routes | Structured buyer form and server summary; verified owner-only confirmation with truthful email status |
| Logged-out catalog/detail add | Login with fixed Spanish explanation and safe return destination; no anonymous cart |
| Admin catalog/detail add | Spanish denial; no cart request |
| Client catalog/detail add | Flask cart updates and header badge counts quantities |
| Unknown route or malformed sale ID | Spanish not-found/invalid-ID state |
| Admin create/edit/deactivate | Existing API calls and toasts; list refreshes; save returns to `/admin` |
| Protected mutation returns `401` | Session cleared; login shown; original URL retained |
| Confirm logout from protected route, then Back | Catalog after logout; protected content remains blocked |
| Refresh protected edit URL, then admin login | Fresh product load and initialized edit form |
| External or protocol-relative intended destination | Ignored; role-appropriate default destination |

During implementation, direct HTTP requests for all listed route patterns,
including nested and unknown paths, returned the Vite HTML shell with status
200. This checks development history fallback, not browser behavior or
production configuration.
