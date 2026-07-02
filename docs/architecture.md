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

- Authentication, users, and roles for login, JWT identity, admin management, permissions, and ownership checks.
- Products.
- Cart.
- Sales.
- Invoices.
- Redis cache.
- Tests and documentation.

There is no user management CRUD module in this project scope.