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

Use local skills by task:

- `flask-api-builder`: API modules with routes, services, repositories, schemas, and models.
- `auth-review`: authentication, password hashing, JWT, roles, and permissions.
- `postgres-orm-review`: SQLAlchemy models, schema, relationships, indexes, and migrations.
- `redis-cache-review`: Redis keys, TTL, invalidation, and cache documentation.
- `api-test-generator`: pytest API tests for implemented endpoints.
- `final-project-review`: final requirement review before delivery.

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