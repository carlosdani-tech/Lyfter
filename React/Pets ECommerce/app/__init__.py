from flask import Flask
from flask_cors import CORS
from redis import Redis

import app.extensions as extensions
from app.config import Config
from app.extensions import db, jwt, migrate
from app.models import load_models
from app.routes import register_blueprints
from app.utils.seed import seed_admin_user

_REDIS_PLACEHOLDER_HOSTS = {"", "your-redis-cloud-host"}


def _get_positive_timeout(value: object, default: float = 1.0) -> float:
    try:
        timeout = float(value)
    except (TypeError, ValueError):
        return default

    return timeout if timeout > 0 else default


def _create_redis_client(app: Flask) -> Redis | None:
    if app.config.get("TESTING") or not app.config.get("REDIS_ENABLED"):
        return None

    host = str(app.config.get("REDIS_HOST", "")).strip()
    port = app.config.get("REDIS_PORT", 0)
    if host in _REDIS_PLACEHOLDER_HOSTS or not isinstance(port, int) or port <= 0:
        return None

    return Redis(
        host=host,
        port=port,
        db=app.config["REDIS_DB"],
        password=app.config.get("REDIS_PASSWORD"),
        decode_responses=True,
        ssl=app.config["REDIS_SSL"],
        socket_connect_timeout=_get_positive_timeout(
            app.config.get("REDIS_SOCKET_CONNECT_TIMEOUT"),
        ),
        socket_timeout=_get_positive_timeout(app.config.get("REDIS_SOCKET_TIMEOUT")),
    )


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(
        app,
        origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8080",
        ],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    db.init_app(app)
    load_models()
    migrate.init_app(app, db)
    jwt.init_app(app)

    extensions.redis_client = _create_redis_client(app)

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    register_blueprints(app)

    if not app.config.get("TESTING"):
        with app.app_context():
            seed_admin_user()

    return app
