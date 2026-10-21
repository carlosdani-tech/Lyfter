# PawStore Phase 4 Operational Guide

## Authority and baseline

Phase 4 adds Router-owned URLs, AuthContext, CartContext, authenticated client
checkout, transactional sales/invoices, confirmation lookup, and confirmation
email. This guide describes the implemented Phase 4 behavior and supersedes
earlier feature exclusions for routing, global state, and the purchase flow.

Phase 3 rules remain: products come from the Flask API; product reads are
public; mutations are admin-only; login returns a JWT and safe role-bearing
user; API calls are centralized; backend product fields and category are used;
deletion is soft; language, security, architecture, and validation rules stay
in force. This guide describes the implementation currently on disk; it does
not certify a deployment. See the [frontend README](../project-1/README.md) and
[backend README](../Pets%20ECommerce/README.md) for application entry points.

## Routes and frontend ownership

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Home |
| `/productos` | Public | Catalog |
| `/productos/:id` | Public | Refresh-safe detail |
| `/contacto` | Public | Contact |
| `/login` | Public | Login |
| `/admin` | Admin | Product administration |
| `/admin/editar/:id` | Admin | Refresh-safe edit |
| `/carrito` | Client | Authoritative cart |
| `/checkout` | Client | Checkout |
| `/compra/:saleId` | Owning client | Refresh-safe confirmation |
| `*` | Public | 404 |

React Router owns navigation. Route resources load by URL parameter.
`AuthContext` owns session, roles, login/logout, errors, expiry, and redirect
intent. `CartContext` owns cart load/mutations, quantity count, backend totals,
refresh, and logout reset.

## API and checkout contract

Retain `{"data": ...}` successes and
`{"error":{"message":"...","details":...}}` handled failures.

Public products, auth, admin product mutations, client cart, owned invoice APIs,
and owner-only `GET /sales/<sale_id>/confirmation` are implemented. The complete
[endpoint inventory](../Pets%20ECommerce/docs/endpoints.md) includes email retry,
sale cancellation/return, backend registration, and health endpoints.

```http
POST /sales/checkout
Authorization: Bearer <client_token>
Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "full_name": "Ana Ejemplo",
  "buyer_email": "ana@example.com",
  "shipping_address": "Del parque central de San José, 200 metros al norte, edificio azul, San José, Costa Rica.",
  "items": [{ "product_id": 1, "quantity": 2 }],
  "total_amount": "25.00"
}
```

JWT identity is the only owner. Never accept client-controlled user IDs, prices,
invoice numbers, or statuses. The implemented API requires `items` containing only
product IDs/quantities and canonical two-decimal `total_amount`. Compare these
with the locked authenticated cart and server total; mismatch returns 409 before
purchase mutations. Recalculate money from database prices
and store immutable buyer, shipping, quantity, unit-price, and line snapshots.

## Atomicity, concurrency, and idempotency

Checkout locks the owner, active cart, items, and referenced products in deterministic
order, revalidates state/stock, calculates totals, creates sale/items/invoice,
reduces stock, and closes the cart in one transaction. Pre-commit failure rolls
everything back. An owner-scoped idempotency key and normalized-payload SHA-256
fingerprint are persisted with database uniqueness. Matching replay returns
the original purchase with current delivery/status data and HTTP 201; changed
buyer/address/items/total data returns 409; array order alone does not. The
server-calculated total is persisted and returned. Replay never consumes a newer cart or sends email.

## Email

After purchase commit, email starts as `pending`; an enabled delivery is
attempted synchronously, without a background queue. `sent` or `failed` is
recorded separately. Expected transport failure leaves purchase success, stock,
and invoice intact and never creates another sale. Retry only the existing
purchase. Disabled email remains pending; no SMTP configuration or real delivery
has been verified by this documentation update. Never expose provider credentials, tokens, passwords, unnecessary
personal data, raw provider responses, or stack traces.

## Roles, scope, and implementation sequence

Public users browse. Clients use only their own cart, checkout, confirmation,
and invoices. Admins manage products and may retain administrative invoice
access, but cannot use client checkout. Backend checks are authoritative.

Implemented responsibility boundaries:

1. Backend schemas validate input; repositories perform ORM reads/writes and
   locking; services own business rules and transactions; routes handle HTTP.
2. `EmailService` coordinates post-commit claims, `EmailRepository` persists
   claims/outcomes, and standard-library `SMTPTransport` handles TLS SMTP.
3. `BrowserRouter > AuthProvider > CartProvider > CheckoutProvider > App` is
   mounted inside Strict Mode in `project-1/src/main.jsx`.
4. `AuthContext` stores immutable, memory-only user/token/role snapshots,
   versioned login/protected requests, and synchronous dependent-store cleanup.
5. `CartContext` owns the only cart snapshot and FIFO mutation queue. It sums
   quantities for the header, not prices for checkout. Failed/ambiguous writes
   reconcile through GET and are never automatically replayed.
