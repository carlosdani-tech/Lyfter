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