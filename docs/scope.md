# Product Vision & Project Scope: FieldSense AI

## 1. Executive Summary & Vision Statement

**FieldSense AI** is an agentic, evidence-based agricultural intelligence and commerce platform. It transforms how field observers, community growers, and smallholder farmers diagnose plant health issues and procure trusted, physical remediation supplies.

Traditional plant diagnostics suffer from two compounding problems:
1. **Premature, hallucinated visual diagnosis**: Apps make instant, high-confidence claims from isolated photos, causing growers to spend money on improper chemicals.
2. **Disconnected commerce**: When an issue is identified, users are left to search unverified marketplaces, risking counterfeit or harmful inputs.

**FieldSense AI solves both:**
- It replaces instant diagnosis with an **autonomous multi-agent investigation** that formulates differential hypotheses and prescribes physical diagnostic tests.
- When an investigation requires physical supplies (pH test kits, hand lenses, organic bio-fungicides, trace micronutrients), it generates **catalogue-backed, server-validated quotations** and facilitates **tamper-proof PayPal Smart Checkout**.

---

## 2. In-Scope Capabilities

### 2.1 Multi-Agent Investigation & Reasoning
- **Multimodal Visual Inspection**: Ingestion and preprocessing of plant/specimen images passed to vision-capable local LLMs (Ollama-backed Llama 3.2-Vision / Gemma 3 / Moondream).
- **Differential Agronomic Reasoning**: Multi-agent investigation evaluating competing hypotheses (pathogenic, nutritional, environmental) with explicit supporting/contradicting evidence matrices and uncertainty scoring.
- **Hands-On Discriminating Field Tests**: Clear, actionable physical verification instructions (e.g., cambium scrapings, root smell checks, soil ribbon roll tests) to guide users outdoors.
- **Graceful Deterministic Fallback**: Transparent offline heuristic mode clearly badged as rule-based when local LLM services are offline.

### 2.2 Catalogue-Backed Recommendation Engine
- **Curated Remediation & Testing Catalogue**: A structured, versioned server-side catalogue of verified diagnostic tools, bio-inoculants, soil amendments, and organic treatments.
- **Deterministic Product Association**: Rule- and schema-governed mapping from diagnostic hypotheses and recommended field tests to matching catalogue items.
- **Server-Authoritative Quotation**: Dynamic price computation, currency handling (USD), inventory verification, and breakdown (subtotal, shipping, estimated tax) generated strictly on the server.

### 2.3 Secure PayPal Checkout & Order Management
- **Server-Side Order Lifecycle**: Complete order management in FastAPI backed by SQLite/SQLModel: `DRAFT`, `PENDING_PAYMENT`, `PAYMENT_CAPTURED`, `FAILED`, `CANCELLED`.
- **PayPal v2 Checkout Integration**:
  - Server-to-server order creation via PayPal REST API v2 (`POST /v2/checkout/orders`).
  - Server-to-server capture via PayPal REST API v2 (`POST /v2/checkout/orders/{id}/capture`).
- **Cryptographic Webhook Ingestion**: Webhook handler verifying signatures via PayPal's `/v1/notifications/verify-webhook-signature` endpoint.
- **Idempotency & Replay Protection**: Strict idempotency keys and database unique constraints preventing duplicate captures or replay attacks.
- **Server-Side Authority**: The frontend never marks an order as paid. Only verified backend captures or authenticated webhooks mutate payment status.

### 2.4 User Experience & Interface
- **Primary Canonical Client**: React 19 + TypeScript Single Page Application styled with botanical design system.
- **Interactive Remediation Cart**: In-context recommendation drawer appearing directly alongside investigation reports.
- **PayPal Smart Payment Buttons**: Embedded `@paypal/react-paypal-js` components triggering server-backed checkout.
- **Order History & Receipt View**: Real-time order status tracking, digital receipts, and journal persistence.

---

## 3. Explicit Out-of-Scope Boundaries

The following capabilities are deliberately out of scope for this hackathon engineering milestone:
1. **Direct Card Payment Processing without PayPal**: No bespoke PCI-DSS card entry forms; all transactions must be brokered through PayPal.
2. **Third-Party Marketplace Merchant Payouts (PayPal Commerce Platform / Payouts API)**: Single merchant/platform sandbox account model only; multi-vendor split settlements are deferred.
3. **Automated Physical Inventory & Logistics Fulfillment Integration**: Orders represent confirmed purchases; warehouse/carrier shipping APIs (FedEx, UPS) are mocked or represented as fulfilled digitally.
4. **Cloud Multi-Tenant Authentication (OAuth/Auth0/Cognito)**: Single-user / local-first session model or bearer token prototype; production enterprise RBAC is deferred.
5. **Replacing Ollama with Cloud APIs by Default**: System is designed privacy-first for local execution; cloud model adapters are secondary extensions.

---

## 4. Architectural Boundaries & System Context

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIELD APPLICATION BOUNDARY                       │
│                                                                        │
│   ┌─────────────────────┐               ┌──────────────────────────┐   │
│   │   React 19 Frontend │◄─────────────►│   FastAPI Core Backend   │   │
│   │   • Investigation UI│  HTTP REST    │   • Auth & CORS Guards   │   │
│   │   • Cart & Checkout │               │   • Catalog Authority    │   │
│   │   • Smart Buttons   │               │   • Order Lifecycle DB   │   │
│   └──────────┬──────────┘               └────────────┬─────────────┘   │
│              │                                       │                 │
└──────────────┼───────────────────────────────────────┼─────────────────┘
               │                                       │
               ▼                                       ▼
    ┌─────────────────────┐               ┌──────────────────────────┐
    │    Ollama Daemon    │               │    PayPal REST API v2    │
    │  • Gemma 3 / Llama  │               │  • /v2/checkout/orders   │
    │  • Multimodal Vision│               │  • Webhook Verification  │
    └─────────────────────┘               └──────────────────────────┘
```

