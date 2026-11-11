# FieldSense AI: Test Evidence & Verification Logs

**Date:** November 11, 2026  
**Branch:** `fix/submission-readiness-gate`  
**Execution Environment:** Windows 11, Python 3.11.8, Node.js v20.18.0, Vitest v5.0.3, pytest v8.3.4  

---

## 1. Backend Automated Test Suite (pytest)

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai\backend> python -m pytest tests/test_backend_api.py -v
============================= test session starts =============================
platform win32 -- Python 3.11.8, pytest-8.3.4, pluggy-1.6.0
cachedir: .pytest_cache
rootdir: C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai\backend
plugins: anyio-4.13.0, Faker-40.12.0, langsmith-0.8.15, asyncio-0.26.0, cov-6.3.0, httpx-0.35.0, mock-3.15.1
asyncio: mode=Mode.STRICT, asyncio_default_test_loop_scope=function
collecting ... collected 17 items

tests/test_backend_api.py::test_missing_paypal_credentials_fails_closed PASSED [  5%]
tests/test_backend_api.py::test_health_check PASSED                      [ 11%]
tests/test_backend_api.py::test_catalogue_listing PASSED                 [ 17%]
tests/test_backend_api.py::test_server_authoritative_quote PASSED        [ 23%]
tests/test_backend_api.py::test_create_order_and_successful_capture_flow PASSED [ 29%]
tests/test_backend_api.py::test_capture_order_binding_mismatch PASSED    [ 35%]
tests/test_backend_api.py::test_capture_amount_mismatch_fails PASSED     [ 41%]
tests/test_backend_api.py::test_capture_currency_mismatch_fails PASSED   [ 47%]
tests/test_backend_api.py::test_capture_missing_capture_id_fails PASSED  [ 52%]
tests/test_backend_api.py::test_webhook_missing_headers_rejected PASSED  [ 58%]
tests/test_backend_api.py::test_webhook_cryptographic_verification_and_idempotency PASSED [ 64%]
tests/test_backend_api.py::test_quote_invalid_sku_fails PASSED           [ 70%]
tests/test_backend_api.py::test_quote_invalid_quantity_fails PASSED      [ 76%]
tests/test_backend_api.py::test_capture_missing_purchase_unit_reference_fails PASSED [ 82%]
tests/test_backend_api.py::test_capture_incorrect_purchase_unit_reference_fails PASSED [ 88%]
tests/test_backend_api.py::test_repeated_capture_request_is_idempotent PASSED [ 94%]
tests/test_backend_api.py::test_webhook_order_reconciliation_and_amount_mismatch PASSED [100%]

======================= 17 passed, 2 warnings in 2.38s ========================
```

---

## 2. Frontend Automated Test Suite (vitest)

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> npm test -- --run

> fieldsense-ai@0.0.0 test
> vitest run --run

 RUN  v5.0.3 C:/Users/Nikhil Raman K/.gemini/antigravity/scratch/fieldsense-ai

 ✓ src/test/image.test.ts (3 tests) 9ms
 ✓ src/test/missions.test.ts (3 tests) 10ms
 ✓ src/test/observer.test.ts (3 tests) 13ms
 ✓ src/test/journal.test.ts (4 tests) 34ms
 ✓ src/test/checkout.test.tsx (4 tests) 513ms
   ✓ RemediationDrawer PayPal Checkout Flow (4)
     ✓ displays configuration alert and disables checkout when VITE_PAYPAL_CLIENT_ID is missing
     ✓ calls createBackendPayPalOrder exactly once and captures the exact same order
     ✓ handles PayPal checkout cancellation without falsely showing payment success
     ✓ handles capture failure gracefully without showing success

 Test Files  5 passed (5)
      Tests  17 passed (17)
   Start at  23:16:31
   Duration  5.01s
```

---

## 3. Production TypeScript & Vite Build

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> npm run build

> fieldsense-ai@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 1924 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.16 kB │ gzip:   0.63 kB
dist/assets/index-B4yNgagU.css   13.60 kB │ gzip:   3.34 kB
dist/assets/index-DUzhSG6N.js   442.08 kB │ gzip: 138.35 kB

✓ built in 933ms
```

---

## 4. Linting Verification (oxlint)

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> npm run lint

> fieldsense-ai@0.0.0 lint
> oxlint

Found 9 warnings and 0 errors.
Finished in 98ms on 26 files with 116 rules using 12 threads.
```

---

## 5. Docker Compose Config Validation

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> docker compose config

name: fieldsense-ai
services:
  fastapi-backend:
    build:
      context: C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai
      dockerfile: backend/Dockerfile
    environment:
      ALLOWED_ORIGINS: http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:80
      PAYPAL_CLIENT_ID: ""
      PAYPAL_CLIENT_SECRET: ""
      PAYPAL_ENV: sandbox
      PAYPAL_WEBHOOK_ID: ""
    ports:
      - mode: ingress
        target: 8000
        published: "8000"
        protocol: tcp
    volumes:
      - type: bind
        source: C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai\backend\data
        target: /app/backend/data
  frontend:
    build:
      context: C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai
      dockerfile: Dockerfile.frontend
    depends_on:
      fastapi-backend:
        condition: service_started
        required: true
    environment:
      VITE_API_BASE_URL: http://localhost:8000
      VITE_PAYPAL_CLIENT_ID: ""
    ports:
      - mode: ingress
        target: 80
        published: "5173"
        protocol: tcp
```
