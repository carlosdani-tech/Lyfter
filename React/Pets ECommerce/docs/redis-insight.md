# Redis Insight Desktop

## Purpose

This project optionally uses a configured Redis service; Redis Cloud is supported.
Keep `REDIS_ENABLED=false` until approved configuration is available.

Redis Insight Desktop is used as a visual tool to inspect, debug, and manage Redis cache keys during development.

Redis Insight Desktop is not required by the Flask application at runtime.

## Architecture

```text
Flask App -> Redis Cloud
Redis Insight Desktop -> Redis Cloud
```

The Flask application connects directly to Redis Cloud using environment variables.

Redis Insight Desktop connects to the same Redis Cloud database to inspect cache keys visually.

## Environment variables

The Flask app uses these Redis environment variables:

Names: `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`,
`REDIS_PASSWORD`, `REDIS_DEFAULT_TTL_SECONDS`, `REDIS_KEY_PREFIX`, `REDIS_SSL`,
`REDIS_SOCKET_CONNECT_TIMEOUT`, and `REDIS_SOCKET_TIMEOUT`.
Supply real values privately through approved local/deployment configuration.

Do not commit `.env`.

Do not add Redis Insight Desktop connection settings to Flask configuration.
Redis Insight Desktop is configured inside the desktop app only and connects to
Redis Cloud separately from the Flask app.

## Redis Insight Desktop connection

Open Redis Insight Desktop and connect to the Redis Cloud database.

Use the privately configured service endpoint, database, authentication, and
TLS mode in the tool. Do not publish credentials or connection screenshots.
No live Redis Insight verification was performed for this documentation update.

## Cache key pattern

All project cache keys must use this pattern:

```text
pet_ecommerce:<module>:<resource>:<identifier>
```

Examples below assume the default `REDIS_KEY_PREFIX=pet_ecommerce`:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

## What to verify

Use Redis Insight Desktop to verify:

* product cache keys exist
* product cache keys have TTL
* cached values are valid JSON
* cache keys are deleted after product changes
* cache keys are recreated after calling cached GET endpoints again

## Sensitive data rule

Never cache:

* passwords
* password hashes
* JWT tokens
* login responses
* private user data
* private cart data
* sensitive admin-only responses
* payment-sensitive data

## Manual cache inspection

Search for project keys:

```text
pet_ecommerce:*
```

Product list key:

```text
pet_ecommerce:products:list
```

Product detail key:

```text
pet_ecommerce:products:detail:<product_id>
```

## Manual cache cleanup

Manual key deletion requires authorization and a verified target environment.
Do not treat this documentation as permission to delete keys. Never flush
shared databases or modify private purchase/email state.

Recommended keys to delete manually if needed:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

Do not manually edit cache values unless debugging.
