# Development Workflows

Use this file as the operational workflow for project development.

## Setup workflow

These are developer-run steps, not commands executed by this documentation task.
Use installed dependencies; obtain approval before provisioning/installing.

1. Verify the existing virtual environment and Node dependencies.
2. If missing, obtain approval for dependency/environment installation.
3. Configure `.env.example` variable names privately with `.env` edit approval.
4. Generate separate `SECRET_KEY` and `JWT_SECRET_KEY` values. Configure strong,
   different `ADMIN_SEED_PASSWORD` and `CLIENT_SEED_PASSWORD` values. Never
   commit `.env` or reuse secrets between environments.
5. Configure PostgreSQL; leave Redis/email disabled unless explicitly configured.
6. Review migrations, backups, seed side effects, and rollout in [database](database.md); apply only after separate approval.
7. Run the app.
8. Validate with lint and tests.

## VS Code tasks

Available tasks:

- `create-venv`: create `.venv`.
- `install`: install dependencies.
- `run`: start Flask in debug mode.
- `test`: run pytest.
- `lint`: run ruff.
- `format`: run ruff format.
- `db-init`: initialize migrations if `migrations/` does not exist.
- `db-migrate`: create an Alembic migration.
- `db-upgrade`: apply migrations.
- `db-downgrade`: invokes downgrade; Phase 4 downgrades intentionally raise.
- `validate`: run lint, then tests.

Tasks exist in `.vscode/tasks.json`, but their presence does not grant approval
for installation, generation, upgrade, downgrade, or formatting unrelated work.
Migration tasks load the application and can attempt seeding before running.

## Feature workflow

1. Read the current project documentation and operational guide.
2. Inspect existing module patterns.
3. Add or update models only when schema is needed.
4. Add schema validation.
5. Add repository methods.
6. Add service logic.
7. Add route Blueprint.
8. Register Blueprint in the application factory.
9. Add or update tests.
10. Generate and review migration if schema changed.
11. Run `validate`.
12. Update docs.

## Project guidance

Use the [Phase 4 operational guide](../../docs/phase-4-operations.md), the
frontend/backend READMEs, and the module contracts in this documentation folder.
These describe implemented behavior and the remaining deployment checks.

## Approval boundaries

Ask before:

- Installing dependencies.
- Generating or applying migrations.
- Deleting files.
- Dropping database objects.
- Changing authentication strategy.
- Changing the role model.
- Changing public API response shape.
- Modifying `.env`.
- Committing changes.

## Recommended implementation order

1. Database models and first migration.
2. Authentication, users, and roles for login and permissions.
3. Products.
4. Cart.
5. Sales checkout.
6. Invoices.
7. Redis cache.
8. Tests.
9. Final docs and review.

## Current React integration workflow

Phase 4 supersedes older frontend exclusions. The current backend
checkout contract and migration deployment gates are documented in
[checkout](checkout.md). Do not deploy the new backend before reviewing and
approving both additive checkout/email migrations. This documentation update
applies none and does not inspect a live applied revision. The
email transport is disabled by default; see [email setup](email.md).

React consumes authentication, public/admin products, client cart, checkout,
and owner-only confirmation with invoice data. Backend email retry and
invoice/cancellation/return APIs exist without dedicated frontend controls.
Frontend registration, user management, and real payments remain outside scope.

Run the backend:

```powershell
cd "Pets ECommerce"
.venv\Scripts\python -m flask --app run.py run --debug --port 5000
```

Run the frontend in a second terminal:

```powershell
cd project-1
npm.cmd run dev
```

Validate both projects before delivery:

```powershell
cd "Pets ECommerce"
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .
cd ..\project-1
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

The [operational guide](../../docs/phase-4-operations.md) supplies
the public/client/admin manual matrix and documents key-loss, stock, delivery,
SPA hosting, and logging limits. The [validation record](testing.md#documentation-validation-record)
lists actual commands executed for this update. These start commands are not
a record of live service, SMTP, or migration verification.
