# Development Workflows

Use this file as the operational workflow for Codex CLI and VS Code development.

## Setup workflow

1. Create the virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env`.
4. Configure PostgreSQL and Redis locally.
5. Run migrations after models exist.
6. Run the app.
7. Validate with lint and tests.

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
- `db-downgrade`: rollback one migration.
- `validate`: run lint, then tests.

Prefer these tasks over ad hoc commands.

## Feature workflow

1. Read `AGENTS.md`.
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

## Codex skills

For the current React + Flask integration phase, use the workspace skill and guides:

- `../.codex/skills/pet-ecommerce-integration/SKILL.md`
- `../AGENTS.md`
- `../docs/codex-implementation-guide.md`
- `../docs/codex-prompts.md`

The older backend-specific skills listed in previous project notes may not be installed in every environment. Prefer the integration guide above unless the user explicitly asks for backend-only expansion.

## Approval boundaries

Ask before:

- Installing dependencies.
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

The React frontend currently consumes only authentication and product endpoints.
Cart, checkout, sales, invoices, and user management are not part of this
frontend phase.

Run the backend:

```powershell
cd "Pets ECommerce"
.venv\Scripts\python -m flask --app run.py run --debug
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
```
