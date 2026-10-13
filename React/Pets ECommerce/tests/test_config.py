import pytest

from app import create_app
from app.config import Config, ConfigurationError


class ValidTestConfig(Config):
    TESTING = True
    SECRET_KEY = "test-only-explicit-flask-key"
    JWT_SECRET_KEY = "test-only-explicit-jwt-key-with-at-least-32-chars"
    ADMIN_SEED_PASSWORD = "test-only-explicit-admin-password-123"
    CLIENT_SEED_PASSWORD = "test-only-explicit-client-password-456"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


@pytest.mark.parametrize(
    ("config_name", "missing_value"),
    [
        ("SECRET_KEY", None),
        ("SECRET_KEY", "   "),
        ("JWT_SECRET_KEY", None),
        ("JWT_SECRET_KEY", ""),
        ("ADMIN_SEED_PASSWORD", None),
        ("ADMIN_SEED_PASSWORD", "\t"),
        ("CLIENT_SEED_PASSWORD", None),
        ("CLIENT_SEED_PASSWORD", "   "),
    ],
)
def test_create_app_rejects_missing_security_config(config_name, missing_value):
    invalid_config = type(
        "InvalidTestConfig",
        (ValidTestConfig,),
        {config_name: missing_value},
    )

    with pytest.raises(ConfigurationError, match=config_name):
        create_app(invalid_config)


def test_create_app_reports_all_missing_security_config_without_values():
    class MissingSecurityConfig(ValidTestConfig):
        SECRET_KEY = ""
        JWT_SECRET_KEY = None
        ADMIN_SEED_PASSWORD = "   "
        CLIENT_SEED_PASSWORD = None
        DATABASE_PASSWORD = "configured-database-password-must-stay-private"

    with pytest.raises(ConfigurationError) as error_info:
        create_app(MissingSecurityConfig)

    message = str(error_info.value)
    assert message == (
        "Missing required environment variables: "
        "SECRET_KEY, JWT_SECRET_KEY, ADMIN_SEED_PASSWORD, CLIENT_SEED_PASSWORD"
    )
    assert MissingSecurityConfig.DATABASE_PASSWORD not in message


def test_configuration_error_does_not_expose_configured_secret():
    class PartiallyConfiguredSecurity(ValidTestConfig):
        SECRET_KEY = "configured-secret-must-not-appear"
        JWT_SECRET_KEY = None
        ADMIN_SEED_PASSWORD = None
        CLIENT_SEED_PASSWORD = None

    with pytest.raises(ConfigurationError) as error_info:
        create_app(PartiallyConfiguredSecurity)

    assert PartiallyConfiguredSecurity.SECRET_KEY not in str(error_info.value)


def test_explicit_test_security_config_allows_application_creation(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("ADMIN_SEED_PASSWORD", raising=False)
    monkeypatch.delenv("CLIENT_SEED_PASSWORD", raising=False)

    app = create_app(ValidTestConfig)

    assert app.config["SECRET_KEY"] == ValidTestConfig.SECRET_KEY
    assert app.config["JWT_SECRET_KEY"] == ValidTestConfig.JWT_SECRET_KEY
    assert app.config["ADMIN_SEED_PASSWORD"] == ValidTestConfig.ADMIN_SEED_PASSWORD
    assert app.config["CLIENT_SEED_PASSWORD"] == ValidTestConfig.CLIENT_SEED_PASSWORD


def test_seed_passwords_must_be_different():
    class ReusedSeedPasswordConfig(ValidTestConfig):
        CLIENT_SEED_PASSWORD = ValidTestConfig.ADMIN_SEED_PASSWORD

    with pytest.raises(ConfigurationError, match="must be different"):
        create_app(ReusedSeedPasswordConfig)
