import os

from dotenv import load_dotenv

load_dotenv()


def _get_bool_env(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def _get_int_env(name: str, default: str = "0") -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return int(default)


def _get_float_env(name: str, default: str = "0") -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return float(default)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_jwt_secret_key")
    ADMIN_SEED_EMAIL = os.getenv("ADMIN_SEED_EMAIL", "admin@example.com")
    ADMIN_SEED_PASSWORD = os.getenv("ADMIN_SEED_PASSWORD", "Password123")

    DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "pet_ecommerce_db")
    DATABASE_USER = os.getenv("DATABASE_USER", "postgres")
    DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "postgres")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg://{DATABASE_USER}:{DATABASE_PASSWORD}"
        f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    REDIS_ENABLED = _get_bool_env("REDIS_ENABLED", "false")
    REDIS_HOST = os.getenv("REDIS_HOST", "your-redis-cloud-host")
    REDIS_PORT = _get_int_env("REDIS_PORT", "0")
    REDIS_DB = _get_int_env("REDIS_DB", "0")
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_DEFAULT_TTL_SECONDS = _get_int_env("REDIS_DEFAULT_TTL_SECONDS", "300")
    REDIS_KEY_PREFIX = os.getenv("REDIS_KEY_PREFIX", "pet_ecommerce")
    REDIS_SSL = _get_bool_env("REDIS_SSL")
    REDIS_SOCKET_CONNECT_TIMEOUT = _get_float_env("REDIS_SOCKET_CONNECT_TIMEOUT", "1")
    REDIS_SOCKET_TIMEOUT = _get_float_env("REDIS_SOCKET_TIMEOUT", "1")
