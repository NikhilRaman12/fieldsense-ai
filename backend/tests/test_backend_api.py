import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from models import get_session, Order, OrderStatus
from catalogue_service import load_catalogue, calculate_quote

# In-memory database for testing
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

def override_get_session():
    with Session(test_engine) as session:
        yield session

app.dependency_overrides[get_session] = override_get_session

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "PayPal" in data["commerce"]

def test_catalogue_listing():
    res = client.get("/api/catalogue")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 4
    skus = [i["sku"] for i in items]
    assert "KIT-SOIL-PH-01" in skus

def test_server_authoritative_quote():
    # Valid quote
    res = client.post("/api/orders/quote", json={"items": [{"sku": "KIT-SOIL-PH-01", "quantity": 2}]})
    assert res.status_code == 200
    data = res.json()
    assert data["subtotal"] == 37.98
    assert data["shipping"] == 4.99
    assert data["total"] > data["subtotal"]

    # Invalid SKU rejection
    bad_res = client.post("/api/orders/quote", json={"items": [{"sku": "INVALID-HACKED-SKU", "quantity": 1}]})
    assert bad_res.status_code == 400

def test_create_order_lifecycle():
    # 1. Create order
    create_res = client.post(
        "/api/orders/create",
        json={
            "items": [{"sku": "KIT-SOIL-PH-01", "quantity": 1}],
            "customer_notes": "Urgent test for garden plot"
        }
    )
    assert create_res.status_code == 200
    data = create_res.json()
    assert data["status"] == "CREATED"
    assert data["paypal_order_id"] is not None
    order_id = data["order_id"]
    paypal_order_id = data["paypal_order_id"]

    # 2. Capture order
    capture_res = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": paypal_order_id}
    )
    assert capture_res.status_code == 200
    cap_data = capture_res.json()
    assert cap_data["status"] == "COMPLETED"
    assert cap_data["paypal_capture_id"] is not None

    # 3. Idempotent re-capture
    second_capture = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": paypal_order_id}
    )
    assert second_capture.status_code == 200
    assert "already captured" in second_capture.json().get("message", "")

def test_webhook_signature_and_idempotency():
    headers = {
        "paypal-transmission-id": "TEST-TRANSMISSION-123",
        "paypal-transmission-time": "2026-11-11T12:00:00Z",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "TEST-SIGNATURE",
    }
    payload = {
        "id": "WH-EVENT-9999",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-SIMULATED-99", "custom_id": "non-existent-ref"}
    }

    # First delivery
    res = client.post("/api/payments/webhook", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Duplicate delivery (idempotency test)
    dup_res = client.post("/api/payments/webhook", json=payload, headers=headers)
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "already_processed"
