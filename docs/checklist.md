# Implementation & Verification Checklist: FieldSense AI

This checklist governs the step-by-step execution and automated verification of Phase 3 vertical slices.

---

## Task Sequence & Verification Gates

### [x] Task 1: Real Ollama-Backed Investigation & Structured Output
- [x] Implement `OllamaBackendClient` in Python (`backend/ollama_client.py`) supporting chat/generate endpoints with JSON formatting.
- [x] Refactor `backend/investigation_graph.py` to route node reasoning through Ollama models when reachable.
- [x] Connect Base64 image payload to multimodal models (`llama3.1`, `gemma`, `mistral`).
- [x] Ensure `investigation_graph.py` retains pure heuristic fallback when Ollama is unreachable.
- [x] **Verification**: Backend imports cleanly and generates structured reports adhering to `FieldInvestigationReport`.

---

### [x] Task 2: Recommendation & Catalogue-Backed Quotation
- [x] Create verified agricultural product catalogue (`backend/catalogue.json`) with SKUs, titles, descriptions, categories, and unit prices.
- [x] Create `GET /api/catalogue` endpoint in FastAPI.
- [x] Add dynamic recommendation matching in `backend/investigation_graph.py` linking hypotheses to catalogue SKUs.
- [x] Implement `POST /api/orders/quote` endpoint with server-calculated subtotals, tax, and shipping.
- [x] **Verification**: `pytest tests/test_backend_api.py` confirms that invalid SKUs are rejected and price tampering is prevented.

---

### [x] Task 3: FastAPI Order Management & Database
- [x] Install `sqlmodel` in `backend/requirements.txt`.
- [x] Define `Order`, `OrderItem`, and `WebhookEvent` models in `backend/models.py`.
- [x] Implement database session dependency and auto-migration on startup.
- [x] Create CRUD repository for orders with status transitions (`CREATED`, `COMPLETED`, `FAILED`).
- [x] **Verification**: `pytest tests/test_backend_api.py` asserts correct schema persistence and constraints.

---

### [x] Task 4: PayPal Sandbox Create-Order and Capture Flow
- [x] Create `backend/paypal_client.py` with OAuth2 token acquisition and caching.
- [x] Implement `POST /api/orders/create` calling PayPal REST API `/v2/checkout/orders`.
- [x] Implement `POST /api/orders/{order_id}/capture` calling PayPal `/v2/checkout/orders/{id}/capture`.
- [x] Enforce database record updates and capture ID storage.
- [x] **Verification**: `pytest tests/test_backend_api.py` verifies order creation and capture cycles.

---

### [x] Task 5: Webhook Verification & Idempotent Updates
- [x] Implement `POST /api/payments/webhook` in `backend/main.py`.
- [x] Call PayPal `/v1/notifications/verify-webhook-signature` using incoming transmission headers.
- [x] Reject requests with invalid signatures with `400 Bad Request`.
- [x] Verify `WebhookEvent` table deduplicates duplicate `event_id` deliveries.
- [x] **Verification**: `pytest tests/test_backend_api.py` tests signature verification success/failure and idempotency.

---

### [x] Task 6: React Checkout & Order History
- [x] Install `@paypal/react-paypal-js` in frontend `package.json`.
- [x] Add `RemediationDrawer` / Cart component to `AIObserverView.tsx` displaying recommended supplies.
- [x] Integrate `PayPalScriptProvider` and `PayPalButtons` hooked to `/api/orders/create` and `/api/orders/capture`.
- [x] Create `OrdersHistoryView.tsx` component displaying past purchases and transaction IDs.
- [x] **Verification**: `npm run build` and `npm test` pass with 13/13 tests green.

---

### [x] Task 7: Automated Tests, CORS Hardening & Deployment
- [x] Restrict CORS in `backend/main.py` to explicit origin whitelist (`ALLOWED_ORIGINS`).
- [x] Add comprehensive test suite covering end-to-end investigation, quotation, and checkout.
- [x] Provide unified `docker-compose.yml` and `backend/Dockerfile`.
- [x] **Verification**: Full test suite passes: `pytest` (5/5) and `npm test` (13/13).
