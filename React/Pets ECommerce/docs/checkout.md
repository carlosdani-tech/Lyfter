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
  "shipping_address": {
    "line1": "Calle 1",
    "line2": null,
    "city": "San José",
    "province": "San José",
    "postal_code": "10101",
    "country": "CR"
  }
}
```

All fields except `line2` are required. Values must be strings, trimmed and
nonblank; `line2` may be omitted, null or blank (normalized to null). Maximum
lengths: name 200, email 254, line1/line2 200, city/province 100, postal code 20,
country exactly two ASCII letters (normalized uppercase). Email must have a
non-whitespace local part, an `@`, and a dotted domain. This is syntactic
validation, not delivery verification. Control characters are rejected.
Unsupported body and address keys are rejected, including owner, role, price,
stock, totals, invoice number, status, or item overrides. No mass assignment is
performed. Only JWT identity determines the owner. JWT client-role enforcement
is retained and checkout also verifies the persisted user is active and a client.

The key is required: 1–128 ASCII letters, digits, `.`, `_`, `:`, or `-`.
Use a fresh UUID for each intended purchase and retain it across retries.
Keys are scoped to the authenticated owner and retained with the sale without
expiry. A SHA-256 fingerprint binds the key to the normalized buyer/address
payload. Matching replay returns the existing purchase with HTTP `201`; changed
details return `409`, even if a new cart exists. Replay never consumes a new
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
      "shipping_address": {
        "line1": "Calle 1", "line2": null, "city": "San José",
        "province": "San José", "postal_code": "10101", "country": "CR"
      },
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
          "shipping_address": {
            "line1": "Calle 1", "line2": null, "city": "San José",
            "province": "San José", "postal_code": "10101", "country": "CR"
          },
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
        "shipping_address": {
          "line1": "Calle 1", "line2": null, "city": "San José",
          "province": "San José", "postal_code": "10101", "country": "CR"
        },
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
| 409 | Key reused with different normalized buyer/address details |
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
locking. It writes sale, immutable buyer/address and item-name/price/quantity
snapshots, invoice, stock decrement, and checked-out cart in one transaction.
Any pre-commit failure rolls everything back; unexpected failures return a
sanitized retryable response. An uncertain commit can be retried with the key.

Persisted NUMERIC(10,2) product prices are SQLAlchemy Decimal values. Integer
quantity multiplication and summation use Decimal, with explicit ROUND_HALF_UP
cent rounding. Tax remains zero under the existing policy. Totals over
99,999,999.99 are rejected before writes. No float or browser money is used.

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
