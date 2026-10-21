# Confirmation email

Checkout persists the purchase before attempting email. SMTP is opt-in and uses
Python's standard library; no SDK, queue, or new dependency is required. The
application factory accepts `email_transport=` for injection and registers
`app.extensions["email_service"]`. `EmailService` owns delivery orchestration,
`EmailRepository` owns conditional claims/outcome writes, and `SMTPTransport`
owns only SMTP. Services and tests can replace the transport without networking.

## Configuration

Supply runtime values privately through deployment configuration. The updated
`.env.example` leaves credentials and mail addresses blank and delivery disabled;
the real `.env` is not edited by this documentation task. No SMTP connection or
live delivery has been verified. Invalid/missing SMTP configuration must never
be documented as successful email delivery.

| Variable | Default | Meaning |
| --- | --- | --- |
| `EMAIL_ENABLED` | `false` | Explicit delivery opt-in |
| `SMTP_HOST` | empty | SMTP hostname; empty/`.invalid` placeholders are rejected |
| `SMTP_PORT` | `587` | Integer port, 1–65535 |
| `SMTP_SECURITY` | `starttls` | Exactly `starttls` or `ssl`; plaintext mode is rejected |
| `SMTP_USERNAME` | empty | Optional authentication username |
| `SMTP_PASSWORD` | empty | Optional secret; configure both username/password or neither |
| `SMTP_SENDER` | empty | Bare ASCII sender mailbox; no display name, CR/LF, or address list |
| `SMTP_TIMEOUT_SECONDS` | `10` | Finite socket connection/read/write timeout, 1–60 seconds |

STARTTLS upgrades the connection before authentication or DATA. SSL uses implicit
TLS from connection establishment. Both use the default verifying TLS context,
including certificate and hostname validation. The timeout applies to blocking
socket operations, not a total request deadline; system DNS resolution remains
subject to the host resolver. No SMTP debug logging is enabled.

Missing/invalid configuration does not block purchase persistence. Disabled email
remains `pending` with internal code `disabled` and zero attempts. Missing sender
fails validation before a claim; other invalid SMTP settings are recorded as
`failed/configuration` without making a connection. Configuration is deliberately
checked at delivery, so a bad mail configuration cannot prevent checkout.

## Content and privacy

The message is Spanish UTF-8 plain text. It includes the invoice and order
reference, immutable item names, quantities, unit prices, line subtotals,
subtotal, taxes, total, and shipping address. It uses purchase snapshots rather
than current product data. No HTML is emitted. Recipient and sender are
validated as single bare ASCII mailboxes before header construction and again
at the SMTP boundary. Subject and message ID use server-owned purchase data.
With the same configured sender, a purchase retains a deterministic `Message-ID` across retries;
this is a useful reference, not a provider guarantee of deduplication.

Only `email_status` is added to serialized sales, including the invoice's nested
sale: `pending`, `sent`, or `failed`. Internal attempt count, in-flight marker,
last-attempt/sent timestamps, and bounded error codes are not returned. They
contain no credentials, raw provider responses, recipients, or message bodies.
Logs use fixed messages and allowlisted error codes, without exception details,
personal payloads, tokens, credentials, message content, or stack traces.
Purchase and delivery records are never cached.

## Delivery and retry state machine

1. Checkout commits sale/items, invoice, stock, and cart closure with email
   `pending`. A failed purchase never attempts email.
2. After commit, the service locks the persisted sale and checks purchase state,
   delivery status, attempt limit, and cooldown. It conditionally increments
   attempts and sets `pending` plus `email_in_flight=true`, then commits this
   claim before SMTP. No database row lock is held during network operations.
3. SMTP acceptance records `sent`, clears the claim and error code, and stores
   the sent timestamp in another transaction. `sent` means SMTP acceptance,
   not inbox delivery or absence of later bounces.
4. Expected transport errors record `failed`, clear the claim, and store only
   an allowlisted code. Authentication, connection, TLS negotiation, and explicit
   sender/recipient/DATA rejection are retry-safe. A timeout or disconnect during
   DATA is `delivery_unknown`: acceptance may already have occurred.
5. A browser checkout replay returns the same purchase and its current delivery
   status without attempting delivery. It never creates another sale/invoice,
   decrements stock again, or sends another message.

Explicit retry:

```http
POST /sales/<sale_id>/email/retry
Authorization: Bearer <owning_client_token>
```

