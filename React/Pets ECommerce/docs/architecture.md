# Architecture

This project uses a layered Flask architecture.

## Application entry points

- `run.py`: creates the Flask app.
- `app/__init__.py`: application factory and extension initialization.
- `app/config.py`: environment-based configuration.
- `app/extensions.py`: shared Flask extensions.

## Required package layout

- `app/models/`: SQLAlchemy ORM models.
- `app/routes/`: Flask Blueprints and HTTP-only concerns.
- `app/services/`: business logic and transaction orchestration.
- `app/repositories/`: database access through SQLAlchemy ORM.
- `app/schemas/`: request payload validation.
- `app/decorators/`: JWT and role protection.
- `app/utils/`: shared response, cache, and helper functions.
- `tests/`: pytest API and unit tests.
- `docs/`: project documentation.

## Rules

- Keep route handlers thin.
- Put business rules in services.
- Put database reads and writes in repositories.
- Use SQLAlchemy ORM for app database operations.
- Use Alembic migrations for schema changes.
- Return consistent JSON responses.
- Do not expose stack traces in API responses.

## Implemented modules

- Authentication, users, and roles for login, JWT identity, permissions, and ownership checks.
- Products.
- Cart.
- Sales.
- Invoices.
- Redis cache.
- Synchronous post-commit confirmation email, persisted claims/status, and owner-only retry.
- Tests and documentation.

There is no user management CRUD module in this project scope.

Phase 4 checkout uses a schema allowlist, owner/cart/item/product row locks in
repositories, and one service-owned transaction for purchase snapshots,
sale/items/invoice, stock, and cart closure. All cart writes share the owner
lock. Cancellation/return lock the sale and products before stock restoration;
admin product changes share product locks. Product cache invalidation follows
commit. No buyer snapshots are cached. The injectable confirmation-email service
claims delivery after purchase commit and persists its outcome separately; see
[email architecture and recovery](email.md).
See [checkout](checkout.md) for idempotency and the PostgreSQL validation limits.

## Frontend and trust boundaries

The React entry point is `project-1/src/main.jsx` in the workspace. Provider
order is BrowserRouter, AuthProvider, CartProvider, CheckoutProvider, then App.
Router owns URLs; contexts own session, authoritative cart snapshots/queue,
and local purchase attempt state respectively. HTTP code stays in `src/api/`.
The frontend never chooses a role or an authoritative purchase amount.
Checkout does send `items` and `total_amount` comparison snapshots and a text
address. The backend requires them, checks them against the locked cart/current
prices, and persists its own calculation. This differs from the buyer-only,
structured-address requirement in repository instructions; see the
[implementation guide](../../docs/codex-implementation-guide.md#executed-validation-versus-deployment-readiness).

Backend blueprints are registered by `app/routes/__init__.py`. JWT/role checks
and service ownership rules remain authoritative. Checkout revalidates the
persisted active client under an owner-row lock. Other protected role checks
generally read the JWT claim; frontend logout does not revoke that token.
Admin invoice access is broader than client confirmation access and includes
private purchase snapshots. Logs must exclude buyer/address payloads, keys,
tokens, credentials, raw provider responses, and exception stacks.

Application handled responses use `app/utils/responses.py`. Native JWT errors
and health endpoints retain their framework/plain-object formats; there is no
global handler converting every unexpected failure into the application envelope.
Production must disable debug mode and review logging/error boundaries.

## Runtime lifecycle and deployment limits

`app/config.py` loads environment configuration at import. The factory validates
required security/seed values, configures explicit development CORS, initializes
extensions/model metadata, installs the email service and optional Redis client,
registers routes, and attempts seeding for all non-testing instances. It does
not apply migrations. SQLAlchemy seed failures roll back silently; role conflicts
propagate. See [database gates](database.md) before using CLI application loads.

Purchase commit precedes cache invalidation and synchronous SMTP. Expected mail
failures are contained, but unexpected programming errors after commit can
still fail the HTTP response; same-key replay recovers the existing purchase.
Redis failure falls back to database reads/best-effort invalidation, with a
possible stale-cache window until TTL. No cart, purchase, buyer, or mail state
is cached. No background email worker, token-revocation service, browser
cross-tab lock, or production SPA/WSGI deployment is supplied by this architecture.
