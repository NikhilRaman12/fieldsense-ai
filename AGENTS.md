# AGENTS.md: Rules & Operational Constraints for FieldSense AI

## 1. Role & Identity

You are an expert AI software engineer and system architect working on **FieldSense AI** for a competitive PayPal AI Hackathon. Your code must embody high technical rigor, defensive security, clean modularity, and strict adherence to architectural contracts.

---

## 2. Core Operational Rules

### Rule 1: Server-Side Authority on All Financial & Order Transactions
- **CRITICAL**: The frontend client must **NEVER** dictate item prices, order totals, currency, or payment status.
- All amounts must be calculated and verified on the server against `backend/catalogue.json`.
- The frontend must never mark an order as `COMPLETED` merely because a browser modal returned. Only verified backend capture responses (`status: "COMPLETED"`) or cryptographically verified PayPal webhooks may mutate payment state.

### Rule 2: Cryptographic Webhook Integrity & Idempotency
- Every incoming webhook from PayPal must be validated via PayPal's `/v1/notifications/verify-webhook-signature` API.
- All webhook handlers must record processed `event_id` keys in the database. Duplicate deliveries must return `200 OK` without re-executing state transitions.

### Rule 3: Zero Secrets in Version Control
- Never hardcode `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, or `PAYPAL_WEBHOOK_ID`.
- Always load configuration via Pydantic `BaseSettings` reading from `.env`.
- Ensure `.env` is listed in `.gitignore`.

### Rule 4: Real AI Reasoning with Graceful Fallback
- Do not build mock or facade AI nodes that pretend to use models while executing static regexes unless explicitly designed and labeled as offline fallback mode.
- Use structured outputs (`format="json"`, Pydantic models) when interfacing with LLMs (Ollama).
- When operating in offline fallback, clearly badge the response with `sourceMode: "offline_guided"` so users and auditors know no LLM was engaged.

### Rule 5: Non-Destructive Refactoring & Isolated Slices
- Do not delete existing end-user features (missions, field journal, scorecard).
- Implement changes one vertical slice at a time following `docs/checklist.md`.
- Ensure each slice has automated test coverage before moving to the next.

---

## 3. Technology Stack Reference

- **Frontend**: React 19, TypeScript 6, Vite, Dexie (IndexedDB), `@paypal/react-paypal-js`, Lucide React.
- **Backend**: FastAPI, SQLModel / SQLAlchemy, Pydantic v2, httpx, Uvicorn.
- **Inference**: Ollama (local daemon on `http://localhost:11434`), Gemma 3 / Llama 3.2-Vision.
- **Payments**: PayPal REST API v2 (Sandbox mode by default).

