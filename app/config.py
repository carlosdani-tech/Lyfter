import os

from dotenv import load_dotenv

load_dotenv()


def _get_bool_env(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


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

    REDIS_HOST = os.getenv("REDIS_HOST", "your-redis-cloud-host")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "0"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_DEFAULT_TTL_SECONDS = int(os.getenv("REDIS_DEFAULT_TTL_SECONDS", "300"))
    REDIS_KEY_PREFIX = os.getenv("REDIS_KEY_PREFIX", "pet_ecommerce")
    REDIS_SSL = _get_bool_env("REDIS_SSL")
