import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from models import get_session, Order, OrderStatus, WebhookEvent
from catalogue_service import load_catalogue, calculate_quote
from paypal_client import paypal_service

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
    assert "commerce" in data

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

@patch.object(paypal_service, "create_order", new_callable=AsyncMock)
@patch.object(paypal_service, "capture_order", new_callable=AsyncMock)
def test_create_order_and_successful_capture_flow(mock_capture, mock_create):
    mock_create.return_value = {
        "id": "PAYPAL-ORDER-VALID-123",
        "status": "CREATED",
        "links": [{"href": "https://paypal.sandbox/checkout", "rel": "approve"}],
    }
    mock_capture.return_value = {
        "id": "PAYPAL-ORDER-VALID-123",
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "captures": [
                        {
                            "id": "REAL-CAP-98765",
                            "status": "COMPLETED",
                            "amount": {"value": "25.21", "currency_code": "USD"},
                        }
                    ]
                }
            }
        ],
    }

    # 1. Create order
    create_res = client.post(
        "/api/orders/create",
        json={"items": [{"sku": "KIT-SOIL-PH-01", "quantity": 1}], "customer_notes": "Test garden notes"}
    )
    assert create_res.status_code == 200
    order_data = create_res.json()
    assert order_data["status"] == "CREATED"
    assert order_data["paypal_order_id"] == "PAYPAL-ORDER-VALID-123"
    order_id = order_data["order_id"]

    # 2. Capture with correct bound PayPal Order ID
    cap_res = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": "PAYPAL-ORDER-VALID-123"}
    )
    assert cap_res.status_code == 200
    cap_data = cap_res.json()
    assert cap_data["status"] == "COMPLETED"
    assert cap_data["paypal_capture_id"] == "REAL-CAP-98765"

    # 3. Idempotent re-capture
    dup_cap = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": "PAYPAL-ORDER-VALID-123"}
    )
    assert dup_cap.status_code == 200
    assert "already captured" in dup_cap.json()["message"]

@patch.object(paypal_service, "create_order", new_callable=AsyncMock)
def test_capture_order_binding_mismatch(mock_create):
    mock_create.return_value = {
        "id": "PAYPAL-ORDER-CORRECT-456",
        "status": "CREATED",
        "links": [],
    }

    create_res = client.post(
        "/api/orders/create",
        json={"items": [{"sku": "KIT-SOIL-PH-01", "quantity": 1}]}
    )
    order_id = create_res.json()["order_id"]

    # Attempt capture with wrong paypal_order_id
    bad_cap_res = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": "PAYPAL-ORDER-WRONG-999"}
    )
    assert bad_cap_res.status_code == 400
    assert "binding error" in bad_cap_res.json()["detail"]

@patch.object(paypal_service, "create_order", new_callable=AsyncMock)
@patch.object(paypal_service, "capture_order", new_callable=AsyncMock)
def test_capture_amount_mismatch_fails(mock_capture, mock_create):
    mock_create.return_value = {
        "id": "PAYPAL-ORDER-AMOUNT-CHECK",
        "status": "CREATED",
        "links": [],
    }
    # Return tampered capture amount (0.01 instead of 25.21)
    mock_capture.return_value = {
        "id": "PAYPAL-ORDER-AMOUNT-CHECK",
        "status": "COMPLETED",
        "purchase_units": [
            {
                "payments": {
                    "captures": [
                        {
                            "id": "CAP-TAMPERED",
                            "status": "COMPLETED",
                            "amount": {"value": "0.01", "currency_code": "USD"},
                        }
                    ]
                }
            }
        ],
    }

    create_res = client.post(
        "/api/orders/create",
        json={"items": [{"sku": "KIT-SOIL-PH-01", "quantity": 1}]}
    )
    order_id = create_res.json()["order_id"]

    cap_res = client.post(
        f"/api/orders/{order_id}/capture",
        json={"paypal_order_id": "PAYPAL-ORDER-AMOUNT-CHECK"}
    )
    assert cap_res.status_code == 400
    assert "amount or currency mismatch" in cap_res.json()["detail"]

def test_webhook_missing_headers_rejected():
    payload = {"id": "WH-1", "event_type": "PAYMENT.CAPTURE.COMPLETED"}
    res = client.post("/api/payments/webhook", json=payload)
    assert res.status_code == 400
    assert "Missing required PayPal transmission security headers" in res.json()["detail"]

@patch.object(paypal_service, "verify_webhook_signature", new_callable=AsyncMock)
def test_webhook_cryptographic_verification_and_idempotency(mock_verify):
    # Case 1: Verification failure
    mock_verify.return_value = False
    headers = {
        "paypal-transmission-id": "TID-1",
        "paypal-transmission-time": "2026-11-11T12:00:00Z",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "INVALID-SIG",
    }
    bad_res = client.post(
        "/api/payments/webhook",
        json={"id": "EVENT-FAIL", "event_type": "PAYMENT.CAPTURE.COMPLETED"},
        headers=headers
    )
    assert bad_res.status_code == 400
    assert "Invalid webhook signature" in bad_res.json()["detail"]

    # Case 2: Verification success
    mock_verify.return_value = True
    valid_payload = {
        "id": "EVENT-VALID-123",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {
            "id": "CAP-WH-123",
            "status": "COMPLETED",
            "custom_id": "non-existent-ref",
            "amount": {"value": "100.00", "currency_code": "USD"},
        }
    }
    good_res = client.post(
        "/api/payments/webhook",
        json=valid_payload,
        headers=headers
    )
    assert good_res.status_code == 200
    assert good_res.json()["status"] == "success"

    # Case 3: Duplicate webhook delivery (Idempotency)
    dup_res = client.post(
        "/api/payments/webhook",
        json=valid_payload,
        headers=headers
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "already_processed"
