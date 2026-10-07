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
- Invoice creation after checkout, invoice listing, and invoice detail access.
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
- Codex CLI

## Setup

Create the virtual environment:

```powershell
python -m venv .venv
```

Install dependencies:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and adjust local values. Do not commit real secrets or machine-specific passwords.

`SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_SEED_PASSWORD`, and
`CLIENT_SEED_PASSWORD` are required. Startup fails before extensions or seed
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

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pet_ecommerce_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

Create the database in PostgreSQL before running migrations. Application tables must be created through Flask-Migrate/Alembic migrations.

## Redis Cloud cache

Expected environment variables:

```env
REDIS_ENABLED=false
REDIS_HOST=your-redis-cloud-host
REDIS_PORT=your-redis-cloud-port
REDIS_DB=0
REDIS_PASSWORD=your-redis-cloud-password
REDIS_DEFAULT_TTL_SECONDS=300
REDIS_KEY_PREFIX=pet_ecommerce
REDIS_SSL=false
REDIS_SOCKET_CONNECT_TIMEOUT=1
REDIS_SOCKET_TIMEOUT=1
```

The Flask app connects directly to Redis Cloud. Redis Insight Desktop is only a visual inspection and debugging tool connected to the same Redis Cloud database; it is not part of the Flask runtime configuration. Do not add a Redis Insight URL to the application.

For local development without Redis Cloud, keep `REDIS_ENABLED=false`. Products still load from PostgreSQL when Redis is disabled. When real Redis Cloud values are configured, set `REDIS_ENABLED=true`; invalid placeholder host or port values are ignored so product endpoints continue without cache.

Restart the backend after changing `.env`; environment variables are loaded when the Flask process starts.

Troubleshooting: if `GET /products` stays pending or the frontend shows `El servidor tardo demasiado en responder`, set `REDIS_ENABLED=false` in `.env` and restart the backend. Use `REDIS_ENABLED=true` only when Redis Cloud host, port, password, and SSL settings are valid.

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
.venv\Scripts\python -m flask --app run.py db upgrade
.venv\Scripts\python -m flask --app run.py run --debug
```

Health check:

```text
GET http://127.0.0.1:5000/health
```

## React frontend integration

The React application in `../project-1` uses these endpoints in the current
integration phase:

- `POST /auth/login`
- `GET /products` (public)
- `POST /products` (admin Bearer token required)
- `PUT /products/<product_id>` (admin Bearer token required)
- `DELETE /products/<product_id>` (admin Bearer token required; soft delete)

The backend also exposes public `GET /products/<product_id>`. The current React
detail view uses the product selected from the backend-loaded catalog, so it
does not make a separate detail request. Both read endpoints return only active
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

- Email: `ADMIN_SEED_EMAIL` (defaults to `admin@example.com`).
- Password: the value configured through `ADMIN_SEED_PASSWORD`.
- Role: `admin`.

Client:

- Email: `CLIENT_SEED_EMAIL` (defaults to `client@example.com`).
- Password: the value configured through `CLIENT_SEED_PASSWORD`.
- First and last name: `CLIENT_SEED_FIRST_NAME` and `CLIENT_SEED_LAST_NAME`.
- Role: `client`.

Example local configuration:

```dotenv
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=<choose-a-strong-local-password>

CLIENT_SEED_EMAIL=client@example.com
CLIENT_SEED_PASSWORD=<choose-a-different-strong-local-password>
CLIENT_SEED_FIRST_NAME=Client
CLIENT_SEED_LAST_NAME=User
```

Replace every password placeholder, use different passwords for the two users,
and never commit `.env`. Repeated startup does not duplicate users or roles and
does not reset or overwrite an existing user's password, profile, active state,
or role. Startup raises a seed conflict if a configured email already belongs
to a user with a different role.

If a seed password changes after its user already exists, the database still
contains the previous password hash. Update that development user's password
deliberately or recreate the local seed data; restarting alone does not rotate
existing passwords.

Frontend registration, cart, checkout, sales, invoices, and user-management UI
are outside the current React integration phase. The corresponding advanced
backend modules remain documented below and in `docs/`.

## Migrations

Create a migration after model changes:

```powershell
.venv\Scripts\python -m flask --app run.py db migrate -m "message"
```

Apply migrations:

```powershell
.venv\Scripts\python -m flask --app run.py db upgrade
```

Review autogenerated migrations before applying them.

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
- `POST /sales/<sale_id>/cancel`
- `POST /sales/<sale_id>/return`
- `GET /invoices`
- `GET /invoices/<invoice_id>`

See `docs/endpoints.md` for request and response details.

## Tests and lint

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

Do not commit `.env`, `.venv/`, `AGENTS.md`, `.codex/`, `__pycache__/`, `.pytest_cache/`, or `.ruff_cache/`. These are already covered by `.gitignore`.
