# Redis Insight Desktop

## Purpose

This project uses Redis Cloud as the cache database.

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

```env
REDIS_HOST=your-redis-cloud-host
REDIS_PORT=your-redis-cloud-port
REDIS_DB=0
REDIS_PASSWORD=your-redis-cloud-password
REDIS_DEFAULT_TTL_SECONDS=300
REDIS_KEY_PREFIX=pet_ecommerce
REDIS_SSL=false
```

Real values must be stored only in the local `.env` file.

Do not commit `.env`.

Do not add Redis Insight Desktop connection settings to Flask configuration.
Redis Insight Desktop is configured inside the desktop app only and connects to
Redis Cloud separately from the Flask app.

## Redis Insight Desktop connection

Open Redis Insight Desktop and connect to the Redis Cloud database.

Connection example:

```text
Host: your-redis-cloud-host
Port: your-redis-cloud-port
Connection Type: Standalone
Password: your-redis-cloud-password
Database Alias: pet-ecommerce-cache
```

## Cache key pattern

All project cache keys must use this pattern:

```text
pet_ecommerce:<module>:<resource>:<identifier>
```

Examples:

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

During development, it is safe to manually delete product cache keys from Redis Insight Desktop.

Recommended keys to delete manually if needed:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

Do not manually edit cache values unless debugging.
