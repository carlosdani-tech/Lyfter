# Navigation and invalid-state audit

## Scope and findings

The existing Router/AuthContext/CartContext/CheckoutContext work and unrelated
dirty files were preserved. This change installs nothing, changes no backend
contract, and performs no migration, environment edit, deletion, or commit.

- Product route IDs previously allowed values beyond PostgreSQL INTEGER and a
  trailing newline. `parseRouteId` now accepts only canonical decimal strings
  from 1 through 2147483647. Confirmation and intended destinations reuse it.
- Product read/update/delete APIs validate IDs before constructing paths.
  Public product/list success responses are checked against the current Flask
  serializer, including expected identity. Missing or malformed successful data
  is an API error, never silently a nonexistent product or an empty catalog.
- The product resource distinguishes actual 404/inactive data from network,
  server and invalid-response failures. The former stays a product-specific
  unavailable state; the latter displays retry. Aborted/obsolete responses
  cannot update the route, even when the transport ignores cancellation.
- The catch-all already existed but offered only catalog recovery. Shared
  status pages now offer `/productos` and `/` through Router links.
- A route render boundary now offers a fixed Spanish recovery message and
  retains no exception object or raw diagnostic in its state. It resets for
  each history entry without forcing healthy page/form remounts. Expected HTTP errors remain handled by their pages.
  Shared Header/Footer stay outside this route-content boundary.
- Guards now show an announced authentication-loading state before deciding
  whether to redirect. Existing session-version remounting, protected-request
  401/422 invalidation, backend role/ownership checks, and logout cleanup remain.
- Catalog initial rendering now shows loading rather than a false empty state.
  Product retry enters loading immediately, and API failure text is announced.
- Home/contact/catalog/detail/admin edit/cancel navigation now uses Router
  links instead of legacy callback props. Disabled admin actions retain real
  disabled buttons during writes. Link styles preserve the previous controls.
  Footer fragment links use Router navigation while retaining their existing
  placeholder destinations; no social integration was added.
- Product validation UI previously echoed arbitrary backend field names.
  Only known field labels and fixed Spanish messages are now displayed; detail
  inspection is bounded. No response message, exception, token or buyer data
  is inserted into error UI.

Checkout and confirmation use their dedicated route components. No obsolete navigation callbacks remain in
the runtime source. The cart's similarly named product availability helper was
renamed to distinguish its business read from former navigation callbacks.

## Search evidence

Run from the workspace root:

```powershell
rg -n '<a\b|\bview\b|setView|showProductDetail|openEditProduct|loadAdmin|loadProducts|window\.location|location\.(href|assign|replace)|history\.(pushState|replaceState)' project-1/src
rg -n 'navigate\(|<Navigate|safeDestination|BrowserRouter|<Routes' project-1/src
rg -n 'error\.(message|stack|details)|console\.|dangerouslySetInnerHTML|JSON.stringify' project-1/src/components project-1/src/hooks
```

The first and third searches have no matches (normal `rg` exit 1). The second
shows one BrowserRouter and one Routes tree. Remaining programmatic navigation
is live behavior: protected login redirect, validated post-login destination,
logout, successful admin save, and verified checkout completion. Dynamic login
destinations pass the known-internal-route allowlist; external URLs, schemes,
backslashes, whitespace/control characters, traversal, and invalid IDs fail.
Validation helper inspection occurs in `src/utils`, maps only to fixed UI
messages, and never renders arbitrary detail text.

## Route and state matrix

| Entry/state | Guest | Client | Admin | Evidence |
| --- | --- | --- | --- | --- |
| `/`, `/contacto`, `/login` | Public | Public | Public | Direct route SSR |
| `/productos` | Public loading/list/empty/error | Same | Same | Initial loading SSR; list boundary tests; existing cart/catalog checks |
| `/productos/:id`, active | Fetch URL ID | Same | Same | Real API helper with intercepted fetch; fresh direct-entry SSR |
| Product malformed/overflow ID | Specific invalid-product state; no request | Same | Same | SSR and API no-request tests |
| Product missing/inactive | Specific unavailable state | Same | Same | Resource 404/inactive response tests |
| Product network/5xx/invalid success | Retryable API error | Same | Same | Resource response tests; not mapped to 404 |
| `/admin`, `/admin/editar/:id` | Login; no admin content | Denied before resource | Load, then validate resource before edit | Guard/direct edit SSR; shared product resource tests |
| `/carrito`, `/checkout` | Safe intended login destination | Authoritative cart/form, disabled empty/invalid checkout | Denied | Guard SSR; cart/checkout suites |
| `/compra/:saleId` | Safe intended login destination | Validate ID, then owner lookup; no premature success | Denied | Guard/confirmation/API suites |
| Unknown nested path | Spanish 404 with both links | Same | Same | Full App SSR for all roles |
| Auth loading | Announced loading, no protected content | Same | Same | Guard SSR |
| Protected 401/422, logout, user switch | Login/session cleared | Old data/responses discarded | Protected views leave | Auth/cart/checkout deferred-response tests |
| Back/Forward | URL-selected page, active Header | Same guarded tree | Same guarded tree | Automated memory history, SSR; real browser remains pending |

Header active state is verified for product detail, admin editing, and cart.
Checkout retains its cart-to-checkout breadcrumb; no admin checkout link was
introduced. A fresh product/confirmation URL does not require prior selection
or purchase navigation state. With memory-only authentication, refresh of a
protected URL requires login again, then restores the safe intended path.

## Serving evidence and limits

An ephemeral Vite development server returned `200` and the correct SPA shell
for 12 fresh requests: `/`, `/productos`, `/productos/4`, `/productos/bad`,
`/contacto`, `/login`, `/admin`, `/admin/editar/4`, `/carrito`, `/checkout`,
`/compra/10`, and `/missing/nested`. No live purchase or backend mutation was
made. This proves development history fallback, not page hydration or live
authorization.

Frontend validation uses `npm.cmd run lint`, `npm.cmd run build`, and:

```powershell
npm.cmd test
```

The new tests cover product API/resource failures, cancellation, invalid IDs,
redirection allowlists, loading guards, unknown routes, Header activity,
memory history and safe render-boundary fallback. SSR cannot catch a child
render exception through React's client boundary machinery; that boundary's
fallback is inspected independently. Actual client catch/reset remains a
manual browser check.

Final command results: lint passed; production build passed; all 95 frontend
tests passed; `git diff --check -- project-1` passed. Search exclusions above
had zero matches. Existing package/lockfile changes were not edited by this
audit. Backend tests were not rerun for this frontend-only change.

Browser inventory returned `apps: [], browsers: []`. Actual refresh hydration,
mouse/keyboard navigation, browser Back/Forward, route-error recovery,
responsive appearance, real session expiry, and live backend cases remain
unverified. No manual pass is claimed for those scenarios.

Production must serve `dist` at the configured root, use the correct build-time
API base URL, and rewrite application history paths to `index.html` while
preserving API and missing-static-asset HTTP errors. The existing README has
an Nginx fallback example; no production serving configuration is present or
deployed here. A static host normally returns HTTP 200 for the SPA shell even
when the client catch-all renders a 404. Unknown checkout outcomes still have
the documented memory-only key limitation in [checkout-ui.md](checkout-ui.md).
