# Endpoints

This is the implemented HTTP inventory, not a record of live endpoint tests.
Application success bodies use `data`; handled validation/business failures
use `error.message` and optional `error.details`. Health endpoints below are
plain objects. Flask-JWT-Extended retains its native authentication error
body (including `msg`); malformed tokens commonly return 422, expired/missing
tokens 401. Unmatched routes and unexpected failures are not all converted
by a global JSON handler. Do not promise a uniform envelope for those cases.

## Current endpoints

Application health:

```text
GET /health
```

Returns:

```json
{
  "status": "ok"
}
```

Module health endpoints:

- `GET /auth/health`
- `GET /products/health`
- `GET /cart/health`
- `GET /sales/health`
- `GET /invoices/health`

Each module health endpoint returns:

```json
{
  "module": "module_name",
  "status": "ok"
}
```

## Authentication

```text
POST /auth/register
```

Registers a new `client` user. Request body:

```json
{
  "email": "client@example.com",
  "password": "<strong-client-password>",
  "first_name": "Client",
  "last_name": "User"
}
```

```text
POST /auth/login
```

Returns a JWT access token and safe user data. Request body:

```json
{
  "email": "client@example.com",
  "password": "<configured-user-password>"
}
```

Successful response:

```json
{
  "data": {
    "access_token": "jwt",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "email": "client@example.com",
      "first_name": "Client",
      "last_name": "User",
      "role": "client",
      "is_active": true
    }
  }
}
```

```text
GET /auth/me
Authorization: Bearer <token>
```

Returns the authenticated user without `password_hash`.

```text
GET /auth/admin-check
Authorization: Bearer <admin_token>
```

Admin-only permission check endpoint.

## Products

```text
POST /products
Authorization: Bearer <admin_token>
```

Creates a product. `category` is optional and limited to 100 characters. Request body:

```json
{
  "name": "Cat Toy",
  "description": "Interactive toy",
  "category": "Toys",
  "price": "7.50",
  "stock": 25,
  "image_url": "https://example.com/cat-toy.jpg",
  "is_active": true
}
```

For creation, `name`, `price`, and `stock` are required. `description`,
`category`, and `image_url` are optional. `price` must be greater than or equal
to zero, and `stock` must be an integer greater than or equal to zero.

Successful responses wrap the serialized product in
`{"data": {"product": { ... }}}`. Serialized products use `name`,
`description`, `category`, `price`, `stock`, `image_url`, and `is_active`,
plus `id`, `created_at`, and `updated_at`.

Creation returns HTTP `201`. Product prices are serialized as decimal strings,
for example `"7.50"`.

```text
GET /products
```

Public endpoint. Lists active products without requiring authentication. When
optional Redis is enabled and available, the data uses
`<REDIS_KEY_PREFIX>:products:list`; otherwise reads use PostgreSQL.

Do not send an `Authorization` header for normal public catalog access.

Response shape:

```json
{
  "data": {
    "products": []
  }
}
```

```text
GET /products/<product_id>
```

Public endpoint. Returns one active product by ID without authentication. The
optional cache key is `<REDIS_KEY_PREFIX>:products:detail:<product_id>`.

Do not send an `Authorization` header for normal public detail access.

Response shape: `{"data": {"product": { ... }}}`. An inactive or unknown
product returns `404`.

```text
PUT /products/<product_id>
Authorization: Bearer <admin_token>
```

Updates one or more product fields: `name`, `description`, `category`, `price`, `stock`, `image_url`, `is_active`. `category` is optional, accepts `null` or an empty value, and is limited to 100 characters.

The request body must contain at least one supported field. `price` and `stock`
use the same non-negative validation as product creation.

Successful response shape: `{"data": {"product": { ... }}}`.

```text
DELETE /products/<product_id>
Authorization: Bearer <admin_token>
```

Deactivates a product by setting `is_active` to `false`. Product cache is invalidated after create, update, and deactivate operations.

Successful response shape: `{"data": {"product": { ... }}}`, with
`is_active` set to `false`.

Authentication, authorization, validation, and not-found failures use this
envelope with the corresponding `4xx` status. Validation responses may also
include an `error.details` object keyed by field name:

```json
{
  "error": {
    "message": "Invalid request payload.",
    "details": {
      "price": "Price must be greater than or equal to 0."
    }
  }
}
```

## Cart

```text
GET /cart
Authorization: Bearer <client_token>
```

Creates or returns the authenticated user's active cart.

```text
POST /cart/items
Authorization: Bearer <client_token>
```

Adds a product to the active cart. If the product already exists in the cart, quantity is incremented. Request body:

```json
{
  "product_id": 1,
  "quantity": 2
}
```