6. `CheckoutContext` owns the draft, request lock and one attempt/key. Validated
   completed purchases clear/refresh the cart and replace-navigate to confirmation.
   Cancelled/returned replays navigate without clearing a different active cart.

Out of scope: frontend registration, real payments, coupons, multiple saved
addresses, advanced field-level validation, mandatory `localStorage`
persistence, and user-management UI.

## Approval gates

Ask before installing Router/email/testing dependencies, generating or applying
migrations, changing auth/roles/public envelopes, editing `.env`, deleting
files, dropping objects/data, or committing. Dependency approval, migration
generation, and migration application are separate approvals.

## Validation

```powershell
cd "Pets ECommerce"
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .

cd ..\project-1
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Manual acceptance covers every direct URL and refresh, the public/client/admin
guard matrix, cart mutations/count/totals, successful and insufficient or
concurrent-stock checkout, replay, snapshots, confirmation ownership, and email
success/failure/retry without duplicate purchase.

Retain explicit required secrets, explicit CORS origins, and only required
headers including `Authorization`, `Content-Type`, and the approved
idempotency header. Never commit `.env` or credentials.

## Running and configuration

Developer-run prerequisites and commands are in the frontend/backend READMEs;
they are not claims that servers or migrations were run. Use the existing
virtual environment and node_modules. Request approval if dependencies are
missing. The frontend runs with `npm.cmd run dev`; the backend local command is
`.venv\Scripts\python -m flask --app run.py run --debug --port 5000` from its
directory. Debug mode and the Flask development server are not production hosting.

`VITE_API_BASE_URL` is a public build-time Vite value, defaulting to
`http://127.0.0.1:5000`; it must contain no secret. Backend configuration names
and requirements are documented in the [backend README](../Pets%20ECommerce/README.md)
and credential-free `.env.example`. Backend changes require a process restart;
Vite changes require a restart/rebuild. `APP_PORT` is not consumed by `run.py`,
and `FLASK_ENV` is not the application's environment switch.

CORS permits exactly `http://localhost:5173`, `http://127.0.0.1:5173`, and
`http://127.0.0.1:8080`, methods GET/POST/PUT/PATCH/DELETE/OPTIONS and headers
Content-Type/Authorization/Idempotency-Key. Other deployment origins require
an explicit reviewed configuration change. Preview defaults are not in this
allowlist; `npm.cmd run preview -- --port 5173` can use an allowed local origin
when the development server is stopped. Production origins are not configured.

Production must serve the frontend at its configured root and rewrite application
history URLs to `index.html` while preserving API/static errors. Flask provides
the API, not Vite's SPA hosting. The frontend README includes a hosting example.

## Contracts, retries, and privacy

Cart reads use `GET /cart` and may create an empty active cart. Add uses
`POST /cart/items` with `product_id` and `quantity` (incrementing an existing
row); update uses `PUT /cart/items/<item_id>` with an absolute positive
`quantity`; remove uses DELETE at that item path. Every operation returns
`data.cart` with server money strings. Decrement at one invokes DELETE, not
zero quantity. Cart changes do not reserve or reduce stock.

The backend cart serializer omits inactive products but retains their rows.
Checkout locks and examines all persisted items, so it can reject a hidden
inactive item. This is a current limitation, not a documented guarantee that
every checkout-blocking row is visible in the cart.

Checkout rejects unsupported JSON keys. The frontend API boundary copies only
approved fields. `shipping_address` is one required complete-address string,
trimmed and limited to 500 characters; CRLF/CR normalize to LF while internal
text and line breaks remain. The frontend provides one textarea, with no separate
city, province, postal code, country, or `CR` requirement. New snapshots store a
JSON string in the existing JSON column. The email formatter also reads legacy
objects without rewriting records. Prices, ownership,
invoice numbers, statuses, phone, and payment data are never checkout inputs.
Database Decimal prices determine totals; tax is currently zero, and checkout
rejects a total greater than 99,999,999.99. Buyer/address and product-name,
quantity, unit-price, and line-total snapshots remain unchanged by product edits.
The owner API returns buyer snapshots; the frontend projection discards them
before rendering confirmation. Administrative invoice access can expose those
snapshots and must be treated as privileged PII access.

Auth state has no storage restoration, refresh token, proactive expiry timer,
or backend logout/revocation endpoint. Protected 401/422 invalidates the current
frontend session; 403 does not. Frontend logout clears memory but cannot undo
a submitted request or revoke its JWT. Most protected role checks use the JWT
role claim; checkout additionally reloads the active persisted client user.

Checkout states are editing, submitting, rejected, uncertain, conflict,
succeeded, and resolved. Synchronous request/cart locks prevent same-session
double submission. Definitive rejection permits correction; changed form data
or a newer cart version requires a new key. Cart/total snapshot conflicts preserve
the form, discard the known failed attempt, refresh the cart, and require explicit
confirmation with a new key; failed refresh blocks submission. Other
uncertain/conflict states retain the identical key/payload and freeze fields.
Stock rejection requires a newer authoritative cart read. No automatic POST
retry occurs. Keys exist only in browser memory: reload, logout, or tab closure
loses an unresolved attempt. Do not start another purchase to recover an unknown
outcome; reconcile the existing sale first. There is no cross-tab lock or
attempt-lookup endpoint by key.

