# Global cart state

`CartProvider` owns the sole cart reducer state. Provider order in `main.jsx` is
`BrowserRouter` → `AuthProvider` → `CartProvider` → `CheckoutProvider` → `App`. Cart depends on auth
and API modules; auth never imports cart. Components use the guarded
`useCartContext` hook, which throws outside its provider. There is no anonymous
cart, browser-storage persistence, duplicate page cart, or optimistic stock.

## Context contract

| Field/action | Meaning |
| --- | --- |
| `cart` | Immutable copy of the last confirmed active Flask cart, or null |
| `items` | Immutable server items; empty while no cart is loaded |
| `itemCount` | Sum of all server item quantities, not the number of rows |
| `totals` | `{subtotal, total}` as unchanged server decimal strings |
| `displayTotals` | `{subtotal, total}` formatted in CRC without floating-point conversion |
| `loading` | One or more queued/in-flight operations exist |
| `error` | Fixed Spanish feedback; no raw server text, token, or personal data |
| `status` | `idle`, `loading`, `updating`, `reconciling`, `ready`, or `error` |
| `isStale` | Last known data could not be verified; writes require a successful read |
| `pendingItemIds` / `pendingProductIds` | Queued/in-flight row/add targets; unrelated controls stay usable |
| `productsById` / `productError` | Public availability/image metadata or Spanish verification error |
| `notice` | Spanish cart-update/removed-item announcement |
| `canCheckout` | Loaded, nonempty, non-stale, idle cart with verified active products and sufficient known stock |
| `checkoutLocked` / `beginCheckout()` | Fence reads/writes during submission; release without changing confirmed cart data |
| `getCartSnapshot()` | Stable committed-state read used by CheckoutProvider |
| `refreshCart()` | Deduplicated, queued server read |
| `addItem(productId, quantity = 1)` | Add quantity through Flask; matching adjacent pending adds share one request |
| `incrementItem(itemId)` | Add one to the most recently confirmed quantity at execution time |
| `decrementItem(itemId)` | Subtract one, or DELETE when the confirmed quantity is one |
| `setItemQuantity(itemId, quantity)` | Set a positive integer quantity; zero is rejected |
| `removeItem(itemId)` | DELETE the item if still present |
| `clearCartState()` | Clear only frontend state and invalidate queued/late work; no backend deletion |

Async actions resolve to the confirmed cart or null on failure/denial/stale
session. Feedback is exposed through `error`; ordinary action failures do not
produce unhandled rejected promises. `clearCartState` is synchronous. Missing
items and quantity assignments already equal to the confirmed value are
no-ops. IDs/quantities use the API boundary's positive-integer validation.

Backend totals remain authoritative. The provider never derives a total by
multiplying browser prices. Cart/item responses are copied once without mutating API
response objects. Reducer state uses ordinary immutable replacements, not runtime freezing. Only item quantities are summed for the header badge.
Exact display formatting uses `BigInt` for the integer part of a decimal
string and preserves its two fractional digits.

## Transitions and identity isolation

| Event | Transition |
| --- | --- |
| Logged out or admin | Empty/inactive store; no cart request |
| Successful client login | New empty store → queued GET → confirmed cart or Spanish loading error |
| Mutation | Preserve confirmed snapshot → queued write → replace with entire server cart |
| Stock/business rejection | Preserve snapshot → GET reconciliation → confirmed server state plus Spanish explanation |
| Ambiguous network/server/malformed-response failure | GET reconciliation; never replay the mutation |
| Reconciliation also fails | Retain last confirmed cart, mark stale, cancel previously queued writes |
| Later refresh/action | Successful fresh read is required before any new write |
| Logout, token invalidation, or login/user switch | Synchronous cleanup → empty store; old responses ignored |
| Checkout failure | No cart-state transition or clearing |
| Explicit clear | Null cart, zero quantity count/totals, idle status; backend unchanged |

Auth exposes `registerSessionCleanup` for dependent providers. Cart registers
its reset callback, so logout, invalidation, and starting another login clear
cart data synchronously. Cleanup failures cannot prevent auth invalidation.
The subscription is removed on cart-provider cleanup.

`CartProvider` uses `useReducer`; `cartSession.js` contains only pure normalization,
reducer and selector helpers. It has no factory, mutable domain store, subscriptions,
or snapshot publication. Counts, items, totals, loading and pending IDs are derived
from the server cart and pending-job descriptors. A guarded session-key transition
resets only provider state before rendering a new owner, retaining child local UI
such as catalog filters. An initial-load microtask is canceled during StrictMode's
simulated cleanup, avoiding duplicate initial GETs.

