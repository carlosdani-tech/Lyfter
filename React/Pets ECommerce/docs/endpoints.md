# Endpoints

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
  "password": "Password123",
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
  "password": "Password123"
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
      "email": "admin@example.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
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

Successful responses wrap the serialized product in
`{"data": {"product": { ... }}}`. Serialized products use `name`,
`description`, `category`, `price`, `stock`, `image_url`, and `is_active`,
plus `id`, `created_at`, and `updated_at`.

```text
GET /products
```

Public endpoint. Lists active products without requiring authentication. This response is cached in Redis Cloud with key `pet_ecommerce:products:list`.

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

Public endpoint. Returns one active product by id without requiring authentication. This response is cached in Redis Cloud with key `pet_ecommerce:products:detail:<product_id>`.

Response shape: `{"data": {"product": { ... }}}`. An inactive or unknown
product returns `404`.

```text
PUT /products/<product_id>
Authorization: Bearer <admin_token>
```

Updates one or more product fields: `name`, `description`, `category`, `price`, `stock`, `image_url`, `is_active`. `category` is optional, accepts `null` or an empty value, and is limited to 100 characters.

Successful response shape: `{"data": {"product": { ... }}}`.

```text
DELETE /products/<product_id>
Authorization: Bearer <admin_token>
```

Deactivates a product by setting `is_active` to `false`. Product cache is invalidated after create, update, and deactivate operations.

Successful response shape: `{"data": {"product": { ... }}}`, with
`is_active` set to `false`.

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

Cart operations validate available product stock but do not change stock. Stock changes only after sale or payment confirmation.

## Sales

```text
POST /sales/checkout
Authorization: Bearer <client_token>
```

Creates a sale from the authenticated client's active cart. The operation validates cart items and stock, creates sale items and invoice, reduces product stock, and marks the cart as `checked_out` in one transaction.

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

