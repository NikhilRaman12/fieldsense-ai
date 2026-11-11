# Product Requirements Document (PRD): FieldSense AI (PayPal AI Edition)

## 1. Overview & Business Goals

FieldSense AI bridges artificial intelligence and secure global commerce in agriculture. By connecting botanical diagnosis with instant, trusted remediation procurement via PayPal, growers can safely act on AI recommendations without risk of payment manipulation or purchasing improper remedies.

---

## 2. User Personas

1. **Elena (Urban / Community Gardener)**: Tends raised vegetable beds. Notices yellowing tomato foliage. Needs to know whether the plant is overwatered or nutrient-starved, and wants to purchase an inexpensive, verified soil test kit immediately.
2. **Marcus (Smallholder Organic Farmer)**: Manages an orchard. Faces recurring leaf scorch. Wants transparent, multi-hypothesis reasoning, zero cloud data leakage, and a seamless checkout experience via PayPal for organic microbial inoculants.
3. **Hackathon Judge / Auditor**: Inspects the codebase to evaluate technical rigor, real AI reasoning, cryptographic payment verification, idempotent order handling, and compliance with PayPal API standards.

---

## 3. Epics and User Stories

### Epic 1: Intelligent Field Investigation
- **US-1.1**: *As a grower, I want to upload a field photo and symptom notes so that an AI agent investigates potential causes across plant pathology, soil agronomy, and ecology.*
- **US-1.2**: *As a grower, I want to see competing hypotheses with supporting and contradicting evidence rather than a single hasty diagnosis, so I avoid premature chemical applications.*
- **US-1.3**: *As a grower, I want concrete physical field tests (e.g., soil ribbon tests, cambium inspections) so I can verify conditions with my own hands.*

### Epic 2: Catalogue-Backed Recommendation & Quotation
- **US-2.1**: *As a grower, I want the investigation report to recommend relevant diagnostic tools or organic remedies from a verified catalogue so I know exactly what products address my field findings.*
- **US-2.2**: *As a user, I want server-calculated pricing and quotes (subtotal, tax, shipping) so that prices are guaranteed accurate and immune to client tampering.*

### Epic 3: Secure PayPal Order Lifecycle
- **US-3.1**: *As a shopper, I want to click PayPal Smart Payment Buttons to authorize payment securely without exposing financial details to the application.*
- **US-3.2**: *As a developer/merchant, I want orders created server-side in PayPal so that client tampering of amounts, currencies, or line items is completely prevented.*
- **US-3.3**: *As a developer/merchant, I want server-side capture execution with database locking so that double-captures and race conditions cannot occur.*

### Epic 4: Asynchronous Reconciliation & Webhooks
- **US-4.1**: *As a system administrator, I want PayPal webhook notifications (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`) cryptographically verified before updating order states.*
- **US-4.2**: *As a system administrator, I want idempotent event processing so that duplicate webhook deliveries do not corrupt order records or trigger duplicate fulfillments.*

### Epic 5: Order History & User Transparency
- **US-5.1**: *As a grower, I want to see my past orders, digital receipts, and associated investigation links in my local history.*
- **US-5.2**: *As a user, I want clear visual indicators distinguishing real AI inference from rule-based offline fallbacks.*

---

## 4. Acceptance Criteria Matrix

| Requirement ID | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **AC-01** | US-1.1 | The backend processes `observation_text` and `image_base64` using an Ollama multimodal model; returns structured JSON conforming to `FieldInvestigationReport`. |
| **AC-02** | US-1.2 | The response contains $\ge 2$ competing hypotheses, each with non-empty `supporting_evidence`, `contradicting_evidence`, and `missing_distinguishing_clue`. |
| **AC-03** | US-2.1 | When an investigation suggests a test or treatment, matching products from `catalogue.json` are returned with valid SKU, title, price, and currency. |
| **AC-04** | US-2.2 | The `/api/orders/quote` endpoint validates SKU existence, recalculates subtotal, applies verified shipping/tax rates, and returns a signed quote or order token. |
| **AC-05** | US-3.1 | Clicking PayPal Smart Buttons invokes `/api/orders/create`, which requests a PayPal v2 order token using server-side client ID and secret. |
| **AC-06** | US-3.2 | The PayPal Order payload contains strict `item_total`, `tax_total`, `shipping`, and itemized breakdown matching the server calculation exactly. |
| **AC-07** | US-3.3 | The `/api/orders/capture` endpoint calls PayPal `/v2/checkout/orders/{id}/capture` server-to-server. Status transitions to `COMPLETED` only after PayPal responds with `status: "COMPLETED"`. |
| **AC-08** | US-4.1 | Webhook endpoint rejects requests where PayPal signature verification returns `VERIFICATION_STATUS: "FAILURE"` or if required security headers are missing. |
| **AC-09** | US-4.2 | Processing a webhook event twice with the same event ID returns `200 OK` without duplicating database state or status mutations. |
| **AC-10** | US-5.1 | The client displays order history with status badges (`PENDING`, `COMPLETED`, `FAILED`), PayPal Transaction ID, and timestamp. |

