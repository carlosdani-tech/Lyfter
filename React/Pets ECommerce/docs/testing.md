# Testing

pytest is the required test runner.

Commands below run from `Pets ECommerce` unless explicitly marked frontend.
They are available procedures; actual execution for this documentation update
is recorded separately at the end. Do not install missing dependencies without
approval or mistake test setup for deployment/migration validation.

## Run tests

Using VS Code:

```text
Terminal > Run Task > test
```

Manual command:

```powershell
.venv\Scripts\python -m pytest
```

## Run lint

Using VS Code:

```text
Terminal > Run Task > lint
```

Manual command:

```powershell
.venv\Scripts\python -m ruff check .
```

## Validate

Using VS Code:

```text
Terminal > Run Task > validate
```

Manual commands:

```powershell
.venv\Scripts\python -m ruff check .
.venv\Scripts\python -m pytest
```

## Required coverage

- Authentication.
- Role permissions.
- Product CRUD.
- Cart operations.
- Stock validation.
- Sales flow.
- Invoice creation.
- Redis cache behavior where practical.

Phase 4 checkout validation is detailed in [checkout](checkout.md). Run the focused suite:

```powershell
.venv\Scripts\python -m pytest tests/test_sales_invoices.py
```

Coverage includes snapshots/Decimal totals, malformed and spoofed fields,
idempotency conflicts/replays, isolated ownership, rollback after invoice flush,
active-cart/key uniqueness, stale stock refresh, and PostgreSQL lock SQL/order.
The default database remains in-memory SQLite. These tests do not prove
simultaneous PostgreSQL contention; validate that separately in an approved
disposable environment. No migration is applied by the tests. Email and checkout
tests run with SMTP constructors and socket connections blocked by default.
See [email test coverage](email.md#validation).

## Test style

- Use Flask test client for API tests.
- Cover success and failure cases.
- Add regression tests for bugs.
- Do not test implementation details when API behavior is enough.

## Security configuration

The pytest fixtures supply isolated, deterministic test-only values for
`SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_SEED_PASSWORD`, and
`CLIENT_SEED_PASSWORD`. These critical values and the database URI do not use
production credentials. The imported Config still calls `load_dotenv` for
other inherited settings, so the entire process is not a hermetic environment.
Runtime startup rejects missing, empty, and
whitespace-only values for any of these variables. Seed tests verify both roles,
password hashing, login, authorization, idempotency, and role-conflict handling.

`tests/conftest.py` overrides the database URI to in-memory SQLite. It creates
and drops only disposable test tables; it does not run Alembic upgrades or
touch the configured development PostgreSQL data. TESTING disables normal
factory seeding and Redis. The autouse network guard blocks SMTP constructors
and socket connections; adapter tests use mocks. No live email is sent.

From `project-1`, the actual frontend scripts are:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The test script lists seven files under tests/auth, tests/routing, tests/api,
tests/cart, and tests/checkout explicitly for Windows portability. It uses
Node's built-in runner, Vite SSR, mocked fetch, and simulated state/handlers.
It covers current copy, labels, guards, API contracts, races, stock feedback,
attempt locking, ambiguity, confirmation and accessibility markup. It is not
a rendered-browser test. Each Vite middleware server is closed by test cleanup.

## Documentation validation record

This section records this documentation update only. Earlier audit documents
retain their earlier session counts and must not be read as current totals.
Executed against the unchanged implementation in this workspace:

| Working directory | Command/check | Actual result |
| --- | --- | --- |
| `project-1` | `npm.cmd test` | Seven files; 117 passed, 0 failed/cancelled/skipped |
| `project-1` | `npm.cmd run lint` | Exit 0 |
| `project-1` | `npm.cmd run build` | Exit 0; 78 modules transformed |
| `Pets ECommerce` | `.venv\Scripts\python -m pytest` | 177 passed in 43.81 seconds |
| `Pets ECommerce` | `.venv\Scripts\python -m ruff check .` | Exit 0; all checks passed |
| Workspace | `git diff --check` | Exit 0; no whitespace errors |
| Workspace | Source/Markdown consistency inspection | 11 frontend routes, 26 backend route entries, 31 template/config variable names, approved checkout fields, five revision files, and seven test paths matched source |
| Workspace | Local Markdown link check | 50 local links in changed docs resolved |
| Workspace | Pre-edit snapshot comparison | Only documentation and `.env.example` changed; source/tests/migrations/manifests preserved |

Obsolete-scope/environment/endpoint/command searches found no current claim
that checkout is a placeholder or excluded, no payment-confirmation flow, no
credential assignment in the template, and no APP_PORT/FLASK_ENV assignment.
Broad searches still find legitimate admin cart-denial descriptions and the
explicitly marked historical prompt archive. Those are not current exclusions.
Earlier audit result counts were intentionally retained as historical evidence.

Not executed: installing dependencies, `.env` editing, starting live Flask/Vite,
querying a live database revision, migration generation/upgrade/downgrade,
PostgreSQL contention, backup restoration, live Redis Insight, SMTP, real
purchases, production deployment, and the role-based browser matrix. Use the
[guide's manual matrix](../../docs/phase-4-operations.md#role-based-manual-acceptance-matrix)
in an approved test environment. Passing SQLite/mocked tests is not proof of
those operational checks.
