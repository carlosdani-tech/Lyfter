# Cart and checkout API boundary

These modules implement the existing Flask routes and envelopes. Verified
sources are `Pets ECommerce/app/routes/cart.py`, `routes/sales.py`,
`schemas/cart_schema.py`, `schemas/sale_schema.py`, the cart/sale service
serializers, and the backend endpoint/checkout docs. No backend contract is
changed. See the [backend checkout contract](../../Pets%20ECommerce/docs/checkout.md).

## Requests and return values

Every function returns a promise. All requests use the shared `apiClient`
base URL and `fetch`, with `Authorization: Bearer <client-token>`. Requests
with JSON bodies also send `Content-Type: application/json`. Tokens are never
included in URLs, bodies, errors, or logs. No request is automatically retried.

| Function | Method and path | JSON body | HTTP success | JS result |
| --- | --- | --- | --- | --- |
| `getCart(token)` | `GET /cart` | None | `200` | `data.cart` |
| `addCartItem(productId, quantity, token)` | `POST /cart/items` | `{product_id, quantity}` | `201` | `data.cart` |
| `updateCartItem(itemId, quantity, token)` | `PUT /cart/items/:itemId` | `{quantity}` | `200` | `data.cart` |
| `removeCartItem(itemId, token)` | `DELETE /cart/items/:itemId` | None | `200` | `data.cart` |
| `checkoutPurchase(buyerData, token, optionalIdempotencyKey)` | `POST /sales/checkout` | Allowlisted buyer/address object below | `201`, including matching replay | `{sale: data.sale, invoice: data.invoice, idempotencyKey}` |

`GET /cart` may create an empty active cart on the backend. Adding an existing
product **increments** its quantity; updating an item **replaces** its quantity.
Zero is not a removal operation: use `removeCartItem`. All cart operations
return the entire authoritative cart, not an item-only result or `204`.

The cart HTTP envelope is `{data: {cart: {...}}}`. The returned cart contains
`id`, `user_id`, `status`, `items`, `subtotal`, `total`, `created_at`, and
`updated_at`. Each item has `id`, `product_id`, `name`, `unit_price`, `quantity`,
and `line_total`. Money stays in backend-provided decimal strings; the API
layer calculates no totals and changes no stock.

Checkout sends exactly:

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

Only these top-level and address fields are copied. Extra source properties,
including prices, totals, user/role identifiers, item overrides, invoice
numbers, statuses, and `toJSON` hooks, are not sent. Unlike a direct backend
request (which rejects unsupported fields), this boundary strips extras.
Required fields must be strings; `line2` may be omitted/null and is sent as
null. Backend validation retains authority over nonblank values, lengths,
email syntax, country normalization, stock, roles, ownership, and totals.

The checkout HTTP envelope is `{data: {sale: {...}, invoice: {...}}}`. Returned
sale/invoice objects retain the backend serializer fields unchanged:

- Sale: `id`, `user_id`, `cart_id`, `status`, `email_status`, buyer/address
  snapshots, `subtotal_amount`, `tax_amount`, `total_amount`, item snapshots,
  nested `invoice`, and completion/cancellation/return timestamps.
- Item snapshots: `id`, `product_id`, `product_name`, `quantity`, `unit_price`,
  and `line_total`.
- Invoice: `id`, `sale_id`, `invoice_number`, `status`, `total_amount`,
  `issued_at`, and nested sale snapshot.

`email_status: "failed"` remains purchase success. It never triggers another
checkout attempt in this layer.

## Local validation

IDs and quantities accept positive integer numbers or canonical decimal
strings such as `"12"`. They are normalized to numbers and must fit the
backend's PostgreSQL `INTEGER` range, `1..2147483647`. Booleans, objects,
fractions, non-finite numbers, whitespace, leading zeroes, numeric suffixes,
and scientific-notation strings are rejected locally with `ApiError`, status
`400`, and field-keyed `details`. Backend validation remains in place.

Missing, non-string, whitespace-containing, control-character, or non-ASCII
tokens fail locally with status `401`, without displaying the token or
issuing a request. Validating header syntax does not verify a JWT; backend
authentication remains authoritative.

## Idempotency and uncertain outcomes

Checkout always sends the exact header `Idempotency-Key`. A supplied key is
sent unchanged and must be 1–128 ASCII letters, digits, `.`, `_`, `:`, or `-`.
Null, blank, overlong, whitespace, newline, and other invalid keys fail
locally before any request. If the argument is omitted, the module generates
a key with `crypto.randomUUID()`. If that API is unavailable, provide a valid
explicit key; the module fails safely instead of using weak randomness.

`idempotencyKey` in the JS result is frontend metadata, not a backend response
field. An error after a request has been prepared also carries
`error.idempotencyKey`, including network failures and malformed responses.
It contains no buyer data or credential. Errors before a key/request is
prepared do not have an attempt key.

CheckoutProvider generates and retains an explicit key **before** submission
and passes it on retries/double-clicks for that attempt. Uncertain/conflict
retries reuse the same buyer details. A matching replay returns the existing purchase
with `201`; changed normalized buyer/address details with the same key return
`409`. A new intended purchase needs a new key. Calling the function twice
without a key generates two distinct attempt keys, so callers must not use
that pattern for retries or double-click protection.

No module stores keys, adds UI state, retries a request, or reruns checkout to
retry email. Use AuthContext's `runProtectedRequest` for session-aware calls;
CheckoutProvider retains the attempt key in memory because auth invalidation
or a stale-session error can replace the API error.

## Errors

All non-cancellation failures use `ApiError` with `message`, numeric `status`,
and `details` (field dictionary or null). Messages are technical English;
UI consumers map them to fixed Spanish feedback rather than render raw API text.

| Status | Contract |
| --- | --- |
| `0` | Network/transport failure; generic message, no raw cause, no automatic retry |
| `400` | Local input validation or backend field/business validation; safe structured details retained |
| `401` | Local missing/unsafe token or backend missing/expired authentication |
| `422` | Backend JWT malformed-token response retained for auth invalidation |
| `403` | Non-client role or cart-item ownership denial |
| `404` | Missing/inactive product or absent/non-active cart item |
| `409` | Checkout key reused with different normalized buyer/address details |
| `5xx` | Backend failure with generic message and no internal details; checkout can return `503` |
| `502` | Locally detected malformed/non-JSON success or invalid cart/checkout response shape |

Known cart/checkout business messages are allowlisted. For backend `400`
validation, only schema-defined field names and messages are retained;
unrecognized text for a known field becomes `"Invalid value."`, and unrelated
fields are dropped. Non-JSON error bodies, internal stack/provider/database
text, and arbitrary server messages are never exposed by these modules.
New backend validation wording must be reviewed in the allowlist.

Shared `apiClient` also suppresses all `5xx` messages/details and raw network
causes, preserves HTTP status on malformed JSON errors, rejects malformed
success JSON safely, and propagates `AbortError` cancellation. Existing
product/auth request shapes and structured `4xx` envelopes remain unchanged.

## Verification and limits

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

Boundary tests intercept `fetch` and verify methods, paths, headers, body
allowlists, numeric validation, envelopes, safe errors, key generation/reuse,
and absence of automatic retries. They do not call a live backend or create a
purchase. No migration, dependency installation, or live data change is part
of this work. Backend docs identify migration files requiring deployment review;
no live applied revision is established here. PostgreSQL concurrency checks remain pending; deployment readiness is not
established by frontend lint/build or mocked transport tests.
