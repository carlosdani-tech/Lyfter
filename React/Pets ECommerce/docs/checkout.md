# Secure checkout contract

This Phase 4 contract supersedes the earlier bodyless checkout. Confirmation
email runs after purchase commit; see [email delivery](email.md). Real payments
remain outside scope.

## HTTP contract

```http
POST /sales/checkout
Authorization: Bearer <client_token>
Idempotency-Key: <caller-generated-attempt-key>
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

All top-level fields are required. Name and email are trimmed, nonblank strings
with limits of 200 and 254 characters. Existing email syntax checks remain.
`shipping_address` is one required string containing the buyer's complete delivery
address, with a maximum of 500 characters after normalization. The frontend shows
one textarea labeled `Dirección de envío`, after name and email. City, province,
postal code, country, and ISO codes such as `CR` are not separately required.
No address components are inferred or fabricated. Natural Spanish accents,
punctuation, internal spaces and line breaks are preserved. CRLF and CR become
LF; surrounding whitespace is trimmed. Other ASCII control characters fail.
The same normalized string is validated, fingerprinted, persisted, and returned.
Unknown top-level keys, legacy address objects, owner/role fields, prices,
invoice numbers, statuses, and item price overrides are rejected. Only JWT
identity determines ownership; persisted active-client checks remain in force.

`Sale.shipping_address` remains the existing JSON column; new snapshots contain
a JSON string. No schema change or migration is needed. Confirmation/invoice
serialization retains old object snapshots as stored. One email formatting helper
supports new text and legacy known object fields, skips malformed values, and
never modifies historical snapshots or prints raw object representations. The
public checkout accepts only text; legacy support is limited to reading records.

The implemented API requires the frontend to send the loaded cart snapshot and the
currently displayed total. `items` contains only `product_id` and `quantity`:
1-1000 entries, no duplicate product IDs, and strict positive JSON integers in
`1..2147483647` (the existing database/frontend integer range, within JS safe
integers). No existing cart item-count cap was defined; 1000 is the checkout
request bound. Unknown item keys, numeric strings, floats, and booleans fail.
`total_amount` must be a canonical ASCII decimal string with exactly two places,
from `"0.00"` to `"99999999.99"`, without leading zeroes, spaces, symbols, commas,
or exponents. It is a consistency check, never an authoritative amount.

The backend still loads and locks the authenticated owner's cart/products and
recalculates all amounts from current database prices. Item mismatch returns
`409` with `Checkout cart snapshot does not match the active cart.`; total
mismatch returns `409` with `Checkout total does not match the current cart total.`
in the normal `error.message` envelope. Both happen before sale, invoice, stock,
or cart-status mutations. The server-calculated total is persisted and returned.

The frontend preserves buyer/address fields, discards only the known failed
snapshot attempt, releases its cart lock, and refreshes the authoritative cart.
It shows `El carrito cambió desde que se preparó la compra. Revisa los productos
y vuelve a intentarlo.` and requires an explicit new confirmation with a new key.
A failed refresh keeps submission blocked. It never automatically resubmits.
Uncertain outcomes and idempotency conflicts retain the identical frozen body
and key, including items and total, even if a refreshed cart is empty after commit.
After a known validation failure, corrected data or a newer cart version starts
a new attempt; an unchanged rejected request may reuse its original key/body.

The key is required: 1–128 ASCII letters, digits, `.`, `_`, `:`, or `-`.
Use a fresh UUID for each intended purchase and retain it across retries.
Keys are scoped to the authenticated owner and retained with the sale without
expiry. A SHA-256 fingerprint binds the key to the normalized buyer/address,
items sorted by product ID, and canonical total. Item array order alone does not
change the fingerprint. Matching replay returns the existing purchase with HTTP
`201`; changed details return `409`, even if a new cart exists. Replay never consumes a new
cart or uses current product prices. A distinct key can purchase a new active
cart; it cannot repurchase the closed cart. Failed transactions do not consume
keys. After cancellation/return, replay returns the same purchase and its current
status, without restoring stock again. The key and fingerprint are never returned.

Checkout and `GET /sales/<sale_id>/confirmation` return the same `data` envelope
with `sale` and `invoice`. Confirmation is owner-only: another owner or a missing
sale gets `404`; admins get `403`. Existing administrative invoice access remains.
For product 1 named `Alimento`, price `12.50`, quantity 2, and generated IDs 1:

```json
{
  "data": {
    "sale": {
      "id": 1,
      "user_id": 1,
      "cart_id": 1,
      "status": "completed", "email_status": "pending",
      "full_name": "Ana Ejemplo",
      "buyer_email": "ana@example.com",
      "shipping_address": "Del parque central de San José, 200 metros al norte, edificio azul, San José, Costa Rica.",
      "subtotal_amount": "25.00",
      "tax_amount": "0.00",
      "total_amount": "25.00",
      "items": [{
        "id": 1, "product_id": 1, "product_name": "Alimento", "quantity": 2,
        "unit_price": "12.50", "line_total": "25.00"
      }],
      "invoice": {
        "id": 1, "sale_id": 1, "invoice_number": "INV-000001",
        "status": "issued", "total_amount": "25.00",
        "issued_at": "2026-10-14T18:00:00+00:00",
        "sale": {
          "id": 1, "user_id": 1, "status": "completed", "email_status": "pending",
          "full_name": "Ana Ejemplo", "buyer_email": "ana@example.com",
          "shipping_address": "Del parque central de San José, 200 metros al norte, edificio azul, San José, Costa Rica.",
          "subtotal_amount": "25.00", "tax_amount": "0.00", "total_amount": "25.00",
          "items": [{
            "id": 1, "product_id": 1, "product_name": "Alimento", "quantity": 2,
            "unit_price": "12.50", "line_total": "25.00"
          }],
          "completed_at": "2026-10-14T18:00:00+00:00",
          "cancelled_at": null, "returned_at": null
        }
      },
      "completed_at": "2026-10-14T18:00:00+00:00",
      "cancelled_at": null, "returned_at": null
    },
    "invoice": {
      "id": 1, "sale_id": 1, "invoice_number": "INV-000001",
      "status": "issued", "total_amount": "25.00",
      "issued_at": "2026-10-14T18:00:00+00:00",
      "sale": {
        "id": 1, "user_id": 1, "status": "completed", "email_status": "pending",
        "full_name": "Ana Ejemplo", "buyer_email": "ana@example.com",
        "shipping_address": "Del parque central de San José, 200 metros al norte, edificio azul, San José, Costa Rica.",
        "subtotal_amount": "25.00", "tax_amount": "0.00", "total_amount": "25.00",
        "items": [{
          "id": 1, "product_id": 1, "product_name": "Alimento", "quantity": 2,
          "unit_price": "12.50", "line_total": "25.00"
        }],
        "completed_at": "2026-10-14T18:00:00+00:00",
        "cancelled_at": null, "returned_at": null
      }
    }
  }
}
```

IDs and timestamps above are illustrative; the nested invoice/sale fields retain
the existing envelope. Items are ordered by persisted item ID. Money is a
two-decimal string and timestamps include UTC offsets. No live product fields
are used for purchase snapshots, even after product rename or price changes.

| Status | Meaning |
| --- | --- |
| 201 | New checkout or matching replay |
| 200 | Confirmation lookup, cancellation, return |
| 400 | Invalid JSON/fields/key, empty cart, insufficient stock, total exceeds storage limit |
| 401 | Missing authentication (JWT validation retains existing error behavior) |
| 403 | Non-client checkout/confirmation; unauthorized retained sale/invoice action |
| 404 | Inactive/missing product; missing or non-owned confirmation |
| 409 | Cart/total snapshot mismatch, or key reused with different normalized request details |
| 503 | Sanitized unexpected checkout failure; retry with the same key |

Validation example (`400`):

```json
{"error":{"message":"Invalid request payload.","details":{"body":"Unsupported fields."}}}
```

No raw input values, provider responses, database details, or stack traces are
returned or logged by checkout. Shipping and buyer snapshots are private and
are never cached. CORS explicitly allows `Idempotency-Key` for existing origins.

## Transaction and locking

At PostgreSQL's default READ COMMITTED isolation, repository `SELECT ... FOR
UPDATE` locks serialize checkout and cart writes by owner row, then lock the
active cart, cart items by product ID, and products by ascending ID. Locking
the owner also serializes first-cart creation and same-owner keys before any
sale exists. Locked ORM rows use `populate_existing` to discard stale state.
All cart mutation services acquire the same owner lock. Checkout validates
the active cart, item quantity, current product activation and stock after
locking. Submitted `(product_id, quantity)` pairs must match the locked cart
without depending on array order. The submitted total is parsed with Decimal and
compared to the current server calculation before any purchase writes. It writes
sale, immutable buyer/address and item-name/price/quantity snapshots, invoice, stock decrement, and checked-out cart in one transaction.
Any pre-commit failure rolls everything back; unexpected failures return a
sanitized retryable response. An uncertain commit can be retried with the key.

Persisted NUMERIC(10,2) product prices are SQLAlchemy Decimal values. Integer
quantity multiplication and summation use Decimal, with explicit ROUND_HALF_UP
cent rounding. Tax remains zero under the existing policy. Totals over
99,999,999.99 are rejected before writes. No float or browser money is used to
calculate or persist purchase amounts.

Cancellation/return lock the sale before checking status, then lock products in
the same ascending order before restoring stock. Only a completed sale can be
restored, so competing cancellation/return attempts cannot restore twice.
Admin product update/deactivation also locks the product before mutation.
Product list/detail cache invalidation follows successful commit. Redis outages
retain existing best-effort cache semantics. Confirmation email is attempted
only after commit, in a separate persisted delivery flow; see [email](email.md).

## Additive migration and constraint rationale

`b72e4a9f1036_secure_checkout_snapshots.py` follows `a83c1e7d4f20`.
It is present on disk; no live applied revision was inspected and no migration
was applied by this documentation update. Deployment requires review/approval and a
coordinated backend rollout after upgrading the schema. No columns or data are
dropped, renamed, or fabricated. Legacy snapshot/key fields remain null because
historical buyer details and product names cannot be reconstructed reliably.
Legacy item names serialize as null rather than a misleading current name.

- `uq_sales_user_checkout_key`: database uniqueness of `(user_id, idempotency_key)`
  prevents duplicate purchases for a key; PostgreSQL permits null legacy keys.
- `ck_sales_checkout_snapshot`: keyed purchases require a bounded nonempty key,
  64-character fingerprint, nonblank buyer name/email, shipping snapshot and
  completion time, and total equal to subtotal plus tax. Legacy unkeyed rows
  remain valid. Detailed address/email checks are schema responsibilities.
- `ck_sale_items_snapshot`: named snapshots require nonblank names and line
  totals equal to unit price times quantity rounded to cents. Rounding avoids
  SQLite floating storage artifacts while PostgreSQL uses exact numeric math.
  Legacy null-name items remain valid.
- `uq_carts_active_user`: partial unique index permits only one active cart per
  owner while retaining any number of historical carts. Upgrade stops if legacy
  duplicates exist; reconcile them only with a reviewed, approved data plan.
- Existing nonnegative money/stock, positive quantities, status checks, one sale
  per cart, one invoice per sale, and invoice-number uniqueness remain in force.

Downgrade deliberately raises: deleting snapshots needs a separate approved,
reviewed migration. Application immutability means no purchase endpoint mutates
snapshots; direct database administrators can still change stored values.

## Validation limits

The default suite is isolated SQLite; it verifies exact snapshots, decimal
totals, schema rejection, role/owner isolation, rollback after invoice flush,
key replay/conflict/new-cart behavior, uniqueness constraints, stale-stock
refresh, competing clients sequentially exhausting stock, and generated
PostgreSQL lock SQL and ordering. SQLite does not implement row-level FOR UPDATE.
Actual simultaneous PostgreSQL checkout and cancellation/return contention must
still be exercised against an approved disposable PostgreSQL environment before
production deployment. No live database or migration is touched by validation.
