# Testing

pytest is the required test runner.

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

## Test style

- Use Flask test client for API tests.
- Cover success and failure cases.
- Add regression tests for bugs.
- Do not test implementation details when API behavior is enough.

## Security configuration

The pytest configuration supplies isolated, deterministic test-only values for
`SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_SEED_PASSWORD`, and
`CLIENT_SEED_PASSWORD`. Tests do not depend on the developer's `.env` or
production credentials. Runtime startup rejects missing, empty, and
whitespace-only values for any of these variables. Seed tests verify both roles,
password hashing, login, authorization, idempotency, and role-conflict handling.
