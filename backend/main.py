import os
import json
import logging
from typing import List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from schemas import FieldEvidenceInput, FieldInvestigationReport
from investigation_graph import run_field_investigation_async
from catalogue_service import load_catalogue, calculate_quote, get_product_by_sku
from models import init_db, get_session, Order, OrderItem, OrderStatus, WebhookEvent
from paypal_client import paypal_service, PayPalConfigurationError

logger = logging.getLogger(__name__)

# Enforce explicit origin whitelist (CORS Hardening)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:80"
    ).split(",")
    if origin.strip()
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("FieldSense AI Database initialized.")
    yield

app = FastAPI(
    title="FieldSense AI Agentic Platform & PayPal Commerce Engine",
    description="Multi-agent agricultural diagnostics backed by Ollama, LangGraph, and secure PayPal v2 checkout.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- HEALTH ---
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FieldSense AI Platform",
        "inference": "Ollama + LangGraph Multi-Agent Orchestrator",
        "commerce": "PayPal REST API v2",
        "database": "SQLite / SQLModel",
        "paypal_configured": paypal_service.is_configured(),
    }

# --- 1. INVESTIGATION ---
@app.post("/api/investigate", response_model=FieldInvestigationReport)
async def investigate_field_evidence(evidence: FieldEvidenceInput):
    try:
        report = await run_field_investigation_async(evidence)
        return report
    except Exception as e:
        logger.error("Investigation error: %s", str(e))
        raise HTTPException(status_code=500, detail="Investigation service error occurred.")

# --- 2. CATALOGUE & QUOTES ---
@app.get("/api/catalogue")
def get_catalogue():
    return load_catalogue()

class QuoteRequestItem(BaseModel):
    sku: str
    quantity: int = Field(default=1, ge=1, le=100)

class QuoteRequest(BaseModel):
    items: List[QuoteRequestItem]

@app.post("/api/orders/quote")
def create_quote(req: QuoteRequest):
    try:
        items_dict = [item.model_dump() for item in req.items]
        quote = calculate_quote(items_dict)
        return quote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Quote calculation error: %s", str(e))
        raise HTTPException(status_code=500, detail="Quote calculation error.")

# --- 3. PAYPAL ORDER CREATION ---
class CreateOrderRequest(BaseModel):
    items: List[QuoteRequestItem]
    customer_notes: str = Field(default="", max_length=500)

