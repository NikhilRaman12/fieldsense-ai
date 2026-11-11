# FieldSense AI: Payment Security Review & Threat Analysis

**Date:** November 11, 2026  
**Auditor:** Principal AI Systems & Payment Security Architect  
**Scope:** PayPal Sandbox Integration, FastAPI Backend, SQLite Persistence, and React Frontend  
**Classification:** Engineering Audit / Security Gate  

---

## Executive Summary

Prior to this hardening pass, FieldSense AI contained critical payment integrity vulnerabilities, including simulated test mocks active in production runtime, lack of order-binding verification between client-submitted PayPal Order IDs and server database records, vulnerability to price/item manipulation through unvalidated quotes, and absent cryptographic verification of incoming PayPal webhook signatures.

Following the remediation on branch `fix/paypal-commerce-hardening`, the application operates strictly **fail-closed**. All mock payment credentials, simulated order identifiers, and synthetic capture tokens have been eradicated from the production codebase. Payment creation and capture now require end-to-end cryptographic and transactional binding across the React client, FastAPI server, and PayPal Sandbox APIs.

---

## 1. Threat Modeling & Vulnerability Remediation Matrix

| Threat / Vulnerability Vector | Severity | Previous State | Remediated Architecture | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **THREAT-1: Payment Simulation & Synthetic Captures** | **CRITICAL** | `backend/paypal_client.py` generated `MOCK-ORDER-*` and `CAPTURE-MOCK-*` when sandbox credentials were empty, marking orders `COMPLETED` without charging. | All simulation paths deleted. Client raises `PayPalConfigurationError` and backend returns HTTP 503 (`PAYPAL_UNCONFIGURED`). | Pytest `test_missing_paypal_credentials_fails_closed` passed. |
| **THREAT-2: Order Substitution / Binding Mismatch** | **CRITICAL** | Frontend could pass an arbitrary `paypal_order_id` to `/api/paypal/capture-order`. If PayPal approved it, backend would mark local order completed without verifying ownership. | Backend enforces `order.paypal_order_id == req.paypal_order_id`. Any mismatch raises HTTP 400 (`ORDER_BINDING_MISMATCH`). | Pytest `test_capture_order_binding_mismatch` passed. |
| **THREAT-3: Double-Order Creation in React Lifecycle** | **HIGH** | `createOrder` and `onApprove` in `RemediationDrawer.tsx` could re-trigger order creation if state updates lagged, creating orphaned records. | Mutex ref `pendingOrderIdRef` and `pendingPayPalOrderIdRef` lock order IDs synchronously. Double-click prevention disables buttons. | Vitest `checkout.test.tsx` verified 1:1 call ratio. |
| **THREAT-4: Client-Side Price & Quantity Manipulation** | **HIGH** | Client could submit custom prices or totals to payment endpoints. | Client can only request quote via `/api/orders/quote` by SKU + quantity. Server evaluates prices strictly from authoritative SQLite catalogue (`catalogue.py`). Capture validates amount and currency against DB record. | Pytest `test_capture_amount_mismatch_fails`, `test_capture_currency_mismatch_fails` passed. |
| **THREAT-5: Webhook Forgery & Replay Attacks** | **CRITICAL** | Webhooks accepted payloads with naive checks; signature was not cryptographically validated against PayPal API. | Strict verification via PayPal's `/v1/notifications/verify-webhook-signature` endpoint. Rejects missing headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, etc.). Unique DB event logging prevents replay. | Pytest `test_webhook_missing_headers_rejected`, `test_webhook_cryptographic_verification_and_idempotency` passed. |
| **THREAT-6: Premature Order Completion via Browser Return** | **HIGH** | UI could assume order was paid upon PayPal approval dialog closing. | Local order remains in `CREATED` status until PayPal server-to-server capture returns `COMPLETED` and amount matches authoritative quote. | Vitest & Pytest end-to-end capture assertions. |

---

## 2. Server-Authoritative Quote & Order Binding Flow

```
[Buyer / Agronomist]
        │
        │ 1. Selects SKU & Quantity in RemediationDrawer
        ▼
[FastAPI /api/orders/quote] ──► Checks DB Catalogue (Unit Prices) ──► Computes Subtotal & Tax
        │
        │ 2. Returns Authoritative Quote (total, currency, items)
        ▼
[PayPalButtons.createOrder]
        │
        │ 3. POST /api/paypal/create-order { client_order_ref, items, total, currency }
        ▼
[FastAPI /api/paypal/create-order]
        │
        ├──► Validates client quote against server calculation
        ├──► Creates Local Order in DB (status='CREATED')
        ├──► Calls PayPal API: POST /v2/checkout/orders (intent='CAPTURE')
        ├──► Updates Local Order with returned `paypal_order_id`
        ▼
[React RemediationDrawer]
        │
        │ 4. Receives { order_id, paypal_order_id }
        │    Stores in pendingOrderIdRef & pendingPayPalOrderIdRef
        ▼
[PayPal Modal Approval Window]
        │
        │ 5. Buyer Approves Payment
        ▼
[PayPalButtons.onApprove]
        │
        │ 6. POST /api/paypal/capture-order { order_id, paypal_order_id }
        ▼
[FastAPI /api/paypal/capture-order]
        │
        ├──► BINDING CHECK: order.paypal_order_id == req.paypal_order_id?
        ├──► Calls PayPal API: POST /v2/checkout/orders/{id}/capture
        ├──► VALIDATION:
        │     - PayPal status == 'COMPLETED'
        │     - Captured Amount == order.total
        │     - Captured Currency == order.currency
        │     - Extracts real capture_id (rejects synthetic)
        ├──► Atomic DB Commit: status='COMPLETED', capture_id, updated_at
        ▼
[React RemediationDrawer] ◄── Status 200 OK
        │
        │ 7. Renders Green Confirmation with Real Capture ID
        │    Triggers onOrderSuccess() to refresh History View
```

---

## 3. Cryptographic Webhook Security Specification

PayPal Webhook validation conforms to PayPal Developer guidelines:
1. **Header Requirement Verification**:
   - `PAYPAL-AUTH-ALGO`
   - `PAYPAL-CERT-URL` (verified to originate from `*.paypal.com`)
   - `PAYPAL-TRANSMISSION-ID`
   - `PAYPAL-TRANSMISSION-SIG`
   - `PAYPAL-TRANSMISSION-TIME`
   Any missing header immediately aborts with HTTP 400 without touching business logic.

2. **Upstream Verification Dispatch**:
   FastAPI constructs the payload including the raw JSON request body and the transmission headers, transmitting it to:
   `POST https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature`

3. **Status Check & Event Idempotency**:
   - Only `verification_status: "SUCCESS"` is accepted. Any other response logs a security alert and rejects with HTTP 400.
   - `webhook_events` table enforces unique constraint on `event_id`. Duplicate webhook transmissions return HTTP 200 immediately with `status: "already_processed"` to avoid duplicate execution.

---

## 4. Residual Risks & Production Deployment Controls

1. **Live vs Sandbox Mode**:
   - The current code uses `PAYPAL_ENV=sandbox` targeting `api-m.sandbox.paypal.com`. When moving to production, `PAYPAL_ENV=live` targets `api-m.paypal.com`.
2. **Reverse Proxy & Host Headers**:
   - In production Docker deployments, ensure `ALLOWED_ORIGINS` is configured with the actual HTTPS domain, preventing cross-origin invocation.
3. **Database Concurrency**:
   - SQLite uses WAL mode (`PRAGMA journal_mode=WAL;`). For high-throughput scale (>50 concurrent writes/sec), migrate to PostgreSQL with identical SQLAlchemy models.
