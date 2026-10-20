# Checkout and owner confirmation

## Ownership and routes

`AuthProvider > CartProvider > CheckoutProvider > App` shares one session and
one authoritative cart. CheckoutProvider owns only an in-memory form and
purchase attempt; it owns no token, role, cart copy, or frontend total.
`/checkout` and `/compra/:saleId` use the existing authenticated-client guards.
Logged-out access preserves a safe internal login destination. Admins are
denied before either purchase page mounts. Flask authorization remains final.

`/compra/:saleId` always performs an authorized lookup, including after checkout.
No purchase data is trusted from navigation state. Positive PostgreSQL integer
IDs are checked before requests. Missing, inaccessible, malformed, or failed
lookups have Spanish fallback states without an unverified success claim.
Requests are aborted on unmount and ignored after session/route changes.

## Request contracts

- `checkoutPurchase`: `POST /sales/checkout`, Bearer Authorization and exactly
  `Idempotency-Key`. Body contains `full_name`, `buyer_email`, and
  `shipping_address` with `line1`, nullable `line2`, `city`, `province`,
  `postal_code`, and uppercase two-letter `country`. No prices, totals, owner,
  role, phone, or payment fields. Existing API code unwraps `{data:{sale,invoice}}`.
- `getPurchaseConfirmation(saleId, token, {signal}?)`:
  `GET /sales/:saleId/confirmation`, Bearer Authorization, no body. The owner-only
  `{data:{sale,invoice}}` response is validated and reduced to immutable display
  fields. Buyer snapshots are excluded. Missing/other-owner is `404`, admin is
  `403`, missing/invalid JWT is `401`/`422`; shared protected requests invalidate
  expired sessions. Malformed successful data becomes safe `502`.
- Currency is CRC through the existing exact-decimal formatter. Item names,
  quantities, prices, subtotals, and totals come from cart or sale snapshots.
  Display formatting never computes a checkout amount.

## Attempt state machine

`editing -> submitting -> succeeded` (completed purchase) or `resolved`
(an existing cancelled/returned purchase). A synchronous request lock handles
Enter/click races, sharing the in-flight promise. CartContext additionally
locks cart reads/writes during the request and refuses checkout while queued
cart operations are pending. Cancel navigates to the cart without clearing it.

A cryptographic UUID is created on the first valid submission. A definitive
`400`/`403`/`404` produces `rejected`, retains inputs/cart/key, and permits safe
correction. Stock/availability failures require a newer authoritative cart
read before resubmitting. `409` produces `conflict`; network, server, malformed
success, or otherwise uncertain outcomes produce `uncertain`. These retain
the same key and normalized buyer payload, freeze fields, and permit explicit
same-attempt replay without an automatic POST retry. Replays work after an
ambiguous success closes the original cart, even if the new cart is empty.
A different populated cart blocks replay to avoid purchasing unrelated items.

Only a validated backend purchase with matching owner and original cart can
complete the attempt. Completed purchases clear/refresh CartContext and make
a best-effort public product refresh; catalog/detail also fetch on entry.
Navigation replaces the checkout entry with `/compra/:saleId`. Cancelled or
returned replays navigate to their truthful confirmation without clearing the
active cart. Email `failed`/`pending` never changes purchase success.
Post-success cleanup failure cannot rerun checkout. A new key is generated
only for a new populated cart after the earlier purchase resolves.

Logout/session expiry synchronously drops the draft, key, and payload, and
late responses cannot restore state, clear another user's cart, or navigate.
No buyer data or attempt key is stored in browser storage, URLs, or logs.

## Safe feedback

- Required/structured validation: Spanish general and known-field errors;
  arbitrary backend text is not rendered.
- Stock/empty/inactive item: review-cart message; cart remains intact.
- Permission: Spanish denial; backend guards are unchanged.
- Conflict: explain that the same attempt is retained; never generate a new key.
- Network/server/invalid success: outcome is uncertain; offer the same attempt.
- Confirmation email: delivery claimed only for `sent`; `pending`, `failed`,
  or unknown delivery gets accurate separate wording.

Completed title: `¡Gracias por tu compra!`. Delivery messages are exactly:

| Email state | UI text |
| --- | --- |
| `sent` | `Hemos enviado un correo de confirmación con los detalles de tu pedido.` |
| `pending` | `Tu compra fue registrada. El envío del correo de confirmación está pendiente.` |
| `failed` | `Tu compra fue registrada, pero no pudimos enviar el correo de confirmación.` |
| Unknown/missing | `Tu compra fue registrada. No pudimos confirmar el estado del correo.` |

Cancelled/returned sales retain their non-success titles/messages. The primary
`Volver al catálogo` link goes to `/productos`; `Ir al inicio` remains secondary.

## Layout, accessibility, and deviations

The shared Header/Footer are retained. No new checkout link is added to admin
navigation; a cart-to-checkout breadcrumb establishes progression. Desktop has
two balanced cards; at 56.25rem they stack form first, and at 35rem the address
grid becomes one column. Summary names wrap. Confirmation uses a centered
success panel and a separate semantic table in a focusable contained scroll
region, preventing the table from widening the page. Fields have labels,
autocomplete, limits, required/type validation and associated errors. Progress
is announced and form-level errors use `role=alert`; focus outlines and 2.75rem
controls are provided.

The actual wireframe files were unavailable. The written hierarchy was used;
pixel comparison could not be performed. Intentional deviations: structured
address instead of one address input, no phone/payment fields, CRC instead of
sample euros, conditional email delivery text, and contained table scrolling
on mobile for meaningful column associations.

## Validation and remaining manual scenarios

Run `npm.cmd run lint`, `npm.cmd run build`, and
`npm.cmd test`.
Automated tests cover controlled requests, state races, API shapes, guards,
SSR markup, truthful email wording, safe retries, and escaped long names.
They do not constitute live Flask/SMTP or rendered-browser testing.

No browser surface was available (`apps: [], browsers: []`). Pending manual
checks: desktop wireframe comparison; 1440/900/375px layout; long address/name
values; focus and keyboard submission; direct URL/refresh/back/forward;
client/admin/expired JWT; empty cart; stock changes; SMTP pending/failed;
double click; ambiguous network commit then same-key retry; inaccessible or
missing confirmation. Use a controlled test environment, not real purchases.

No sensitive persistence means a full page reload/tab closure or logout loses
an unresolved checkout key and form. An unknown outcome cannot be recovered
automatically without an authorized attempt lookup that the backend does not
provide. Do not blindly begin another purchase after such an outcome; reconcile
the sale first. Confirmation with a known sale ID is refresh-safe after login.
There is no cross-tab coordination or automatic email-status polling.
Inactive cart rows hidden by the backend serializer can still reject checkout;
the UI preserves the cart and explains the failure but cannot remove a hidden
row without a backend contract change. Existing migration/deployment and live
database concurrency validation remain separate outstanding work.

Production hosting must rewrite application paths to `index.html` while
preserving API/static paths; Vite's development fallback is not production
configuration.