@app.post("/api/orders/create")
async def create_paypal_order(req: CreateOrderRequest, session: Session = Depends(get_session)):
    """
    1. Recalculates quote server-side (preventing client price tampering).
    2. Persists order in database as CREATED.
    3. Calls PayPal v2 API to create order.
    """
    try:
        items_dict = [item.model_dump() for item in req.items]
        quote = calculate_quote(items_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    import uuid
    client_ref = f"fs-ord-{uuid.uuid4().hex[:10]}"

    db_order = Order(
        client_order_ref=client_ref,
        status=OrderStatus.CREATED,
        currency=quote["currency"],
        subtotal=quote["subtotal"],
        shipping=quote["shipping"],
        tax=quote["tax"],
        total_amount=quote["total"],
        customer_notes=req.customer_notes,
    )
    session.add(db_order)
    session.commit()
    session.refresh(db_order)

    # Persist OrderItems
    for it in quote["items"]:
        db_item = OrderItem(
            order_id=db_order.id,
            sku=it["sku"],
            title=it["title"],
            unit_price=it["unit_price"],
            quantity=it["quantity"],
            total_price=it["total_price"],
        )
        session.add(db_item)
    session.commit()

    # Call PayPal API
    try:
        paypal_res = await paypal_service.create_order(quote, custom_reference=client_ref)
        paypal_order_id = paypal_res["id"]
        db_order.paypal_order_id = paypal_order_id
        session.add(db_order)
        session.commit()
        session.refresh(db_order)
    except PayPalConfigurationError as e:
        logger.error("PayPal configuration missing: %s", str(e))
        db_order.status = OrderStatus.FAILED
        session.add(db_order)
        session.commit()
        raise HTTPException(status_code=503, detail="Payment gateway not configured. Please set PayPal credentials.")
    except Exception as e:
        logger.error("PayPal Order creation failed: %s", str(e))
        db_order.status = OrderStatus.FAILED
        session.add(db_order)
        session.commit()
        raise HTTPException(status_code=502, detail="PayPal order creation failed.")

    return {
        "order_id": db_order.id,
        "client_order_ref": db_order.client_order_ref,
        "paypal_order_id": paypal_order_id,
        "status": db_order.status,
        "total": db_order.total_amount,
        "currency": db_order.currency,
        "paypal_links": paypal_res.get("links", []),
    }

# --- 4. PAYPAL ORDER CAPTURE ---
class CaptureRequest(BaseModel):
    paypal_order_id: str

@app.post("/api/orders/{order_id}/capture")
async def capture_paypal_order(
    order_id: int,
    req: CaptureRequest,
    session: Session = Depends(get_session)
):
    """
    Server-authoritative capture with strict binding validation:
    1. Validates local order exists.
    2. Validates order status allows capture (CREATED). Rejects invalid transitions.
    3. Confirms local order has a bound PayPal order ID.
    4. Validates that req.paypal_order_id strictly matches order.paypal_order_id.
    5. Idempotently returns completed order if already captured.
    6. Executes capture via PayPal API.
    7. Validates capture response status, amount, currency, and custom ID reference.
    8. Updates database order to COMPLETED only after all validations succeed.
    """
    statement = select(Order).where(Order.id == order_id)
    order = session.exec(statement).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Idempotent response if already completed
    if order.status == OrderStatus.COMPLETED:
        return {
            "order_id": order.id,
            "status": order.status,
            "paypal_capture_id": order.paypal_capture_id,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "message": "Order already captured (idempotent response).",
        }

    # Reject invalid state transitions
    if order.status not in (OrderStatus.CREATED, OrderStatus.APPROVED):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid order state transition: cannot capture order in state {order.status}."
        )

    # Confirm order has a registered PayPal Order ID
    if not order.paypal_order_id:
        raise HTTPException(
            status_code=400,
            detail="Order has no bound PayPal order ID."
        )

    # Strict server-side order binding check
    if order.paypal_order_id != req.paypal_order_id:
        logger.error(
            "PayPal order ID mismatch for local order #%d: expected %s, got %s",
            order_id,
            order.paypal_order_id,
            req.paypal_order_id
        )
        raise HTTPException(
            status_code=400,
            detail="Order binding error: PayPal order ID does not match local order record."
        )

    # Execute PayPal capture
    try:
        capture_res = await paypal_service.capture_order(req.paypal_order_id)
    except PayPalConfigurationError as e:
        logger.error("PayPal configuration missing: %s", str(e))
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    except Exception as e:
        logger.error("PayPal capture call failed: %s", str(e))
        raise HTTPException(status_code=502, detail="Failed to capture PayPal payment.")

    capture_status = capture_res.get("status")
    if capture_status != "COMPLETED":
        order.status = OrderStatus.FAILED
        session.add(order)
        session.commit()
        raise HTTPException(status_code=400, detail=f"PayPal capture not completed: status is {capture_status}")

    # Inspect purchase_units for capture details
    purchase_units = capture_res.get("purchase_units", [])
    if not purchase_units:
        raise HTTPException(status_code=502, detail="Malformed PayPal capture response: missing purchase_units.")

    if len(purchase_units) != 1:
        logger.error("Expected exactly 1 purchase_unit in capture response, found %d", len(purchase_units))
        raise HTTPException(status_code=400, detail="Unexpected purchase_units count in PayPal capture response.")

    pu = purchase_units[0]

    # Require custom_id or reference_id to exist and match exactly with client_order_ref
    unit_custom_id = pu.get("custom_id") or pu.get("reference_id")
    if not unit_custom_id:
        logger.error("Purchase unit missing custom_id and reference_id for order #%d", order_id)
        order.status = OrderStatus.FAILED
        session.add(order)
        session.commit()
        raise HTTPException(status_code=400, detail="Missing purchase unit reference in PayPal capture response.")

    if unit_custom_id != order.client_order_ref:
        logger.error(
            "Purchase unit reference mismatch for order #%d: expected %s, got %s",
            order_id,
            order.client_order_ref,
            unit_custom_id
        )
        order.status = OrderStatus.FAILED
        session.add(order)
        session.commit()
        raise HTTPException(status_code=400, detail="Purchase unit reference mismatch.")

    payments = pu.get("payments", {})
    captures = payments.get("captures", [])
    if not captures:
        raise HTTPException(status_code=502, detail="Malformed PayPal capture response: no captures found.")

    first_capture = captures[0]
    capture_id = first_capture.get("id")
    if not capture_id:
        raise HTTPException(status_code=502, detail="Missing capture ID in PayPal response.")

    # Validate captured amount and currency
    cap_amount_info = first_capture.get("amount", {})
    captured_value = float(cap_amount_info.get("value", 0.0))
    captured_currency = cap_amount_info.get("currency_code", "")

    if round(captured_value, 2) != round(order.total_amount, 2) or captured_currency != order.currency:
        logger.error(
            "Captured amount mismatch for order #%d: expected %.2f %s, got %.2f %s",
            order_id,
            order.total_amount,
            order.currency,
            captured_value,
            captured_currency
        )
        order.status = OrderStatus.FAILED
        session.add(order)
        session.commit()
        raise HTTPException(status_code=400, detail="Captured amount or currency mismatch.")

    # Mark COMPLETED with verified capture ID
    order.status = OrderStatus.COMPLETED
    order.paypal_capture_id = capture_id
    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "order_id": order.id,
        "status": order.status,
        "paypal_capture_id": order.paypal_capture_id,
        "total_amount": order.total_amount,
        "currency": order.currency,
    }

