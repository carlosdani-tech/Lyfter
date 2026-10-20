# Database

PostgreSQL is the required database.

## Environment variables

Names: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`,
and `DATABASE_PASSWORD`. Supply account/password values privately. The
credential-free `.env.example` intentionally requires local configuration.

These values are used by `app/config.py` to build:

```text
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

## Setup

Create the database in PostgreSQL before running migrations.
Do not create application tables manually from Flask code.

## Migrations

The following commands are developer-run operations requiring separate
generation/application approval; none was executed by this documentation task.
Generate a migration only after an approved model change:

```powershell
.venv\Scripts\python -m flask --app run.py db migrate -m "message"
```

Apply reviewed migrations only to the approved target database after the
backup and rollout checks below:

```powershell
.venv\Scripts\python -m flask --app run.py db upgrade
```

Do not use a blanket downgrade command. Both Phase 4 revisions deliberately
raise on downgrade to protect snapshots and delivery history. Removal requires
a separately reviewed destructive migration or an approved, tested backup
restore coordinated with application rollback.

### Revision inventory and deployment gates

| Revision | Parent | File / implemented change |
| --- | --- | --- |
| `570d6d55b1ea` | None | `570d6d55b1ea_create_initial_ecommerce_tables.py`: eight commerce/auth tables |
| `9d4f7b2c8a31` | `570d6d55b1ea` | `9d4f7b2c8a31_add_missing_product_image_url.py`: conditionally adds product image URL |
| `a83c1e7d4f20` | `9d4f7b2c8a31` | `a83c1e7d4f20_add_product_category.py`: conditionally adds category |
| `b72e4a9f1036` | `a83c1e7d4f20` | `b72e4a9f1036_secure_checkout_snapshots.py`: snapshots, owner/key uniqueness, active-cart index |
| `c91f6d2a804e` | `b72e4a9f1036` | `c91f6d2a804e_add_email_delivery_state.py`: six email fields and four delivery checks |

These are source files, including manually authored revisions, not proof of
generation commands or a database's applied head. No revision query or upgrade
was performed for this documentation update. Verify the target's
`alembic_version` through an approved private database inspection before rollout.

1. Confirm target/environment, current revision, backup ownership, recovery
   point, and a tested restore procedure. Never paste a connection URI or data
   dump into logs, docs, or review comments.
2. Review SQL/DDL in an approved disposable PostgreSQL environment and check
   duplicate active carts. The checkout upgrade stops on duplicates; it never
   deletes or relabels them. Reconciliation needs a reviewed data plan.
3. Coordinate application traffic and schema rollout; old-schema operation of
   the new models is not supported. Review lock duration and constraints.
4. Apply only with explicit approval, then verify revision/schema and restart
   the application. Exercise approved smoke tests before enabling SMTP.
5. If verification fails, stop rollout and use the approved forward-fix or
   restore plan. Do not stamp a revision to conceal missing schema changes.

The migration CLI imports `run.py`, which calls the normal factory and attempts
development seeding before its migration command. On a fresh/older schema,
seed SQLAlchemy errors are rolled back and suppressed; restart after upgrade
so seeding can run on the new schema. Seed role conflicts propagate and can
block CLI startup. On an existing schema, even a revision CLI load can attempt
user/role writes. There is no dedicated no-seed migration factory or production
seed-disable option. This is an operational gap, not authorization to alter
accounts, config, or factory behavior in a documentation task.

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

Roles support authentication, JWT permissions, and access checks. There is no user management CRUD module in this project scope.

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
- `category`: optional string with a maximum length of 100 characters.
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
The partial unique index `uq_carts_active_user` permits one `active` cart per
user and multiple historical carts. Owner-row locking also serializes first
cart creation and writes. `GET /cart` can create a cart and is not a strictly
read-only database operation.

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
- `completed_at`: optional timestamp.
- `idempotency_key`: nullable string(128), unique with `user_id` for keyed purchases.
- `request_fingerprint`: nullable string(64), SHA-256 normalized buyer/address fingerprint.
- `full_name`: nullable string(200), immutable buyer snapshot.
- `buyer_email`: nullable string(254), immutable buyer snapshot.
- `shipping_address`: nullable JSON, immutable structured snapshot.
- `email_status`: required string(10), `pending`, `sent`, or `failed`; default `pending`.
- `email_attempts`: required integer, 0 through 3; default 0.
- `email_in_flight`: required boolean, default false; durable delivery fence.
- `email_last_attempt_at`, `email_sent_at`: nullable timezone-aware timestamps.
- `email_error_code`: nullable string(32), bounded allowlisted internal code.
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
- `product_name`: nullable string(150), immutable name snapshot; legacy null remains null.
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

Invoices are created inside the checkout transaction, before its commit, and
reference sale items for purchased product details. A sale has one invoice,
numbered with the `INV-` prefix and sale ID padded to at least six digits.
Product and purchase money columns use NUMERIC(10,2). Checkout uses Decimal,
ROUND_HALF_UP cent rounding, and zero tax; browser totals are never authoritative.

Phase 4 adds nullable historical-compatible buyer/address snapshots, a checkout
key and fingerprint on `sales`, and a name snapshot on `sale_items`.
See [checkout migration rationale](checkout.md#additive-migration-and-constraint-rationale)
for every new constraint/index and legacy behavior. Migration
`b72e4a9f1036_secure_checkout_snapshots.py` is present on disk; its applied state
in a developer database was not inspected by this update.
It never deletes/relabels legacy carts or fabricates buyer data. Review/approval
and reconciliation of any duplicate active carts are required before upgrade.

The sales model also contains bounded confirmation delivery metadata; see
[email schema](email.md#schema-and-deployment). This state is independent of
purchase status and never stores credentials or provider responses. Separate
email migration `c91f6d2a804e_add_email_delivery_state.py` has been created with
`down_revision = "b72e4a9f1036"`; this update applies nothing. It adds only six email
columns and four check constraints matching the sales model.

