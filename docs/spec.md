# Technical Specification: FieldSense AI (PayPal AI Edition)

## 1. System Architecture & Component Interactions

FieldSense AI is architected as an asynchronous, decoupled system:
- **Client**: React 19 Single Page Application with `@paypal/react-paypal-js`.
- **Backend**: FastAPI 0.110+ server providing RESTful endpoints, AI orchestration, catalogue governance, and PayPal v2 client.
- **Inference Runtime**: Ollama daemon hosting local models (e.g., `gemma3`, `llama3.2-vision`).
- **Database**: SQLite with SQLModel / SQLAlchemy for transactional order, line item, and webhook idempotency records.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application Core                        │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │ InvestigationEngine │   │   CatalogueService  │   │OrderManager│   │
│   │ • Ollama client     │   │ • Schema validation │   │• SQLModel  │   │
│   │ • Structured parse  │   │ • Pricing rules     │   │• States    │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └──────┬─────┘   │
│              │                         │                     │         │
│              ▼                         ▼                     ▼         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    PayPalClient Adapter                        │   │
│   │ • OAuth2 Token Cache                                           │   │
│   │ • POST /v2/checkout/orders                                     │   │
│   │ • POST /v2/checkout/orders/{id}/capture                        │   │
│   │ • POST /v1/notifications/verify-webhook-signature              │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
                      PayPal REST API v2 (Sandbox)
```

---

## 2. Data Models & Database Schemas

### 2.1 Database Models (`backend/models.py`)

```python
from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

class OrderStatus(str, Enum):
    DRAFT = "DRAFT"
    CREATED = "CREATED"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    sku: str = Field(index=True)
    title: str
    unit_price: float
    quantity: int
    total_price: float

    order: Optional["Order"] = Relationship(back_populates="items")

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_order_ref: str = Field(unique=True, index=True)
    paypal_order_id: Optional[str] = Field(default=None, unique=True, index=True)
    paypal_capture_id: Optional[str] = Field(default=None, index=True)
    status: OrderStatus = Field(default=OrderStatus.DRAFT, index=True)
    currency: str = Field(default="USD")
    subtotal: float
    shipping: float
    tax: float
    total_amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    items: List[OrderItem] = Relationship(back_populates="order")

class WebhookEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(unique=True, index=True)
    event_type: str = Field(index=True)
    resource_id: str = Field(index=True)
    status: str
    received_at: datetime = Field(default_factory=datetime.utcnow)
    payload_json: str
```

---

## 3. API Contracts & Endpoints

### 3.1 Field Investigation (`POST /api/investigate`)
- **Request**:
  ```json
  {
    "observation_text": "Severe yellowing on lower tomato leaves, veins remain green.",
    "image_base64": "data:image/jpeg;base64,...",
    "affected_parts": "Basal older leaves",
    "soil_moisture": "Waterlogged / Saturated",
    "recent_weather": "Heavy continuous rainfall",
    "spread_extent": "Isolated single plant"
  }
  ```
- **Response**: `FieldInvestigationReport` with linked `recommended_products` populated from catalogue.

### 3.2 Catalogue Listing (`GET /api/catalogue`)
- **Response**: Array of available remediation and diagnostic supplies:
  ```json
  [
    {
      "sku": "KIT-SOIL-PH-01",
      "title": "Precision Soil Ribbon & pH Field Test Kit",
      "description": "Determines root-zone soil pH and anaerobic compaction.",
      "category": "diagnostic",
      "price": 18.99,
      "currency": "USD",
      "in_stock": true,
      "target_hypotheses": ["Root Zone Anoxia", "Nutrient Lockout"]
    }
  ]
  ```

### 3.3 Server Quotation (`POST /api/orders/quote`)
- **Request**: `{"items": [{"sku": "KIT-SOIL-PH-01", "quantity": 1}]}`
- **Response**:
  ```json
  {
    "quote_id": "qte_987654",
    "items": [...],
    "subtotal": 18.99,
    "shipping": 4.50,
    "tax": 1.52,
    "total": 25.01,
    "currency": "USD",
    "valid_until": "2026-11-11T00:30:00Z"
  }
  ```

### 3.4 Create PayPal Order (`POST /api/orders/create`)
- **Request**: `{"quote_id": "qte_987654"}`
- **Backend Action**: Validates quote, creates row in `Order` (`status=CREATED`), requests PayPal order from `https://api-m.sandbox.paypal.com/v2/checkout/orders`.
- **Response**: `{"order_id": "1", "paypal_order_id": "5O190127TN364715T", "status": "CREATED"}`

### 3.5 Capture PayPal Order (`POST /api/orders/{order_id}/capture`)
- **Request**: `{"paypal_order_id": "5O190127TN364715T"}`
- **Backend Action**:
  - Checks database status; if already `COMPLETED`, returns cached confirmation (idempotent).
  - Calls `POST /v2/checkout/orders/{paypal_order_id}/capture`.
  - Mutates database state to `COMPLETED` and records `paypal_capture_id`.
- **Response**:
  ```json
  {
    "order_id": "1",
    "status": "COMPLETED",
    "capture_id": "87S1234567890123",
    "amount_captured": 25.01,
    "currency": "USD"
  }
  ```

### 3.6 PayPal Webhook Ingestion (`POST /api/payments/webhook`)
- **Headers**:
  - `paypal-auth-algo`
  - `paypal-cert-url`
  - `paypal-transmission-id`
  - `paypal-transmission-sig`
  - `paypal-transmission-time`
- **Verification Flow**:
  1. Forwards headers and raw body to PayPal `/v1/notifications/verify-webhook-signature`.
  2. If signature fails, returns `HTTP 400 Bad Request`.
  3. Checks `WebhookEvent` table for duplicate `event_id`. If exists, returns `HTTP 200 OK` (idempotent).
  4. Dispatches internal event to transition matching order to `COMPLETED` or `FAILED`.

---

## 4. Security, Secrets & State Transitions

### 4.1 State Machine
```
[DRAFT] ──(Create Order)──► [CREATED] ──(User Approves in PayPal)──► [APPROVED]
                               │                                       │
                         (Capture Call)                           (Capture Call)
                               │                                       │
                               ▼                                       ▼
                         [COMPLETED] ◄─────────────────────────────────┘
                               ▲
                      (Webhook Reconcile)
```

### 4.2 Security Guards
1. **Zero Client Price Trust**: The client never sends amount figures to PayPal endpoints. The server fetches prices strictly from `catalogue.json`.
2. **Environment Isolation**:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_WEBHOOK_ID`
   - `PAYPAL_ENV` (`sandbox` or `live`)
   Stored in `.env`, loaded via Pydantic `BaseSettings`.
3. **CORS Restrictions**: Explicit origin whitelist (`http://localhost:5173`, `http://127.0.0.1:5173`).