# --- 5. ORDERS HISTORY ---
@app.get("/api/orders")
def list_orders(session: Session = Depends(get_session)):
    orders = session.exec(select(Order).order_by(Order.created_at.desc())).all()
    results = []
    for ord in orders:
        items = session.exec(select(OrderItem).where(OrderItem.order_id == ord.id)).all()
        results.append({
            "id": ord.id,
            "client_order_ref": ord.client_order_ref,
            "paypal_order_id": ord.paypal_order_id,
            "paypal_capture_id": ord.paypal_capture_id,
            "status": ord.status,
            "currency": ord.currency,
            "subtotal": ord.subtotal,
            "shipping": ord.shipping,
            "tax": ord.tax,
            "total_amount": ord.total_amount,
            "created_at": ord.created_at.isoformat(),
            "items": [
                {
                    "sku": it.sku,
                    "title": it.title,
                    "unit_price": it.unit_price,
                    "quantity": it.quantity,
                    "total_price": it.total_price,
                }
                for it in items
            ]
        })
    return results

# --- 6. PAYPAL WEBHOOK INGESTION ---
@app.post("/api/payments/webhook")
async def paypal_webhook_handler(
    request: Request,
    session: Session = Depends(get_session),
    paypal_transmission_id: str = Header(None),
    paypal_transmission_time: str = Header(None),
    paypal_cert_url: str = Header(None),
    paypal_auth_algo: str = Header(None),
    paypal_transmission_sig: str = Header(None),
):
    raw_body = (await request.body()).decode("utf-8")

    # 1. Require all security headers
    if not all([paypal_transmission_id, paypal_transmission_time, paypal_cert_url, paypal_auth_algo, paypal_transmission_sig]):
        logger.warning("Rejecting webhook: missing required PayPal transmission security headers.")
        raise HTTPException(status_code=400, detail="Missing required PayPal transmission security headers.")

    # 2. Cryptographic Signature Verification via PayPal API
    is_valid = await paypal_service.verify_webhook_signature(
        transmission_id=paypal_transmission_id,
        transmission_time=paypal_transmission_time,
        cert_url=paypal_cert_url,
        auth_algo=paypal_auth_algo,
        transmission_sig=paypal_transmission_sig,
        raw_body=raw_body,
    )

    if not is_valid:
        logger.warning("PayPal Webhook signature verification failed.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    try:
        event = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON.")

    event_id = event.get("id")
    event_type = event.get("event_type")
    resource = event.get("resource", {})

    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event ID.")

    # 3. Idempotency Check with Database Guarantee
    existing = session.exec(select(WebhookEvent).where(WebhookEvent.event_id == event_id)).first()
    if existing:
        logger.info("Duplicate webhook event %s received. Returning idempotent 200 OK.", event_id)
        return {"status": "already_processed", "event_id": event_id}

    # Record webhook
    wh_record = WebhookEvent(
        event_id=event_id,
        event_type=event_type or "UNKNOWN",
        resource_id=resource.get("id"),
        status="PROCESSED",
        payload_json=raw_body,
    )
    session.add(wh_record)

    # 4. Handle PAYMENT.CAPTURE.COMPLETED with strict validation and safe state handling
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        custom_id = resource.get("custom_id")
        capture_id = resource.get("id")
        capture_status = resource.get("status")

        if not custom_id or not capture_id:
            logger.warning("Webhook PAYMENT.CAPTURE.COMPLETED missing custom_id or capture ID.")
        elif capture_status != "COMPLETED":
            logger.warning("Webhook PAYMENT.CAPTURE.COMPLETED with non-completed status: %s", capture_status)
        else:
            ord = session.exec(select(Order).where(Order.client_order_ref == custom_id)).first()
            if ord:
                # Handle out-of-order events safely: if order is already completed, ensure capture ID matches
                if ord.status == OrderStatus.COMPLETED:
                    if ord.paypal_capture_id and ord.paypal_capture_id != capture_id:
                        logger.error("Webhook capture ID %s conflicts with existing order capture ID %s", capture_id, ord.paypal_capture_id)
                    else:
                        logger.info("Order %s already marked COMPLETED. Webhook event safely acknowledged.", custom_id)
                elif ord.status in (OrderStatus.FAILED, OrderStatus.CANCELLED):
                    logger.warning("Order %s in terminal state %s. Out-of-order capture ignored without manual audit.", custom_id, ord.status)
                else:
                    # Validate amount and currency
                    res_amount = resource.get("amount", {})
                    try:
                        res_value = float(res_amount.get("value", 0.0))
                    except (ValueError, TypeError):
                        res_value = 0.0
                    res_currency = res_amount.get("currency_code", "")

                    if round(res_value, 2) == round(ord.total_amount, 2) and res_currency == ord.currency:
                        ord.status = OrderStatus.COMPLETED
                        ord.paypal_capture_id = capture_id
                        session.add(ord)
                        logger.info("Reconciled order %s to COMPLETED via PayPal webhook.", custom_id)
                    else:
                        logger.warning(
                            "Webhook amount/currency mismatch for order %s: expected %.2f %s, got %.2f %s. Order NOT completed.",
                            custom_id, ord.total_amount, ord.currency, res_value, res_currency
                        )
            else:
                logger.warning("Webhook received for unknown order reference: %s. Order not found.", custom_id)

    session.commit()
    return {"status": "success", "event_id": event_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