Every queued request has an identity and AbortController. Auth's session-bound
`runProtectedRequest`/`isCurrentSession` remain authoritative for expiry and old
handlers. Invalidation/unmount aborts transports and removes their identities;
a transport ignoring abort still cannot update state or return another owner's
cart. Old saved refresh/reset/read actions cannot read or clear a newer session.
No token is copied into provider state. There is no refresh-token flow.

Three refs have narrow purposes: the latest committed context view for the stable
checkout reader; the last normalized server cart for queued relative mutations
before React commits; and imperative queue/request/lock handles. They do not
publish UI state. The reducer is the rendering source of truth. A session change
invalidates old work and starts a new queue. A same-session clear preserves the
transport tail so an already submitted write cannot overlap a new operation.
Cancellation cannot undo a purchase or mutation already committed by Flask.

## Queue and reconciliation

All cart operations share one FIFO queue, including reads. Per-item-only
serialization would still allow whole-cart response B to overwrite changes
from response A. Relative changes calculate their target when they execute,
using the preceding authoritative response, so rapid increments do not all
write the same stale quantity.

Concurrent refreshes share one promise. Adjacent duplicate adds, removals,
and identical absolute assignments share a pending promise; relative +/-
commands retain each distinct requested step. A repeated decrement after
removal does not send zero or another DELETE. Product add buttons disable
only for their affected product; cart rows disable only affected controls
unless global cart state is stale.

After a mutation fails, a read happens inside the same queued task, before
later mutations. A committed-but-lost add is therefore discovered without
adding twice. If that read fails, previously queued request identities are discarded,
the known cart is retained and visibly marked stale, and a successful read
must precede any later write. Explicit clear keeps the existing transport
tail so new requests do not overlap an old in-flight write in the same session.

## UI integration

Catalog/detail use one reusable `AddToCartButton`. Logged-out attempts route
to `/login` with a validated internal `from` path and a non-sensitive
`cartReason: "login-required"` code. Login renders a fixed Spanish explanation;
it does not render arbitrary state text or automatically replay an add after
login. Clients load their real cart after login and can retry the add.

Admins get a clear Spanish denial through global `CartFeedback`, without any
cart API call. The shared Header exposes `/carrito` on every application route
for guests and clients, including login and 404 pages. Guests always see `0`;
clients see `itemCount`, the sum of authoritative quantities. Admins see neither
the link nor the indicator. Pending authentication uses a neutral zero and a
known admin remains hidden. Logout/expiry clears protected cart state immediately;
the guest link remains with zero, without a protected API request or guest cart.
The link's accessible name announces the count once with singular/plural Spanish.
Guest cart navigation uses the existing auth guard and safe `/carrito` return
path through login; `/carrito` and `/checkout` remain client-only.
Stock-zero/inactive products cannot be added through the button;
Flask still checks current stock/roles/ownership on every write. Global Spanish
feedback offers refresh when cart state could not be verified.

CartPage uses these context methods and context-owned public metadata for
thumbnails/availability. CheckoutProvider performs the idempotent purchase and
clears/refreshes cart state only after a verified completed result. Rejection or
uncertainty preserves the cart; cancelled/returned replays do not clear another
active cart. See [checkout UI](checkout-ui.md) and [cart UI](cart-ui.md) for
implemented flows, accessibility, and verification limits.

## Validation and limits

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Cart tests mount the actual React provider with controlled API responses. They
cover quantities, duplicate suppression, distinct-item serialization,
decrement/removal, response-copy isolation, exact decimal display, stock conflict,
committed-but-lost writes, failed recovery, logout/user switch/expiry, owner
mismatch, and preservation after checkout failure. Server-rendered checks
cover provider contract, guarded hook, login explanation, and admin header.

A dependency-free provider-only host exercises real React batching, effects,
StrictMode, navigation callbacks, session transitions and unmount cleanup. It
does not render application DOM or substitute for browser layout/accessibility
checks. Real Flask/PostgreSQL transport is not exercised by these frontend tests. Live multi-tab/device updates require a
refresh; there is no cross-tab lock, polling, or cart cache. Backend ownership,
stock checks, and transaction locks remain authoritative. No dependency,
migration, live purchase, `.env` change, deletion, or commit is part of this work.

See [the state architecture audit](state-architecture.md) for the mechanism-by-mechanism decisions.
