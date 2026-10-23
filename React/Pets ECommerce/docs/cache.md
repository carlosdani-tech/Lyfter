# Redis Cache

This project optionally uses a configured Redis service (including Redis Cloud)
for public product responses. `REDIS_ENABLED=false` is the safe default.

**Redis Insight Desktop** is used only as a visual tool to inspect, debug, and manage cache keys during development.

The Flask application connects directly to Redis Cloud through environment variables.

Redis Insight Desktop does not run the cache and is not required by the Flask application at runtime.

## Cache architecture

```text
Flask App -> Redis Cloud
Redis Insight Desktop -> Redis Cloud
```

Incorrect flow:

```text
Flask App -> Redis Insight Desktop
```

Redis Insight Desktop is only used to visualize and inspect the Redis Cloud database.

## Redis configuration

Redis is configured in:

```text
app/__init__.py
```

through:

```text
app.extensions.redis_client
```

The application must use environment variables to connect to Redis Cloud.

## Environment variables

Names: `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`,
`REDIS_PASSWORD`, `REDIS_DEFAULT_TTL_SECONDS`, `REDIS_KEY_PREFIX`, `REDIS_SSL`,
`REDIS_SOCKET_CONNECT_TIMEOUT`, and `REDIS_SOCKET_TIMEOUT`. Supply endpoint
and authentication privately through approved environment configuration.
The template disables Redis, leaves credentials blank and uses port zero.
Testing also disables Redis automatically. Missing/placeholder host or a
nonpositive port prevents client creation; network operations occur when the
cache helpers run, not as a startup connection test.

The `.env.example` file must contain only example values.

Use `REDIS_ENABLED=false` for local development when Redis Cloud is not configured. This is also the safest default when the variable is missing. With Redis disabled, cached endpoints continue by reading from PostgreSQL. Set `REDIS_ENABLED=true` only after replacing the placeholder host and port with real Redis Cloud values.

The Redis socket timeouts should stay low, for example `1`, so cache connection failures fail fast and the API can continue without cached data.

Never commit the real `.env` file.

## Redis Insight Desktop

Redis Insight Desktop must connect to the same Redis Cloud database used by the Flask app.

Use the privately configured host, port, database, TLS, and authentication in
the inspection tool. Do not publish its connection details.

Redis Insight Desktop is used to verify:

* cache keys exist
* cache keys have TTL
* cached values are valid JSON
* cache is invalidated after product changes
* cache is regenerated after calling cached endpoints again

## Cache key convention

All cache keys must use this format:

```text
pet_ecommerce:<module>:<resource>:<identifier>
```

Examples:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

Do not use generic keys like:

```text
products:list
products:detail:<product_id>
```

`pet_ecommerce` is the default `REDIS_KEY_PREFIX`; literal key examples below
assume that default, not a hardcoded deployment prefix.

## Implemented cached endpoints

| Endpoint                 | Cache key                                    | TTL                         |
| ------------------------ | -------------------------------------------- | --------------------------- |
| `GET /products`      | `pet_ecommerce:products:list`                | `REDIS_DEFAULT_TTL_SECONDS` |
| `GET /products/<id>` | `pet_ecommerce:products:detail:<product_id>` | `REDIS_DEFAULT_TTL_SECONDS` |

## Implemented scope

Only product list/detail data is cached. Invoices, sales, confirmations, carts,
buyer/shipping snapshots, idempotency keys/fingerprints, and email delivery
state/content are not cached. Invoice caching is not an implemented option.

## Do not cache

Never cache:

* passwords
* password hashes
* JWT tokens
* login responses
* private user data
* private cart data
* sensitive admin-only responses
* payment-sensitive data

## Implemented keys

Required product cache keys:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

## TTL rules

All cached values must have a TTL.

The default TTL is controlled by:

```env
REDIS_DEFAULT_TTL_SECONDS=300
```

This means cached values expire after 5 minutes by default.

## Product cache invalidation rules

Product cache must be invalidated after:

* product create
* product update
* product delete or deactivate
* stock change
* purchase
* return or cancellation

Checkout, cancellation and return invalidate affected product list/detail keys
after commit. Checkout replay performs no stock write. Buyer/shipping snapshots,
idempotency keys, fingerprints, and confirmation responses are never cached.
Redis failures retain best-effort invalidation and TTL fallback behavior.

Email delivery status, attempt metadata, recipients, and message content are
never cached. Email retries do not change stock or require product invalidation.

Normal mutation invalidation targets the list key and affected detail key:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

`invalidate_product_cache(None)` additionally scans detail keys with this
pattern; it is not a database flush:

```text
pet_ecommerce:products:detail:*
```

## Redis Insight Desktop verification

Developer-run checks below were not executed by this documentation task.
Use an approved test Redis/database setup and existing data; do not mutate
products or manually delete keys without authorization. Redis errors are
swallowed by cache helpers: reads fall back to SQL, writes/invalidation are
best effort. Failed invalidation can leave stale public data until TTL expiry;
checkout revalidates stock and price from locked SQL rows, never Redis.
Consequently, a stale cached catalog price can differ from the cart total.
Checkout compares the submitted cart/total snapshot with current SQL state and
returns 409 on mismatch; it never uses Redis or the submitted amount to set prices.

### Verify product list cache

1. Run the Flask app.
2. Call:

```text
GET /products
```

3. Open Redis Insight Desktop.
4. Search for:

```text
pet_ecommerce:products:list
```

5. Confirm:

   * the key exists
   * the key has TTL
   * the value is valid JSON

### Verify product detail cache

1. Call:

```text
GET /products/<product_id>
```

2. Open Redis Insight Desktop.
3. Search for:

```text
pet_ecommerce:products:detail:<product_id>
```

4. Confirm:

   * the key exists
   * the key has TTL
   * the value is valid JSON

### Verify invalidation

After creating, updating, deleting, deactivating, or changing stock for a product:

1. Open Redis Insight Desktop.
2. Search for:

```text
pet_ecommerce:products:*
```

3. Confirm old product cache keys were removed.
4. Call the product GET endpoint again.
5. Confirm the cache key is recreated.

## Troubleshooting

### Product endpoint works but no key appears

Check:

* Flask is using the correct `REDIS_HOST`
* Flask is using the correct `REDIS_PORT`
* Flask is using the correct `REDIS_PASSWORD`
* `REDIS_KEY_PREFIX` is set to `pet_ecommerce`
* the endpoint actually calls the cache service
* Redis Insight Desktop is connected to the same Redis Cloud database used by Flask

### Redis connection fails from Flask

Check:

* Redis Cloud host is correct
* Redis Cloud port is correct
* Redis password is correct
* `.env` is loaded correctly
* `REDIS_PASSWORD` exists in `app/config.py`
* the Redis client in `app/__init__.py` passes the password
* `REDIS_SSL=true` is set if Redis Cloud requires SSL/TLS

### Keys disappear too quickly

Check:

* `REDIS_DEFAULT_TTL_SECONDS`
* cache invalidation logic
* whether the product endpoint is being modified during testing

