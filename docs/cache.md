# Redis Cache

This project uses **Redis Cloud** as the cache database.

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

The real values must be stored in the local `.env` file.

```env
REDIS_HOST=your-redis-cloud-host
REDIS_PORT=your-redis-cloud-port
REDIS_DB=0
REDIS_PASSWORD=your-redis-cloud-password
REDIS_DEFAULT_TTL_SECONDS=300
REDIS_KEY_PREFIX=pet_ecommerce
REDIS_SSL=false
```

The `.env.example` file must contain only example values.

Never commit the real `.env` file.

## Redis Insight Desktop

Redis Insight Desktop must connect to the same Redis Cloud database used by the Flask app.

Connection example:

```text
Host: your-redis-cloud-host
Port: your-redis-cloud-port
Connection type: Standalone
Password: your-redis-cloud-password
```

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

The `pet_ecommerce` prefix keeps this project's keys organized and easy to find in Redis Insight Desktop.

## Implemented cached endpoints

| Endpoint                 | Cache key                                    | TTL                         |
| ------------------------ | -------------------------------------------- | --------------------------- |
| `GET /products`      | `pet_ecommerce:products:list`                | `REDIS_DEFAULT_TTL_SECONDS` |
| `GET /products/<id>` | `pet_ecommerce:products:detail:<product_id>` | `REDIS_DEFAULT_TTL_SECONDS` |

## Good cache candidates

Good cache candidates are read-heavy, non-sensitive endpoints.

Recommended:

* product catalog listing
* product detail

Optional, only if implemented safely:

* invoice lookup, only with strict ownership checks

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

Optional invoice cache key, only if implemented with strict ownership checks:

```text
pet_ecommerce:invoices:detail:<invoice_id>
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
* return or cancellation, if implemented

Recommended invalidation targets:

```text
pet_ecommerce:products:list
pet_ecommerce:products:detail:<product_id>
```

If multiple product keys must be removed, use pattern-based invalidation:

```text
pet_ecommerce:products:*
```

## Redis Insight Desktop verification

After implementing cache, verify it with Redis Insight Desktop.

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

