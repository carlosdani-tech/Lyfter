# Pet ECommerce Flask API

Backend API for a pet e-commerce final project using Flask, PostgreSQL, SQLAlchemy ORM, Redis Cloud, JWT authentication, pytest, and ruff.

## Implemented modules

- Application factory in `app/__init__.py`.
- Authentication with `POST /auth/register`, `POST /auth/login`, and `GET /auth/me`.
- JWT role permissions for `admin` and `client`.
- Users and roles support authentication, JWT identity, permissions, and ownership checks.
- User management CRUD is not part of this project scope.
- Product CRUD for admins and public product browsing.
- Active cart creation, item add/update/remove, totals, and stock validation.
- Sales checkout from the authenticated client's cart.
- Invoice creation within the checkout transaction, invoice listing, and invoice detail access.
- Stock reduction after checkout and stock restoration after sale cancellation or return.
- Redis Cloud cache for product list and product detail responses.
- Product cache invalidation after product changes and stock changes.
- pytest API coverage for auth, permissions, products, cart, sales, invoices, stock, and cache.

## Stack

- Python
- Flask
- PostgreSQL
- Redis Cloud
- SQLAlchemy ORM
- Flask-Migrate / Alembic
- Flask-JWT-Extended
- pytest
- ruff
- VS Code

## Developer-run setup (not executed by this documentation update)

Use the existing environment and dependencies when available. Obtain approval
before installing packages, editing `.env`, provisioning data, or generating/
applying migrations. The commands in this section are operator instructions,
not a record of executed deployment work.

Create the virtual environment:

```powershell
python -m venv .venv
```

Install dependencies:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and adjust local values. Do not commit real secrets or machine-specific passwords.

`SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`,
`CLIENT_SEED_EMAIL`, and `CLIENT_SEED_PASSWORD` must be nonblank. Startup fails before extensions or seed
operations are initialized if any required value is missing, empty, or
whitespace-only. The admin and client seed passwords must also be different.
Generate separate signing keys for each environment and never reuse the Flask
session key as the JWT key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Run the command separately for `SECRET_KEY` and `JWT_SECRET_KEY`. Configure
`ADMIN_SEED_PASSWORD` and `CLIENT_SEED_PASSWORD` with different strong passwords
that satisfy the existing password requirements. `.env.example` contains
variable names and instructions only; keep the real `.env` uncommitted.
Rotating `SECRET_KEY` invalidates signed Flask session data, while rotating
`JWT_SECRET_KEY` invalidates existing JWTs.

## PostgreSQL

Expected environment variables:

