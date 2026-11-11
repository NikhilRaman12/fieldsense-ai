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

Traditional plant diagnosis apps often jump to premature, high-confidence classifications from an isolated photo, frequently advising growers to immediately buy synthetic chemicals.

**FieldSense AI flips this paradigm:**
1. **Multi-Agent Investigation**: Rather than guessing from a single snapshot, the AI investigates multiple competing hypotheses across plant pathology, root agronomy, and micro-climate conditions.
2. **Prescribed Physical Tests**: Directs users outdoors to perform physical checks (soil ribbon tests, root core smell checks, cambium scrapes) to separate competing causes.
3. **Grounded Catalogue Procurement**: Directly connects diagnostic hypotheses to server-verified remediation and testing supplies.
4. **Server-Authoritative PayPal Checkout**: Enforces server pricing authority, order binding, cryptographic capture validation, and idempotent webhook reconciliation via PayPal REST API v2.

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
- **Ollama** (Optional for local AI models like `gemma` or `llama3.1`; transparent offline fallback activates if unavailable)

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

A complete containerized deployment is available via Docker Compose:

```bash
docker compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- SQLite volume: mounted persistently at `./backend/data`

---

## 🧪 Automated Testing & Verification

The project includes unit and integration test suites covering AI validation, catalogue rules, PayPal order binding, and webhook deduplication:

```bash
# Backend pytest suite (8 tests)
cd backend && pytest tests/test_backend_api.py -v

# Frontend Vitest suite (13 tests)
npm test -- --run

# Frontend TypeScript build
npm run build
```

---

## 📖 Documentation & Judging Resources

- **[docs/demo-runbook.md](docs/demo-runbook.md)**: 5-minute step-by-step judging walkthrough.
- **[docs/final-audit.md](docs/final-audit.md)**: Line-by-line audit of all 8 execution paths.
- **[docs/fix-report.md](docs/fix-report.md)**: Detailed report of all security and architectural fixes.
- **[docs/test-evidence.md](docs/test-evidence.md)**: Complete test execution logs and proofs.
- **[docs/spec.md](docs/spec.md)**: API endpoint specifications and data models.

---

## 📜 License
MIT — see [LICENSE](LICENSE)