No recipient, content, or purchase overrides are accepted or used. This endpoint
does not run checkout and does not need a new checkout idempotency key. It is
bound to the existing owner-only sale and its persisted checkout key. Missing
authentication returns `401`, non-client roles `403`, and another owner's or
missing purchase `404`. Authorized calls return `200` with the standard
`{"data":{"sale":...,"invoice":...}}` confirmation envelope and current
`sale.email_status`, even when sending is skipped or fails. Checkout continues
to return `201` on expected SMTP failures.

Retries require a completed purchase and a safe failure (or unsent pending
purchase). They have a 60-second cooldown and a hard lifetime cap of three
claimed attempts. Repeated/concurrent retry calls cannot claim a message while
one is in flight; calls after `sent` do nothing. Disabled delivery does not
consume attempts. Fixing configuration does not automatically send old pending
or failed messages; request an explicit authorized retry. Cancelled/returned
sales are not sent or retried. A cancellation racing after a committed delivery
claim can occur while its already-authorized message is being sent.

SMTP cannot provide exactly-once delivery. This implementation favors avoiding
duplicate messages: `delivery_unknown` is never automatically or explicitly
retried by the HTTP endpoint. If the process crashes after claiming, or the
outcome cannot be persisted, the durable claim remains `pending/in_flight` and
also blocks retries. No lease expiry or automatic claim reset exists. An
operator must reconcile provider acceptance before any separately approved
state repair; never reset a claim blindly. Crashes between purchase commit and
claim leave an unsent pending purchase that can use the explicit retry endpoint.

Unexpected programming errors propagate rather than being misreported as SMTP
failures. The purchase remains committed and the claim remains fenced. A later
checkout replay retrieves that purchase. Database errors in the delivery flow
are logged safely and leave the last durable state; they never rerun checkout.

## Schema and deployment

The email fields are additive on `sales`: `email_status`, `email_attempts`,
`email_in_flight`, `email_last_attempt_at`, `email_sent_at`, and `email_error_code`.
Defaults preserve legacy rows as pending with zero attempts; historical sales
without a persisted checkout key are not sent. The existing checkout migration
remains unchanged by this documentation task. The additive migration
`c91f6d2a804e_add_email_delivery_state.py` follows `b72e4a9f1036` and adds only
these six email columns and their four check constraints. Its live applied state
was not inspected; this documentation update applies no migration. See
[database deployment gates](database.md) for backup, rollout, and rollback.
Downgrade deliberately raises rather than deleting delivery records; removal
requires a separately reviewed destructive migration.

Constraints allow only the three states, zero through three attempts, allowlisted
error codes, and internally consistent sent/in-flight metadata. These bounds
prevent raw provider text or invalid states from being persisted. Existing
purchase uniqueness and stock constraints remain unchanged. Production rollout
requires an approved migration, verified SMTP host/TLS/sender/authentication,
appropriate sender DNS/reputation settings, disabled Flask debug mode, and an
operator procedure for ambiguous claims. There is no background queue, scheduler,
bounce processing, or provider status polling in this implementation.

## Validation

Commands below are repeatable procedures. Current executed results are recorded
in [testing](testing.md#documentation-validation-record); they use injected or
mocked transports. No SMTP configuration, acceptance, or inbox delivery was
verified during this documentation update. Keep `EMAIL_ENABLED=false` until
an approved isolated SMTP check establishes the intended configuration.

```powershell
.venv\Scripts\python -m pytest tests/test_email.py tests/test_sales_invoices.py
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .
```

An autouse test fixture blocks SMTP and SSL-SMTP constructors and
`socket.create_connection`. Adapter tests replace constructors with mocks while
the socket guard remains active. Other tests inject recording/error transports.
No test sends email or uses real recipients; addresses use example domains.
Tests verify Spanish content, recipient/sender/subject, purchase/claim commit
before send, TLS and timeout configuration, safe failures and logs, disabled and
invalid config, bounded retry transitions, replay isolation, owner/client
permissions, in-flight fencing, programming/database failures, and constraints.
SQLite proves application behavior and conditional claims; simultaneous
PostgreSQL contention and actual SMTP/provider behavior still require an
approved isolated integration environment. No live migration is run by tests.


Shipping display uses `format_shipping_address` in `email_service.py`. New
complete-address text snapshots retain internal line breaks and Spanish text.
Legacy object snapshots render only known address fields, skipping null/blank
or malformed values without printing Python object representations. The helper
does not mutate stored data. Checkout accepts text only; no city, province,
postal code, or country-code input is required. SMTP, claims, post-commit send,
and retry policies remain unchanged.
