import fnmatch
import json

import app.extensions as extensions
from app.extensions import db
from app.models import Product
from app.services.auth_service import ADMIN_ROLE, CLIENT_ROLE
from tests.conftest import auth_header, create_user, login_user


class FakeRedis:
    def __init__(self):
        self.store = {}
        self.deleted = []

    def get(self, key):
        value = self.store.get(key)
        return None if value is None else value["value"]

    def set(self, key, value, ex=None):
        self.store[key] = {"ttl": ex, "value": value}

    def delete(self, *keys):
        for key in keys:
            self.deleted.append(key)
            self.store.pop(key, None)

    def scan_iter(self, match=None):
        for key in list(self.store):
            if match is None or fnmatch.fnmatch(key, match):
                yield key


def _use_fake_redis(monkeypatch) -> FakeRedis:
    fake_redis = FakeRedis()
    monkeypatch.setattr(extensions, "redis_client", fake_redis)
    return fake_redis


def _token(client, email: str, role: str) -> str:
    create_user(email, role)
    return login_user(client, email)


def _create_product(**overrides) -> Product:
    data = {
        "name": "Dog Food",
        "description": "Dry food for adult dogs",
        "price": "19.99",
        "stock": 10,
        "image_url": "https://example.com/dog-food.jpg",
    }
    data.update(overrides)
    product = Product(**data)
    db.session.add(product)
    db.session.commit()
    return product


def test_product_list_cache_miss_stores_response(client, monkeypatch):
    fake_redis = _use_fake_redis(monkeypatch)
    token = _token(client, "client@example.com", CLIENT_ROLE)
    _create_product(name="Cached Product")

    response = client.get("/products", headers=auth_header(token))

    assert response.status_code == 200
    cache_entry = fake_redis.store["pet_ecommerce:products:list"]
    assert cache_entry["ttl"] == 300
    cached_data = json.loads(cache_entry["value"])
    assert cached_data["products"][0]["name"] == "Cached Product"


def test_product_list_cache_hit_skips_database_shape(client, monkeypatch):
    fake_redis = _use_fake_redis(monkeypatch)
    token = _token(client, "client@example.com", CLIENT_ROLE)
    fake_redis.store["pet_ecommerce:products:list"] = {
        "ttl": 300,
        "value": json.dumps({"products": [{"id": 99, "name": "From Cache"}]}),
    }

    response = client.get("/products", headers=auth_header(token))

    assert response.status_code == 200
    assert response.get_json()["data"]["products"] == [{"id": 99, "name": "From Cache"}]


def test_product_detail_cache_miss_and_hit(client, monkeypatch):
    fake_redis = _use_fake_redis(monkeypatch)
    token = _token(client, "client@example.com", CLIENT_ROLE)
    product = _create_product(name="Detail Product")

    first_response = client.get(f"/products/{product.id}", headers=auth_header(token))

    assert first_response.status_code == 200
    cache_key = f"pet_ecommerce:products:detail:{product.id}"
    assert json.loads(fake_redis.store[cache_key]["value"])["product"]["name"] == "Detail Product"

    fake_redis.store[cache_key] = {
        "ttl": 300,
        "value": json.dumps({"product": {"id": product.id, "name": "Cached Detail"}}),
    }
    second_response = client.get(f"/products/{product.id}", headers=auth_header(token))

    assert second_response.status_code == 200
    assert second_response.get_json()["data"]["product"] == {
        "id": product.id,
        "name": "Cached Detail",
    }


def test_product_cache_invalidates_after_create_update_and_deactivate(client, monkeypatch):
    fake_redis = _use_fake_redis(monkeypatch)
    admin_token = _token(client, "admin@example.com", ADMIN_ROLE)
    product = _create_product()
    list_key = "pet_ecommerce:products:list"
    detail_key = f"pet_ecommerce:products:detail:{product.id}"

    fake_redis.store[list_key] = {"ttl": 300, "value": json.dumps({"products": []})}
    create_response = client.post(
        "/products",
        json={"name": "Cat Toy", "price": "7.50", "stock": 25},
        headers=auth_header(admin_token),
    )
    assert create_response.status_code == 201
    assert list_key in fake_redis.deleted

    fake_redis.store[list_key] = {"ttl": 300, "value": json.dumps({"products": []})}
    fake_redis.store[detail_key] = {"ttl": 300, "value": json.dumps({"product": {}})}
    update_response = client.put(
        f"/products/{product.id}",
        json={"stock": 8},
        headers=auth_header(admin_token),
    )
    assert update_response.status_code == 200
    assert list_key not in fake_redis.store
    assert detail_key not in fake_redis.store

    fake_redis.store[list_key] = {"ttl": 300, "value": json.dumps({"products": []})}
    fake_redis.store[detail_key] = {"ttl": 300, "value": json.dumps({"product": {}})}
    delete_response = client.delete(f"/products/{product.id}", headers=auth_header(admin_token))
    assert delete_response.status_code == 200
    assert list_key not in fake_redis.store
    assert detail_key not in fake_redis.store


def test_product_cache_invalidates_after_checkout_stock_change(client, monkeypatch):
    fake_redis = _use_fake_redis(monkeypatch)
    client_token = _token(client, "client@example.com", CLIENT_ROLE)
    product = _create_product(stock=5)
    list_key = "pet_ecommerce:products:list"
    detail_key = f"pet_ecommerce:products:detail:{product.id}"
    fake_redis.store[list_key] = {"ttl": 300, "value": json.dumps({"products": []})}
    fake_redis.store[detail_key] = {"ttl": 300, "value": json.dumps({"product": {}})}

    client.post(
        "/cart/items",
        json={"product_id": product.id, "quantity": 2},
        headers=auth_header(client_token),
    )
    response = client.post("/sales/checkout", headers=auth_header(client_token))

    assert response.status_code == 201
    assert list_key not in fake_redis.store
    assert detail_key not in fake_redis.store


