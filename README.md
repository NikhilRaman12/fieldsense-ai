# 🌿 FieldSense Commerce AI

**Step outside. Observe deeply. Act with confidence.**  
*An evidence-based agricultural intelligence and commerce platform for the PayPal AI Hackathon.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PayPal](https://img.shields.io/badge/PayPal-REST%20v2%20Checkout-003087?logo=paypal)](https://developer.paypal.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.6-orange)](https://langchain-ai.github.io/langgraph/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-purple)](https://ollama.com/)

---

## 🎯 What FieldSense Commerce AI Does

Traditional plant diagnosis apps frequently jump to premature, single-crop classifications from an isolated photo, often directing growers immediately to buy chemicals based on hasty assumptions.

**FieldSense AI transforms this paradigm:**
1. **Multi-Agent Scientific Investigation**: Rather than guessing from a photo, the platform models competing hypotheses across plant pathology, root physiology, soil moisture, and micro-climate stress.
2. **Prescribed Field Tests**: Guides growers outdoors to perform physical discriminating tests (soil ribbon tests, root-core olfactory inspection, cambium scrapes) before committing to treatments.
3. **Evidence-Grounded Catalogue Procurement**: Links diagnostic hypotheses directly to server-verified remediation and soil test supplies from an authoritative local catalogue.
4. **Server-Authoritative PayPal v2 Checkout**: Enforces server pricing authority, cryptographic capture validation, strict order binding, and idempotent webhook reconciliation via the PayPal REST API v2.

---

## 🤖 What AI Actually Does

- **Ollama Local LLM Inference (`llama3.1:8b` or vision-capable models)**: When Ollama is running locally, FieldSense delivers multimodal prompt payloads (observation text, field parameters, base64 photo) to generate structured hypotheses and discriminating tests adhering to a strict Pydantic JSON schema.
- **LangGraph Deterministic Heuristics**: If Ollama is offline or uninstalled, a compiled LangGraph state workflow (`investigation_graph.py`) executes deterministic agronomic decision rules across 6 modular nodes. The UI explicitly flags this with a `langgraph_offline_heuristics` banner to ensure complete transparency.
- **Uncertainty & Agronomic Honesty**: The system distinguishes between observed facts, environmental context, competing hypotheses, and unknowns. Recommendations are grounded in catalogue items rather than hallucinated products. Growers are explicitly advised to consult accredited local extension services or professional agronomists for commercial decisions.

---

## 💳 How PayPal Is Integrated

FieldSense AI implements a zero-simulation, fail-closed PayPal REST API v2 integration:
- **Server Quote Authority (`/api/orders/quote`)**: Quotes are calculated strictly on the backend by querying `catalogue.json`. Client-side price or quantity tampering is impossible.
- **Order Creation (`/api/orders/create`)**: Generates an internal order record in SQLite and creates a companion PayPal order with purchase units itemized against the authoritative quote.
- **Fail-Closed Runtime**: Missing PayPal credentials cause the backend to return HTTP 503 (`PAYPAL_UNCONFIGURED`). No synthetic tokens, mock orders, or fake capture IDs exist in runtime.
- **Client Configuration Guard**: If `VITE_PAYPAL_CLIENT_ID` is unset, the React drawer disables PayPal buttons and presents an actionable configuration warning.
- **Order Binding & Capture Validation (`/api/orders/{id}/capture`)**: Validates that the client-supplied PayPal order matches the exact PayPal order bound to the local database record. Captures funds server-to-server and verifies status `COMPLETED`, non-empty `capture_id`, custom reference match, and exact currency/amount equality.
- **Cryptographic Webhooks (`/api/payments/webhook`)**: Ingests `PAYMENT.CAPTURE.COMPLETED` events, validates all PayPal transmission headers against PayPal's official signature verification endpoint, and guarantees idempotent reconciliation.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FieldSense Client Layer                         │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │  React 19 + Vite    │   │      @paypal/react-paypal-js         │   │
│   │  • Field Missions   │   │      • PayPal Smart Payment Buttons  │   │
│   │  • AI Observer View │   │      • In-Context Remediation Drawer │   │
│   │  • Field Journal    │   │      • Orders History & Receipts     │   │
│   └──────────┬──────────┘   └──────────────────┬───────────────────┘   │
└──────────────┼─────────────────────────────────┼───────────────────────┘
               │                                 │
               ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Core Backend                            │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │ InvestigationEngine │   │   CatalogueService  │   │OrderManager│   │
│   │ • Ollama multimodal │   │ • catalogue.json    │   │• SQLite    │   │
│   │ • LangGraph State   │   │ • Quote calculator  │   │• SQLModel  │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └──────┬─────┘   │
│              │                         │                     │         │
│              ▼                         ▼                     ▼         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    PayPalClient Adapter                        │   │
│   │ • Server-to-server OAuth2 & /v2/checkout/orders                │   │
│   │ • Strict capture validation (amount, currency, order binding)   │   │
│   │ • Cryptographic webhook verification & idempotency             │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
                      PayPal REST API v2 (Sandbox)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** $\ge 18$
- **Python** $\ge 3.10$
- **Ollama** (Optional for local inference; fallback activates if uninstalled)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/NikhilRaman12/fieldsense-ai.git
cd fieldsense-ai

# Copy environment template
cp .env.example .env
```
Fill in your PayPal Sandbox credentials in `.env` (obtainable at [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox)).

### 2. Start the FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# → Listening at http://127.0.0.1:8000
```

### 3. Start the React Frontend
```bash
# In the repository root
npm install
npm run dev
# → Open http://localhost:5173
```

---

## 🐳 Docker Deployment

A containerized deployment is configured via Docker Compose:

```bash
docker compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- SQLite volume: mounted persistently at `./backend/data`

---

## 🧪 Automated Testing & Verification

Comprehensive automated test suites cover AI fallback, catalogue quoting, PayPal order binding, and webhook deduplication:

```bash
# Backend pytest suite (17 passed)
cd backend && python -m pytest tests/test_backend_api.py -v

# Frontend Vitest suite (17 passed)
npm test -- --run

# Frontend production build (0 errors)
npm run build

# Frontend linting (0 errors)
npm run lint
```

---

## ⚠️ Demo Scope & Limitations

- **Public Demo Deployment**: This repository runs in local development mode or via local Docker containers. There is no public production URL hosted on the internet for this hackathon submission.
- **Single-User Demo Mode**: The application order history currently displays all locally persisted orders without multi-tenant authentication. In production, order access would be partitioned by authenticated user identity.
- **PayPal Mode**: Configured for the official PayPal Sandbox environment (`PAYPAL_ENV=sandbox`).

---

## 📖 Judging & Documentation Resources

- **[docs/submission-readiness-report.md](docs/submission-readiness-report.md)**: Official hackathon submission gate assessment.
- **[docs/payment-security-review.md](docs/payment-security-review.md)**: Cryptographic and order-binding security architecture.
- **[docs/deployment-runbook.md](docs/deployment-runbook.md)**: Step-by-step setup and PayPal Sandbox test instructions.
- **[docs/demo-runbook.md](docs/demo-runbook.md)**: 5-minute judge demonstration script.
- **[docs/final-audit.md](docs/final-audit.md)**: Line-by-line audit of all 8 core execution paths.
- **[docs/test-evidence.md](docs/test-evidence.md)**: Verified test run logs across frontend and backend.

---

## 📜 License
MIT — see [LICENSE](LICENSE)
