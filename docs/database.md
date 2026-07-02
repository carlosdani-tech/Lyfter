# Database

PostgreSQL is the required database.

## Environment variables

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pet_ecommerce_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

These values are used by `app/config.py` to build:

```text
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

## Setup

Create the database in PostgreSQL before running migrations.
Do not create application tables manually from Flask code.

## Migrations

Generate a migration after model changes:

```powershell
.venv\Scripts\python -m flask --app run.py db migrate -m "message"
```

Apply migrations:

```powershell
.venv\Scripts\python -m flask --app run.py db upgrade
```

Rollback the last migration only when the impact is understood:

```powershell
.venv\Scripts\python -m flask --app run.py db downgrade
```

## Modeling rules

- Use snake_case table and column names.
- Use explicit primary keys and foreign keys.
- Add indexes for common filters and useful foreign keys.
- Use nullable fields only when the business rule allows it.
- Store password hashes, never plain-text passwords.
- Do not drop tables, columns, or data without explicit approval.

## Tables

### `roles`

- `id`: integer primary key.
- `name`: required unique string. Valid application roles are `admin` and `client`.
- `description`: optional string.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

Roles support authentication, JWT permissions, access checks, and admin-only user management.

### `users`

- `id`: integer primary key.
- `role_id`: required foreign key to `roles.id`, indexed.
- `email`: required unique string.
- `password_hash`: required string. Plain-text passwords are never stored.
- `first_name`: optional string.
- `last_name`: optional string.
- `is_active`: required boolean, indexed.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

Users are used for registration, login, JWT identity, role permissions, and ownership checks.

### `products`

- `id`: integer primary key.
- `name`: required string, indexed.
- `description`: optional text.
- `price`: required numeric value with two decimal places, must be greater than or equal to 0.
- `stock`: required integer, must be greater than or equal to 0.
- `image_url`: optional string.
- `is_active`: required boolean, indexed. Delete operations deactivate products.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

### `carts`

- `id`: integer primary key.
- `user_id`: required foreign key to `users.id`, indexed.
- `status`: required string. Valid values: `active`, `checked_out`, `abandoned`.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

The active cart is created or reused per authenticated user by the cart service.

### `cart_items`

- `id`: integer primary key.
- `cart_id`: required foreign key to `carts.id` with cascade delete.
- `product_id`: required foreign key to `products.id`, indexed.
- `quantity`: required integer, must be greater than 0.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

Each cart can include a product only once through `uq_cart_items_cart_product`. Cart item changes do not update product stock.

### `sales`

- `id`: integer primary key.
- `user_id`: required foreign key to `users.id`, indexed.
- `cart_id`: optional unique foreign key to `carts.id`.
- `status`: required string. Valid values: `completed`, `cancelled`, `returned`.
- `subtotal_amount`: required numeric value, must be greater than or equal to 0.
- `tax_amount`: required numeric value, must be greater than or equal to 0.
- `total_amount`: required numeric value, must be greater than or equal to 0.
- `billing_address`: optional string captured from checkout payload for new sales.
- `payment_method`: optional safe payment method captured from checkout payload.
- `payment_reference`: optional external or mock payment reference captured from checkout payload.
- `completed_at`: optional timestamp.
- `cancelled_at`: optional timestamp.
- `returned_at`: optional timestamp.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

Checkout creates a sale in the same transaction as stock reduction and invoice creation.

### `sale_items`

- `id`: integer primary key.
- `sale_id`: required foreign key to `sales.id` with cascade delete.
- `product_id`: required foreign key to `products.id`, indexed.
- `quantity`: required integer, must be greater than 0.
- `unit_price`: required numeric value captured at purchase time.
- `line_total`: required numeric value captured at purchase time.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

### `invoices`

- `id`: integer primary key.
- `sale_id`: required unique foreign key to `sales.id`.
- `invoice_number`: required unique string.
- `status`: required string. Valid values: `issued`, `cancelled`, `refunded`.
- `total_amount`: required numeric value, must be greater than or equal to 0.
- `issued_at`: required timestamp.
- `created_at`: required timestamp.
- `updated_at`: required timestamp.

Invoices are created after successful checkout and reference sale items for purchased product details.

