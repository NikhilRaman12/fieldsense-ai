# Final System Audit: FieldSense Commerce AI

**Date**: 2026-11-11  
**Repository**: `https://github.com/NikhilRaman12/fieldsense-ai`  
**Base Commit**: `7d578ad8ee278758d51b4aa03d2f8f4dd0dc35c9`  
**Branch**: `fix/paypal-commerce-hardening`  
**Auditor**: Principal AI Systems Architect & Application Security Reviewer  

---

## 1. Executive Summary

FieldSense AI is an evidence-based plant pathology and agricultural commerce platform combining local open-weight AI inference (Ollama / Gemma / Llama) with server-authoritative PayPal v2 order management.

Following a thorough line-by-line inspection of both the React 19 frontend and FastAPI backend across all execution paths, this audit identifies **existing working capabilities**, **critical defects**, **security vulnerabilities**, **missing acceptance criteria**, and **deployment blockers**, establishing an authoritative plan of action for Phase 2 through Phase 8.

---

## 2. Complete Execution Path Traces

### Path 1: Image Upload → Ollama → Structured Report
- **UI Trigger**: `AIObserverView.tsx` accepts an image (`validateImageFile`, max 5MB, JPEG/PNG/WebP). Encodes file to Base64 via `fileToBase64`.
- **Dispatcher**: `processObservationWithFallback()` calls FastAPI `POST /api/investigate`.
- **Backend Flow**: `investigate_field_evidence` passes `FieldEvidenceInput` to `run_field_investigation_async()`.
- **Inference**: `OllamaBackendClient` checks `http://localhost:11434/api/tags`. If online, packages the prompt, stripped Base64 image (`payload["images"] = [clean_b64]`), and system prompt demanding valid JSON matching the schema.
- **Result**: Validates JSON and tags `source_mode="ollama_inference"`.
- **Evaluation**: Genuine multimodal inference occurs when Ollama is running.

### Path 2: Offline Fallback → Field Investigation Report
- **Condition**: Ollama is offline or returns an error.
- **Workflow**: `run_field_investigation_async()` catches Ollama failure and falls back to `investigation_graph.invoke()`.
- **LangGraph Nodes**: Sequential execution (`vision_agent` -> `context_agent` -> `knowledge_agent` -> `hypothesis_agent` -> `field_test_agent` -> `review_agent` -> `recommendation_agent` -> `synthesize_report`).
- **Result**: Output is tagged with `source_mode="langgraph_offline_heuristics"`.
- **Evaluation**: The fallback is honest, structured, and does not claim to be LLM-generated.

### Path 3: Hypotheses → Catalogue Recommendations
- **Workflow**: `catalogue_service.py:match_products_for_hypotheses()` matches generated hypothesis names against `target_hypotheses` in `backend/catalogue.json`.
- **Defaulting**: If no specific hypothesis matches, falls back to the primary diagnostic kit (`KIT-SOIL-PH-01`).
- **Evaluation**: Products are grounded in static catalogue records. The LLM never invents unverified SKUs or prices.

### Path 4: Catalogue → Server-Side Quote
- **API Endpoint**: `POST /api/orders/quote` ingests `QuoteRequest(items=[...])`.
- **Authority**: `calculate_quote()` looks up each SKU in `catalogue.json`, calculates subtotal, computes business-rule shipping ($4.99 or free over $50), adds 6.5% tax, and returns a verified quote object.
- **Evaluation**: Working correctly and resilient against price manipulation.

### Path 5: React PayPal Buttons → Backend Order Creation
- **UI Trigger**: User opens `RemediationDrawer.tsx`, adjusts quantities, and clicks PayPal Smart Button.
- **Defect Detected**: In `RemediationDrawer.tsx`:
  - `createOrder` calls `createBackendPayPalOrder(activeItems)` and returns `paypal_order_id`.
  - **CRITICAL BUG**: `onApprove` calls `createBackendPayPalOrder(activeItems)` a **second time**, creating two distinct database orders (`Order` rows) with different client references.
- **Evaluation**: Violates order binding and idempotency.

### Path 6: PayPal Approval → Backend Capture
- **API Endpoint**: `POST /api/orders/{order_id}/capture`.
- **Defect Detected**:
  - The endpoint takes `order_id` in the URL and `paypal_order_id` in the JSON body, but **fails to verify that `req.paypal_order_id == order.paypal_order_id`**.
  - Capture validation only checks `capture_status == "COMPLETED"`; it does not verify captured amount, currency, or custom/reference ID against the order.
  - In `paypal_client.py:capture_order`, if credentials are missing, it generates a fake capture ID (`CAP-{uuid}`) and returns `simulated: True`.