Expected application responses use `data` or `error.message` with optional
`error.details`. Health endpoints use plain objects; Flask-JWT-Extended uses
its native authentication error body. No global JSON handler covers every
unexpected exception. Frontend boundary sanitization preserves HTTP status and
never renders raw stack traces/provider responses. See backend endpoints for
the precise envelope exceptions and validation limits.

## Email and migration operations

See [email operations](../Pets%20ECommerce/docs/email.md) and
[database deployment](../Pets%20ECommerce/docs/database.md). SMTP is opt-in,
encrypted (`starttls` or `ssl`), synchronous after commit, and bounded to three
claimed attempts with a 60-second cooldown. Retry addresses the existing sale;
confirmation GET and checkout replay do not resend. `delivery_unknown` or a
durable in-flight claim blocks retry pending operator reconciliation. There
is no scheduler, queue, lease expiry, bounce handler, or inbox-delivery proof.

Completed confirmation title: `¡Gracias por tu compra!`. Only `sent` shows
`Hemos enviado un correo de confirmación con los detalles de tu pedido.`
Pending/failed/unknown email states keep purchase success with distinct delivery
feedback; cancelled/returned purchases retain non-success titles. The primary
`Volver al catálogo` action goes to `/productos`. The table keeps immutable
items, quantities, prices, totals, sale/invoice references, and accessible headers.

The repository contains five ordered migration revisions through `c91f6d2a804e`.
They were not generated or applied by this documentation task; no live database
revision was inspected. Review backup/restore and duplicate active carts before
approval. Both Phase 4 downgrades deliberately raise; rollback is not a routine
`db downgrade`. App creation attempts seeding during migration CLI loads too.
Do not run revision diagnostics against a live database as if they were
side-effect-free application starts.

## Role-based manual acceptance matrix

All rows below are developer-run checks, not manual passes from this update.
Use existing approved test accounts/data and a disposable environment for
purchase, SMTP, or stock mutations. Never include credentials in screenshots,
logs, commands, documentation, or bug reports.

| Scenario | Guest | Client | Admin |
| --- | --- | --- | --- |
| `/`, `/productos`, `/contacto`, `/login`; Header/Footer | Public pages | Public pages | Public pages |
| `/productos/:id`, fresh URL/refresh | Public API detail | Same | Same |
| `/admin`, `/admin/editar/:id` | Login with intended URL | Denied | Load/manage products |
| `/carrito`, `/checkout` | Login with intended URL | Own cart/form | Denied |
| `/compra/:saleId`, fresh URL/refresh | Login first | Owner-only lookup; other owner unavailable | Denied |
| Catalog/detail add | Login explanation; no write | One confirmed add and Toast/count | Denial; no cart request |
| Invalid IDs, inactive/missing products, unknown route | Safe status/404/retry | Same, subject to guards | Same, subject to guards |
| Failed login, logout, token expiry, Back/Forward | No protected content | Clear own session/cart/draft | Clear session/admin state |
| Cart increment/decrement/remove/refresh | Unavailable | Server quantities/totals; recover focus when row disappears | Unavailable |
| Empty/stale/insufficient-stock cart | Unavailable | Block/review; preserve cart on failure | Unavailable |
| Checkout Enter/double-click and same-key retry | Unavailable | Single purchase; matching replay; stale snapshot requires review | Unavailable |
| Sent/pending/failed/unknown email confirmation | Unavailable | Truthful status and intact summary | Unavailable |
| Invoice API, cancellation/return API | Authentication required | Own records/actions only | All invoices; any completed sale action |
| Email retry API | Authentication required | Own completed purchase, cooldown/cap/fencing | Denied |

Also inspect desktop/tablet/mobile widths around 1440, 900, and 375 CSS pixels,
and both sides of the 56.25rem/35rem breakpoints: wrapping, overflow, forms,
Toast, focus-visible rings, cart recovery, checkout panels, and confirmation
table. Compare cancelled/returned states and confirm refreshing a known purchase
performs only GET, never a new sale/invoice/stock mutation or email send.
Review simultaneous PostgreSQL contention and backup restoration separately.

## Executed validation versus deployment readiness

The implemented text-address and required items/total snapshot contract differs
from the structured-address, buyer-only contract in repository instructions.
The backend still calculates authoritative money. See the
[implementation mismatch](codex-implementation-guide.md#executed-validation-versus-deployment-readiness).
No functional/API change is included in this documentation update.

The [current documentation validation record](../Pets%20ECommerce/docs/testing.md#documentation-validation-record)
records actual executed commands. Earlier audit documents retain their own
session results; those numbers are not current suite totals. No live migration,
database revision inspection, SMTP connection, browser matrix, production
deployment, or installation is implied by static checks, SQLite tests, or build.
