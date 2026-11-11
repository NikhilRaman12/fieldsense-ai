# FieldSense AI: Test Evidence & Verification Logs

**Date:** November 11, 2026  
**Branch:** `fix/paypal-commerce-hardening`  

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
collecting ... collected 11 items

tests/test_backend_api.py::test_missing_paypal_credentials_fails_closed PASSED [  9%]
tests/test_backend_api.py::test_health_check PASSED                      [ 18%]
tests/test_backend_api.py::test_catalogue_listing PASSED                 [ 27%]
tests/test_backend_api.py::test_server_authoritative_quote PASSED        [ 36%]
tests/test_backend_api.py::test_create_order_and_successful_capture_flow PASSED [ 45%]
tests/test_backend_api.py::test_capture_order_binding_mismatch PASSED    [ 54%]
tests/test_backend_api.py::test_capture_amount_mismatch_fails PASSED     [ 63%]
tests/test_backend_api.py::test_capture_currency_mismatch_fails PASSED   [ 72%]
tests/test_backend_api.py::test_capture_missing_capture_id_fails PASSED  [ 81%]
tests/test_backend_api.py::test_webhook_missing_headers_rejected PASSED  [ 90%]
tests/test_backend_api.py::test_webhook_cryptographic_verification_and_idempotency PASSED [100%]

======================= 11 passed, 2 warnings in 2.25s ========================
```

---

## 2. Frontend Automated Test Suite (vitest)

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> npm test -- --run

> fieldsense-ai@0.0.0 test
> vitest run --run

 RUN  v5.0.3 C:/Users/Nikhil Raman K/.gemini/antigravity/scratch/fieldsense-ai

 ✓ src/test/image.test.ts (3 tests) 10ms
 ✓ src/test/missions.test.ts (3 tests) 9ms
 ✓ src/test/observer.test.ts (3 tests) 9ms
 ✓ src/test/journal.test.ts (4 tests) 34ms
 ✓ src/test/checkout.test.tsx (3 tests) 567ms
   ✓ RemediationDrawer PayPal Checkout Flow (3)
     ✓ calls createBackendPayPalOrder exactly once and captures the exact same order 345ms
     ✓ handles checkout cancellation gracefully without showing success
     ✓ handles capture failure gracefully without showing success

 Test Files  5 passed (5)
      Tests  16 passed (16)
   Start at  22:48:19
   Duration  5.70s
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
dist/assets/index-BTgAuRff.js   448.49 kB │ gzip: 140.57 kB

✓ built in 1.17s
```

---

## 4. Linting Verification

```text
C:\Users\Nikhil Raman K\.gemini\antigravity\scratch\fieldsense-ai> npm run lint

> fieldsense-ai@0.0.0 lint
> oxlint

Found 9 warnings and 0 errors.
Finished in 38ms on 26 files with 116 rules using 12 threads.
```
