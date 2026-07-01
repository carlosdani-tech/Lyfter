from app import create_app


def test_health_check_returns_ok():
    app = create_app()
    client = app.test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_placeholder_blueprints_are_registered():
    app = create_app()
    client = app.test_client()

    modules = ["auth", "products", "cart", "sales", "invoices"]

    for module in modules:
        response = client.get(f"/{module}/health")

        assert response.status_code == 200
        assert response.get_json() == {"module": module, "status": "ok"}