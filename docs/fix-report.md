# Fix Report: FieldSense Commerce AI

**Date**: 2026-11-11  
**Branch**: `fix/paypal-commerce-hardening`  
**Target**: `main`  
**Reference Commit**: `7d578ad`  

---

## 1. Summary of Defects Fixed

### P0: Duplicate PayPal Order Creation
- **Root Cause**: `src/components/RemediationDrawer.tsx` called `createBackendPayPalOrder(activeItems)` once in `createOrder` and again inside `onApprove`. This created two separate local database orders with different reference numbers.
- **Fix**: Stored `currentCreatedOrderId` and `currentPayPalOrderId` in React component state during `createOrder`. Updated `onApprove` to capture that specific order ID via `captureBackendPayPalOrder(targetOrderId, targetPayPalOrderId)` without calling create a second time.

### P0: Server-Side Order Binding Enforcement
- **Root Cause**: In `backend/main.py`, `/api/orders/{order_id}/capture` accepted any `paypal_order_id` in the JSON request body without verifying that it matched `order.paypal_order_id` in SQLite.
- **Fix**: Added explicit binding assertion: if `order.paypal_order_id and order.paypal_order_id != req.paypal_order_id`, the request is immediately rejected with `HTTP 400 Bad Request`.

### P0: Removed Dangerous Payment Simulation Fallbacks
- **Root Cause**: `backend/paypal_client.py` generated synthetic IDs (`PAYPAL-SANDBOX-...`, `CAP-...`) and marked orders `COMPLETED` when credentials were unconfigured, creating a security risk where mock payments could be perceived as real.
- **Fix**: Removed all synthetic fallback branches. Introduced `PayPalConfigurationError`. If PayPal credentials or webhook IDs are missing, the client fails closed and the API returns `HTTP 503 Gateway Not Configured`.

### P0: Strict Amount & Currency Capture Validation
- **Root Cause**: In `/api/orders/{order_id}/capture`, any response with `status: "COMPLETED"` was accepted without checking if the amount captured matched the order total.
- **Fix**: Added verification checking `round(captured_value, 2) == round(order.total_amount, 2)` and `captured_currency == order.currency`. Any discrepancy marks the order `FAILED` and raises `HTTP 400`.

### P0: Webhook Cryptographic Verification & Header Guards
- **Root Cause**: `verify_webhook_signature` accepted any non-empty signature if unconfigured. Webhook endpoint did not validate the presence of all five transmission headers.
- **Fix**: Enforced that `paypal-transmission-id`, `paypal-transmission-time`, `paypal-cert-url`, `paypal-auth-algo`, and `paypal-transmission-sig` are required. Fails closed if PayPal credentials or webhook ID are unconfigured.

### P1: Configurable API Base URLs & Frontend Client Secrets
- **Root Cause**: `src/services/fastapiService.ts` hardcoded `http://127.0.0.1:8000`. `RemediationDrawer.tsx` hardcoded PayPal client ID `'test'`.
- **Fix**: Updated `fastapiService.ts` to use `import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'`. Updated `RemediationDrawer.tsx` to use `import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'`. Created `.env.example` with clear instructions.

### P1: Containerization Alignment
- **Root Cause**: `docker-compose.yml` referenced `Dockerfile.frontend`, which did not exist.
- **Fix**: Added `Dockerfile.frontend` (multi-stage Node build with Nginx) and `nginx.conf`. Updated `docker-compose.yml` environment configurations.

---

## 2. Inventory of Files Modified & Added

| File | Status | Description of Change |
|---|---|---|
| `backend/paypal_client.py` | **Modified** | Removed simulation fallbacks; added `PayPalConfigurationError`; strict header checks. |
| `backend/main.py` | **Modified** | Order binding checks on capture; amount & currency validation; webhook header guards. |
| `src/components/RemediationDrawer.tsx` | **Modified** | Fixed duplicate order creation; bound state variables; configurable PayPal client ID. |
| `src/services/fastapiService.ts` | **Modified** | Used `VITE_API_BASE_URL` dynamically; updated return types. |
| `backend/tests/test_backend_api.py` | **Modified** | Expanded test coverage from 5 to 8 tests including binding, amount mismatch, and webhooks. |
| `.env.example` | **Added** | Safe template for PayPal Sandbox API keys and Vite client variables. |
| `Dockerfile.frontend` | **Added** | Multi-stage Node + Nginx container for React frontend. |
| `nginx.conf` | **Added** | Nginx SPA fallback configuration for Docker. |
| `docker-compose.yml` | **Modified** | Aligned frontend container, volume paths, and environment bindings. |
| `docs/final-audit.md` | **Added** | Final system audit detailing all 8 execution paths and findings. |
| `docs/fix-report.md` | **Added** | Detailed breakdown of all architectural and security fixes. |
| `docs/test-evidence.md` | **Added** | Verifiable test execution evidence for backend and frontend. |
| `docs/demo-runbook.md` | **Added** | Judge-ready step-by-step reproduction runbook. |