```text
PUT /cart/items/<item_id>
Authorization: Bearer <client_token>
```

Updates a cart item quantity. Request body:

```json
{
  "quantity": 4
}
```

```text
DELETE /cart/items/<item_id>
Authorization: Bearer <client_token>
```

Removes an item from the authenticated user's active cart.

Cart operations check stock but do not reserve or change it. Checkout reduces
stock; cancellation/return restores it. There is no payment-confirmation flow.
GET creates/reuses an active cart; add returns 201, other cart operations 200.
Each returns the full `{data:{cart:...}}`, never only an item or 204.
Cart fields: `id`, `user_id`, `status`, `items`, `subtotal`, `total`,
`created_at`, `updated_at`. Item fields: `id`, `product_id`, `name`,
`unit_price`, `quantity`, `line_total`. Money is decimal text calculated from
current database prices. Inactive products are omitted from this serializer
without removing their stored items; checkout still validates those rows.
The current cart schema coerces numeric inputs with `int()` and ignores extra
keys; do not describe it as the stricter checkout allowlist. The frontend
rejects fractional, boolean, unsafe, and noncanonical IDs/quantities locally.

## Sales

```text
POST /sales/checkout
Authorization: Bearer <client_token>
```

Creates a sale from the authenticated client's active cart. The operation validates cart items and stock, creates sale items and invoice, reduces product stock, and marks the cart as `checked_out` in one transaction.

Phase 4 requires buyer JSON with `shipping_address` as one complete-address string
(required, trimmed, maximum 500 characters, internal line breaks allowed), `items` (only product ID/quantity), canonical
two-decimal `total_amount`, and `Idempotency-Key`. See
[checkout contract](checkout.md) for the exact request/response, limits, replay
rules and status codes. Both a new purchase and matching replay return `201`.
Unsupported fields return `400`; submitted cart/total mismatch and key reuse with
changed normalized request details return `409`. The locked authenticated cart
and current database prices determine the persisted/returned total. Item order
alone does not change the fingerprint. Address CRLF/CR normalize to LF before
fingerprinting/persistence. No separate city, province, postal code, or country
code is required. Legacy object addresses remain readable in stored purchases.
This is the implemented contract, which differs from repository instructions
requiring buyer-only input and a structured address. No API change is included
in this documentation update.
`GET /sales/<sale_id>/confirmation` returns the same envelope with `200`, only
for the owning client (`404` for another owner, `403` for an admin).

```text
POST /sales/<sale_id>/cancel
Authorization: Bearer <client_or_admin_token>
```

Cancels a completed sale. Clients can cancel only their own sales; admin can cancel any sale. Product stock is restored and the invoice status becomes `cancelled`.

```text
POST /sales/<sale_id>/return
Authorization: Bearer <client_or_admin_token>
```

Returns a completed sale. Clients can return only their own sales; admin can return any sale. Product stock is restored and the invoice status becomes `refunded`.

Confirmation delivery is attempted only after checkout commits. Serialized
sales now include `email_status` (`pending`, `sent`, `failed`). Checkout replays
never send email. `POST /sales/<sale_id>/email/retry` is owner/client-only and
returns `200` with the confirmation envelope; cooldown, attempt limits, and
ambiguous-delivery safeguards may skip sending. See [email](email.md) for
configuration, permissions, retry semantics, and production limits.

```text
GET /sales/<sale_id>/confirmation
POST /sales/<sale_id>/email/retry
Authorization: Bearer <owning_client_token>
```

Both are client-owner only; admins get 403, missing/other-owner purchases 404.
Confirmation GET performs no checkout, stock mutation, or email send. Retry
uses the persisted sale/key, ignores purchase/recipient overrides, and can
return 200 without sending because of status/cooldown/cap/fencing. There is
no frontend email-retry control, sale-list endpoint, or purchase lookup by key.

## Invoices

```text
GET /invoices
Authorization: Bearer <token>
```

Lists invoices. Clients receive only their own invoices; admin receives all invoices.

```text
GET /invoices/<invoice_id>
Authorization: Bearer <token>
```

Returns invoice detail. Clients can access only their own invoices; admin can access any invoice.

Invoice responses include invoice data, sale totals, and purchased products with quantity, unit price, and line total.

## Scope exclusions

This project does not include a user management module. There are no endpoints to list, view, update, deactivate, or otherwise manage users.

Users exist only for authentication, JWT identity, role permissions, and ownership checks.

## Permission expectations

- `admin`: manage products, view invoices, cancel or return any sale.
- Public users: browse active products and view active product details.
- client: manage own cart, purchase, view own invoices, cancel or return own sales.