- **Evaluation**: Critical integrity risk. Must fail closed in production and validate binding.

### Path 7: Webhook → Verification → Database Reconciliation
- **API Endpoint**: `POST /api/payments/webhook`.
- **Defect Detected**:
  - `paypal_client.py:verify_webhook_signature()` has a dangerous fallback:
    `if not self.is_configured(): return bool(transmission_id and transmission_sig)`. Any non-empty string is treated as valid.
  - Event reconciliation looks up `custom_id` on `PAYMENT.CAPTURE.COMPLETED`, but does not verify resource amounts, currency, or capture status before transitioning the order.
- **Evaluation**: Insecure when unconfigured. Must require real cryptographic verification or fail closed.

### Path 8: Order History → Persisted Transaction Details
- **API Endpoint**: `GET /api/orders`.
- **UI View**: `OrdersHistoryView.tsx` lists orders with status badge, items, and total.
- **Evaluation**: Persisted correctly in SQLite (`fieldsense_orders.db`).

---

## 3. Working Features vs. Critical Defects

### Working Features
1. Multi-agent investigation pipeline (Ollama + LangGraph).
2. Grounded catalogue recommendation engine (`catalogue_service.py`).
3. Server-authoritative quote calculation (`/api/orders/quote`).
4. SQLite persistence for orders and webhook events with UTC timestamps.
5. React 19 UI with responsive field mission views, journal entries, and scorecard.
6. Unit test coverage for backend API (5/5) and frontend utilities (13/13).

### Critical Defects
1. **Duplicate Order Creation**: `RemediationDrawer.tsx` creates an order in `createOrder` and creates an entirely separate order in `onApprove`.
2. **Missing Order Binding**: `/api/orders/{order_id}/capture` does not verify that the captured PayPal order matches the database order's `paypal_order_id`.
3. **Simulated Payment Fallback in Production Code**: `paypal_client.py` uses fallback mock IDs (`PAYPAL-SANDBOX-...`, `CAP-...`) and returns simulated success when credentials are missing.
4. **Permissive Webhook Verification**: Accepts arbitrary non-empty headers when PayPal is unconfigured.
5. **Hardcoded URLs**: `src/services/fastapiService.ts` hardcodes `http://127.0.0.1:8000`. `RemediationDrawer.tsx` hardcodes PayPal client ID `'test'`.
6. **Missing Dockerfile.frontend**: `docker-compose.yml` references `Dockerfile.frontend`, which does not exist in the repository.

---

## 4. Security Vulnerabilities

| Vulnerability | Severity | Impact | Remediation |
|---|---|---|---|
| **Simulation Bypass** | **Critical (P0)** | Fake payments can be marked `COMPLETED` without PayPal interaction. | Remove simulated fallbacks; fail closed with HTTP 503 / 400 if credentials missing. |
| **Order ID Substitution** | **High (P0)** | Attacker could capture an unrelated order ID against a local order. | Assert `order.paypal_order_id == req.paypal_order_id` before capture. |
| **Unverified Webhook Headers** | **High (P0)** | Forged webhooks could flip orders to `COMPLETED`. | Enforce strict PayPal API signature check; fail closed if unconfigured. |
| **Price Tampering Potential** | **Medium (P1)** | Client could attempt to modify cart totals during checkout. | Already mitigated server-side; maintain server authority on all amounts. |
| **Exposed Secret Risk** | **Medium (P1)** | Hardcoded test credentials or client secrets in frontend. | Provide `.env.example`; use `VITE_PAYPAL_CLIENT_ID` for frontend; keep secret server-side only. |

---

## 5. Prioritized Fix Plan

- **P0**: Fix duplicate order creation in `RemediationDrawer.tsx`.
- **P0**: Enforce order binding (`paypal_order_id` match) in `/api/orders/{id}/capture`.
- **P0**: Remove simulated payment fallback from `paypal_client.py`; fail closed.
- **P0**: Validate amount, currency, and custom ID in capture response and webhook processing.
- **P1**: Replace hardcoded URLs with `VITE_API_BASE_URL` and `VITE_PAYPAL_CLIENT_ID`.
- **P1**: Add `Dockerfile.frontend` and fix `docker-compose.yml`.
- **P1**: Create `.env.example` with clear instructions for PayPal Sandbox.
- **P1**: Expand automated tests (capture mismatch, webhook verification failure, invalid SKU).
- **P2**: Update documentation (`README.md`, `demo-runbook.md`).
