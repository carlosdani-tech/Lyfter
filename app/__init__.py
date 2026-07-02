from redis import Redis

import app.extensions as extensions
from app.config import Config
from app.extensions import db, jwt, migrate
from app.models import load_models
from app.routes import register_blueprints
from app.utils.seed import seed_admin_user
from flask import Flask


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    load_models()
    migrate.init_app(app, db)
    jwt.init_app(app)

    if app.config.get("TESTING"):
        extensions.redis_client = None
    else:
        extensions.redis_client = Redis(
            host=app.config["REDIS_HOST"],
            port=app.config["REDIS_PORT"],
            db=app.config["REDIS_DB"],
            password=app.config.get("REDIS_PASSWORD"),
            decode_responses=True,
            ssl=app.config["REDIS_SSL"],
        )

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    register_blueprints(app)

    if not app.config.get("TESTING"):
        with app.app_context():
            seed_admin_user()

    return app
