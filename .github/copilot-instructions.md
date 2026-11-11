# GitHub Copilot Engineering Instructions: FieldSense AI

These instructions establish guidelines for GitHub Copilot and automated code review agents reviewing pull requests and commits in FieldSense AI.

---

## 1. Primary Review Criteria

When inspecting any code changes, pull requests, or diffs, enforce the following standards:

### 1.1 Payment & Transactional Security
- [ ] **No Client-Side Pricing**: Verify that no endpoint accepts an order `total` or `price` directly from the client. Prices must be derived from the server catalogue.
- [ ] **Idempotent Order Capture**: Verify that calls to `/api/orders/{id}/capture` lock the database row or check order state to prevent double-captures.
- [ ] **Webhook Signature Verification**: Verify that `/api/payments/webhook` verifies `paypal-transmission-sig` using PayPal's verification service before updating any database record.
- [ ] **Credential Protection**: Ensure no PayPal tokens, secrets, or API keys are committed or logged in plaintext.

### 1.2 AI Output & Model Validation
- [ ] **Structured Output Compliance**: Ensure all LLM responses are validated through Pydantic models before being sent to the client or database.
- [ ] **No Hidden Fakes**: Ensure that functions claiming to use AI/LLMs actually invoke models rather than static string checks, unless explicitly labeled as fallback heuristics (`sourceMode: "offline_guided"`).

### 1.3 State Management & Database Safety
- [ ] **State Machine Integrity**: Check that order status transitions strictly follow:
  `DRAFT` → `CREATED` → `APPROVED` → `COMPLETED` (or `FAILED` / `CANCELLED`).
  Disallow illegal jumps (e.g. `DRAFT` directly to `COMPLETED`).
- [ ] **Input Constraints**: Verify that all string inputs (`observation_text`, `image_base64`) have strict size boundaries (`Field(max_length=...)`).

### 1.4 API Contract & Backward Compatibility
- [ ] Ensure changes to Pydantic schemas in `backend/schemas.py` match the TypeScript types in `src/types/index.ts`.
- [ ] Verify CORS headers do not use wildcard `*` with credentials enabled.

---

## 2. Review Checklist for Automated PR Checks

When generating a PR review summary, format the evaluation against this template:

```markdown
## Copilot Architectural & Security Review

- [ ] **Payment Manipulation Risk**: (Pass / Flagged)
- [ ] **State Machine Validity**: (Pass / Flagged)
- [ ] **Webhook Idempotency & Auth**: (Pass / Flagged)
- [ ] **AI Contract & Validation**: (Pass / Flagged)
- [ ] **Test Coverage & Regression**: (Pass / Flagged)

### Findings & Recommendations
...
```

