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
attempt locking, ambiguity, confirmation and accessibility markup. Cart/checkout
tests also mount actual providers with ReactDOM `createRoot` and `act` using
`tests/helpers/providerHarness.mjs`. This minimal provider host exercises effects,
batching, StrictMode and cleanup, but does not render application DOM or verify
browser layout. Each Vite middleware server is closed by test cleanup.

## Documentation validation record

This section records the 2026-10-20 documentation update only. Earlier audit documents
retain their earlier session counts and must not be read as current totals.
Executed against the unchanged implementation in this workspace:

| Working directory | Command/check | Actual result |
| --- | --- | --- |
| `project-1` | `npm.cmd test` | Seven files; 148 passed, 0 failed/cancelled/skipped |
| `project-1` | `npm.cmd run lint` | Exit 0 |
| `project-1` | `npm.cmd run build` | Exit 0; 80 modules transformed |
| `Pets ECommerce` | `.venv\Scripts\python -m pytest` | 253 passed in 67.90 seconds |
| `Pets ECommerce` | `.venv\Scripts\python -m ruff check .` | Exit 0; all checks passed |
| Workspace | `git diff --check` | Exit 0; no whitespace errors |
| Workspace | Source/Markdown consistency inspection | Compared App routes/guards, providers/API modules, backend routes/schemas/services/config, revision files and package scripts; corrected text-address/items/total contract and fingerprint/retry descriptions |
| Workspace | Work preservation | Existing staged implementation, tests, docs and deletions retained; this session edits only Markdown and `.env.example` |
| Workspace | Local Markdown target check | 55 relative links resolved; no missing file targets (anchors not checked) |
| Workspace | Environment template/config check | All 31 template variable names occur in `app/config.py`; credential fields remain blank |

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

## Consistency evidence and outstanding mismatch

| Documented behavior | Implementation evidence |
| --- | --- |
| Public/admin/client routes and guards | `project-1/src/App.jsx`, `components/routing/RouteGuards.jsx` |
| Memory-only auth, expiry and stale-request isolation | `project-1/src/context/AuthProvider.jsx`, `authSession.js` |
| Cart queue, server totals and session reset | `project-1/src/context/CartProvider.jsx`, `cartSession.js`; `app/services/cart_service.py` |
| Text address and items/total request snapshots | `project-1/src/api/checkoutValidation.js`; `app/schemas/sale_schema.py` |
| Snapshot conflict versus same-attempt retry | `project-1/src/context/CheckoutProvider.jsx`, `checkoutSession.js` |
| Atomic purchase and full-request fingerprint | `app/services/sale_service.py`; cart/product/user/sale repositories |
| Post-commit delivery, bounded claims and safe logging | `app/services/email_service.py`, `email_transport.py`; `app/repositories/email_repository.py` |
| Explicit CORS and startup seeding | `app/__init__.py`, `app/config.py`, `app/utils/seed.py` |
| Revision chain and blocked Phase 4 downgrade | `migrations/versions/` through `c91f6d2a804e` |
| Executable validation commands | `project-1/package.json`, backend `pyproject.toml`, `.vscode/tasks.json` |

Paths beginning `app/` or `migrations/` are backend-relative; frontend context
and component companion filenames are relative to their named directory.
The implemented text address and mandatory items/total snapshots differ from
repository instructions requiring a structured address and buyer-only input.
This is reported as a functional mismatch, not silently corrected in code.

Repository tracking note: root `README.md` and
`docs/codex-implementation-guide.md` are ignored by existing `.gitignore` rules.
They were updated locally without changing ignore rules or staging anything.
The tracked `docs/phase-4-operations.md` retains the operational content for
review. A future approved commit must explicitly decide whether to include the
ignored documents; normal staging omits them.