`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, and
`DATABASE_PASSWORD`. Supply account/password values privately; the template
leaves credentials blank. `app/config.py` builds the psycopg SQLAlchemy URI;
do not publish the expanded URI or rely on development credential fallbacks.
The current URI construction interpolates these parts without URL escaping;
verify credential-character compatibility privately. `DATABASE_URL` and an
environment `SQLALCHEMY_DATABASE_URI` are not read as overrides by this Config.

Create the database in PostgreSQL before running migrations. Application tables must be created through Flask-Migrate/Alembic migrations.

## Redis Cloud cache

Expected environment variables:

`REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`,
`REDIS_DEFAULT_TTL_SECONDS`, `REDIS_KEY_PREFIX`, `REDIS_SSL`,
`REDIS_SOCKET_CONNECT_TIMEOUT`, and `REDIS_SOCKET_TIMEOUT`.
The safe template disables Redis, uses a zero port and blank password, and
retains a 300-second TTL and one-second socket timeouts. Configure a provider
endpoint privately before opting in. Redis Insight is optional tooling.

The Flask app connects directly to Redis Cloud. Redis Insight Desktop is only a visual inspection and debugging tool connected to the same Redis Cloud database; it is not part of the Flask runtime configuration. Do not add a Redis Insight URL to the application.

For local development without Redis Cloud, keep `REDIS_ENABLED=false`. Products still load from PostgreSQL when Redis is disabled. When real Redis Cloud values are configured, set `REDIS_ENABLED=true`; invalid placeholder host or port values are ignored so product endpoints continue without cache.

Restart the backend after changing `.env`; environment variables are loaded when the Flask process starts.

If product reads stall, inspect approved Redis configuration and socket timeouts.
Disabling optional Redis through an approved configuration change permits
database-backed reads. No `.env` was edited by this documentation update.

Cached endpoints:

- `GET /products` -> `pet_ecommerce:products:list`
- `GET /products/<product_id>` -> `pet_ecommerce:products:detail:<product_id>`

Cache entries use `REDIS_DEFAULT_TTL_SECONDS`. Product cache is invalidated after create, update, deactivate, checkout stock reduction, cancellation, and return.

## Run

Using VS Code task:

```text
Terminal > Run Task > run
```

Manual command:

```powershell
.venv\Scripts\python -m flask --app run.py run --debug --port 5000
```

Health check:

```text
GET http://127.0.0.1:5000/health
```

## React frontend integration

The React application in `../project-1` uses these endpoint families:

- `POST /auth/login`
- `GET /products` (public)
- `GET /products/<product_id>` (public detail/direct edit lookup)
- `POST /products` (admin Bearer token required)
- `PUT /products/<product_id>` (admin Bearer token required)
- `DELETE /products/<product_id>` (admin Bearer token required; soft delete)
- `GET /cart`, `POST /cart/items`, `PUT /cart/items/<item_id>`,
  `DELETE /cart/items/<item_id>` (client only)
- `POST /sales/checkout` and `GET /sales/<sale_id>/confirmation` (owning client)

Detail and admin edit independently fetch the URL's product ID. Both read endpoints return only active
products. Deletion sets `is_active` to `false`; it does not physically remove
the row.

The Flask CORS configuration permits the standard Vite development origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

`http://127.0.0.1:8080` is also allowed for the project's alternate local
frontend workflow. CORS does not replace JWT and role checks on mutations.

With the backend running, start the integrated React frontend in a second
terminal:

```powershell
cd ..\project-1
npm.cmd run dev
```

## Development seed users

On non-testing startup, the application ensures that one administrator and one
client exist. These users are intended for local development and testing.

Administrator:

- Email: privately configured `ADMIN_SEED_EMAIL`.
- Password: the value configured through `ADMIN_SEED_PASSWORD`.
- Role: `admin`.

Client:

- Email: privately configured `CLIENT_SEED_EMAIL`.
- Password: the value configured through `CLIENT_SEED_PASSWORD`.
- First and last name: `CLIENT_SEED_FIRST_NAME` and `CLIENT_SEED_LAST_NAME`.
- Role: `client`.

Configure seed identities/passwords privately, use different passwords, and
never commit `.env`. Startup checks nonblank/different seed passwords; it does
not run the registration password-strength validator for seed accounts.
Repeated startup does not duplicate users or roles and
does not reset or overwrite an existing user's password, profile, active state,
or role. Startup raises a seed conflict if a configured email already belongs
to a user with a different role.

If a seed password changes after its user already exists, the database still
contains the previous password hash. Update that development user's password
through a separately approved account-maintenance process; restarting alone
does not rotate existing passwords. SQLAlchemy failures during seeding are
rolled back and suppressed, so successful process startup does not prove seed
accounts exist. A role conflict does propagate. There is no production-only
seed-disable switch; all non-testing factory loads attempt seeding.

Phase 4 implements frontend cart, checkout, and owner confirmation with invoice
data. Backend registration exists; frontend registration and user-management UI
remain outside scope. The frontend has no standalone invoice-management or
email-retry page. Real payments, coupons, and multiple saved addresses are absent.

## Migrations

Migration generation and application are separate approval gates. After an
approved model change, a developer may generate a migration:

```powershell
.venv\Scripts\python -m flask --app run.py db migrate -m "message"
```

After review, a verified recoverable backup, and deployment approval, a developer
may apply the existing revision chain (not executed here):

```powershell
.venv\Scripts\python -m flask --app run.py db upgrade
```

