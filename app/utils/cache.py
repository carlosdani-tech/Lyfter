import json
from typing import Any

from flask import current_app
from redis.exceptions import RedisError

import app.extensions as extensions


def build_cache_key(*parts: object) -> str:
    prefix = current_app.config.get("REDIS_KEY_PREFIX", "pet_ecommerce")
    key_parts = [str(part).strip(":") for part in parts if part is not None]
    return ":".join([prefix, *key_parts])


def get_json(key: str) -> Any | None:
    client = extensions.redis_client
    if client is None:
        return None

    try:
        cached_value = client.get(key)
        if cached_value is None:
            return None
        return json.loads(cached_value)
    except (RedisError, TypeError, ValueError):
        return None


def set_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    client = extensions.redis_client
    if client is None:
        return

    ttl = ttl_seconds or current_app.config.get("REDIS_DEFAULT_TTL_SECONDS", 300)
    try:
        client.set(key, json.dumps(value), ex=ttl)
    except (RedisError, TypeError, ValueError):
        return


def delete_key(key: str) -> None:
    client = extensions.redis_client
    if client is None:
        return

    try:
        client.delete(key)
    except RedisError:
        return


def delete_pattern(pattern: str) -> None:
    client = extensions.redis_client
    if client is None:
        return

    try:
        keys = list(client.scan_iter(match=pattern))
        if keys:
            client.delete(*keys)
    except RedisError:
        return

