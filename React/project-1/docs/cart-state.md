# Global cart state

`CartProvider` owns the sole cart store. Provider order in `main.jsx` is
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
| `getCartSnapshot()` | Stable store read used by CheckoutProvider |
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
multiplying browser prices. Cart/item copies are frozen without mutating API
response objects. Only item quantities are summed for the header badge.
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

The cart store is memoized by client role, backend user ID, and auth's stable
session-bound request/eligibility functions. A new session gets a new empty
snapshot during render, before any effects or requests. Public pages remain
mounted, preserving catalog filters. Changing auth errors or navigation does
not recreate the cart store. An initial-load microtask is canceled during
StrictMode's simulated cleanup, avoiding duplicate initial GETs.

Every task carries a store revision and the auth session version. Queue
execution and response acceptance both verify them. Cart reads and writes use
`runProtectedRequest`, retaining current-session JWT invalidation and ignoring
old-session errors. `401`/JWT `422` cannot invalidate a newer login. A response
whose `user_id` differs from the current backend session is never accepted.
Data is not shared between client scopes or shown while another user loads.

Requests already submitted are ignored after invalidation, rather than
transport-aborted; frontend cleanup cannot undo a backend mutation that has
already committed. No stale response can repopulate the retired store.

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
adding twice. If that read fails, previously queued writes are fenced off,
the known cart is retained and visibly marked stale, and a successful read
must precede any later write. Explicit clear keeps the existing transport
tail so new requests do not overlap an old in-flight write in the same store.

## UI integration

Catalog/detail use one reusable `AddToCartButton`. Logged-out attempts route
to `/login` with a validated internal `from` path and a non-sensitive
`cartReason: "login-required"` code. Login renders a fixed Spanish explanation;
it does not render arbitrary state text or automatically replay an add after
login. Clients load their real cart after login and can retry the add.

Admins get a clear Spanish denial through global `CartFeedback`, without any
cart API call. Header shows the quantity badge and `/carrito` link only for
clients. Stock-zero/inactive products cannot be added through the button;
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

Cart tests use real session/store logic with controlled API responses. They
cover quantities, duplicate suppression, distinct-item serialization,
decrement/removal, immutable snapshots, exact decimal display, stock conflict,
committed-but-lost writes, failed recovery, logout/user switch/expiry, owner
mismatch, and preservation after checkout failure. Server-rendered checks
cover provider contract, guarded hook, login explanation, and admin header.

Browser event navigation, effect timing, and real Flask/PostgreSQL transport
were not executed by these tests. Live multi-tab/device updates require a
refresh; there is no cross-tab lock, polling, or cart cache. Backend ownership,
stock checks, and transaction locks remain authoritative. No dependency,
migration, live purchase, `.env` change, deletion, or commit is part of this work.