Review every migration, including manually authored ones, before applying it.
The CLI loads `run.py` and therefore attempts seeding before migration work.
Do not use it as a side-effect-free live-database status check. See
[database operations](docs/database.md) for the revision chain, first-start
behavior, backup requirements, and deliberately blocked Phase 4 downgrades.

## Main endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /products`
- `GET /products`
- `GET /products/<product_id>`
- `PUT /products/<product_id>`
- `DELETE /products/<product_id>`
- `GET /cart`
- `POST /cart/items`
- `PUT /cart/items/<item_id>`
- `DELETE /cart/items/<item_id>`
- `POST /sales/checkout`
- `GET /sales/<sale_id>/confirmation`
- `POST /sales/<sale_id>/email/retry`
- `POST /sales/<sale_id>/cancel`
- `POST /sales/<sale_id>/return`
- `GET /invoices`
- `GET /invoices/<invoice_id>`

See `docs/endpoints.md` for request and response details.

Phase 4 checkout now requires buyer JSON with a text `shipping_address`, product ID/quantity
`items`, a canonical two-decimal `total_amount` snapshot, and an
`Idempotency-Key` header. It persists purchase snapshots, locks stock rows,
and supports owner-only `GET /sales/<sale_id>/confirmation`. See
[the checkout contract](docs/checkout.md) for exact examples, status codes,
transaction semantics, and validation limits. Confirmation email is opt-in; see
[SMTP configuration and delivery semantics](docs/email.md).
This implemented contract differs from the repository's structured-address,
buyer-only requirement. The items/total fields are comparison snapshots;
database prices remain authoritative. No API change was made to resolve this
mismatch in this documentation task.
The checkout and email migrations are present through `c91f6d2a804e`.
No migration was applied or live database revision inspected in this update;
do not infer runtime schema readiness from source files or SQLite tests.

## Email configuration

Names: `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY`,
`SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SENDER`, and `SMTP_TIMEOUT_SECONDS`.
The template keeps delivery disabled and addresses/credentials blank. Use
verified TLS SMTP configuration privately before enabling delivery. `sent`
means SMTP acceptance, not confirmed inbox delivery; disabled delivery stays
pending. Expected email failure never undoes a committed purchase. Retry uses
the existing sale, with a three-attempt cap and 60-second cooldown. See
[email state and recovery](docs/email.md); no live SMTP delivery is claimed.

## Configuration and operational limits

Backend code reads configuration at import/startup; restart after an approved
change. `APP_PORT` is not read and `FLASK_ENV` is obsolete here. Select the port
with `--port`; `run.py` and VS Code's run task enable development debug mode.
Production requires a reviewed non-debug WSGI deployment, TLS, explicit CORS
origins, private secrets, and a deliberate seed-account policy.

The configured development origins are the two Vite origins above plus port
8080 on 127.0.0.1; headers include Content-Type, Authorization, and
Idempotency-Key. Other origins, including default preview port 4173, are not
automatically permitted. CORS is not authorization.

Routes usually return application envelopes, but health and native JWT errors
are exceptions. Unexpected non-checkout failures have no global JSON sanitizer.
Never enable debug mode or raw HTTP/SMTP/SQL payload logging in production.
See [the operational guide](../docs/phase-4-operations.md) for state,
trust boundaries, browser key-loss risks, and the role-based manual matrix.

## Tests and lint

These are repeatable isolated validation commands; actual results for this
documentation update are recorded in [testing](docs/testing.md#documentation-validation-record).
They do not start a live server, send mail, or verify a deployed schema.

Run tests:

```powershell
.venv\Scripts\python -m pytest
```

Run lint:

```powershell
.venv\Scripts\python -m ruff check .
```

Run both through VS Code:

```text
Terminal > Run Task > validate
```

## Documentation

- `docs/architecture.md`
- `docs/database.md`
- `docs/endpoints.md`
- `docs/cache.md`
- `docs/redis-insight.md`
- `docs/testing.md`
- `docs/workflows.md`

## Delivery notes

Do not commit secrets, virtual environments, local tooling configuration, or
generated caches. The repository ignore rules cover those local artifacts.
