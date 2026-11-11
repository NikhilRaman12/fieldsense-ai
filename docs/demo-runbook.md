# Judge & Demo Runbook: FieldSense Commerce AI

**Hackathon Challenge**: PayPal AI Hackathon  
**Target Scenario**: End-to-End Multimodal Plant Health Investigation & Server-Verified PayPal Remediation Checkout  
**Expected Duration**: 5 minutes  

---

## 1. Prerequisites & Environment Setup

### 1.1 Local Setup
Ensure the following tools are installed:
- **Python** $\ge 3.10$
- **Node.js** $\ge 18$
- **Ollama** (Optional for local AI inference; system automatically activates transparent, structured offline fallback if Ollama is not running)

### 1.2 Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. For real PayPal Sandbox testing, provide your credentials in `.env`:
   ```bash
   PAYPAL_ENV=sandbox
   PAYPAL_CLIENT_ID=<your-sandbox-client-id>
   PAYPAL_CLIENT_SECRET=<your-sandbox-client-secret>
   PAYPAL_WEBHOOK_ID=<your-sandbox-webhook-id>
   VITE_PAYPAL_CLIENT_ID=<your-sandbox-client-id>
   ```

---

## 2. Starting the Services

### Terminal 1: Backend (FastAPI Core)
```bash
cd backend
pip install -r requirements.txt
python main.py
# -> Server listening at http://127.0.0.1:8000
```

### Terminal 2: Frontend (React 19 + Vite)
```bash
npm install
npm run dev
# -> Local UI live at http://localhost:5173
```

---

## 3. Step-by-Step Judging Walkthrough

### Step 1: Record Field Observation & Attach Specimen
1. Open `http://localhost:5173` in your browser.
2. Click on the **AI Observer** tab.
3. In **Primary Field Observation Note**, enter:
   > *"Lower leaves turning distinctly yellow between the veins. Upper leaves remain deep green. Soil feels saturated from recent rain."*
4. Under **Field Context & Habitat Clues**, confirm:
   - Location: *Basal older leaves near plant base*
   - Symptom pattern: *Interveinal chlorosis*
   - Moisture: *Saturated / waterlogged from recent rain*
5. Click **Coordinate Investigation & Competing Hypotheses**.

### Step 2: Review Multi-Agent Diagnostic Findings
1. Notice the structured report generated:
   - **Directly Observed Empirical Evidence**: Chlorosis and anatomical distribution.
   - **Competing Biological Explanations**: Contrasts *Mobile Nutrient Translocation (Nitrogen/Magnesium)* against *Root Zone Anoxia (Waterlogging)* and *Vascular Wilt Occlusion*.
   - **Recommended Field Tests**: Physical actions like the *Soil Ribbon Test* and *Cambium Bark Scrape* rather than immediate chemical spraying.
   - **System Confidence & What Remains Unknown**: Honest estimation of diagnostic uncertainty.

### Step 3: Inspect Recommended Diagnostic & Remediation Supplies
1. Below the field tests, locate the green banner:
   **"Verified Diagnostic & Remediation Supplies (Recommended)"**
2. Click **View Supplies & PayPal Checkout**.
3. A modal opens with supplies matched directly to the investigation:
   - *Precision Soil Ribbon & pH Field Test Kit* ($18.99)
   - *Chelated Magnesium & Nitrogen Organic Bio-Fertilizer* ($24.00)
4. Notice the **Server-Validated Quote Summary**: Subtotal, standard shipping ($4.99 or free over $50), and estimated tax calculated exclusively on the server.

### Step 4: Authorize & Capture via PayPal Sandbox
1. Click the golden **PayPal** Smart Payment Button in the modal.
2. Sign in with your PayPal Sandbox Buyer account (or test credentials).
3. Confirm the payment.
4. Watch the flow complete:
   - `createOrder` creates exactly one local order in SQLite and one PayPal order token.
   - `onApprove` calls the backend capture endpoint `/api/orders/{id}/capture`.
   - The backend validates order binding, checks captured amounts, and updates the order status to `COMPLETED`.
   - A green confirmation screen appears displaying the **PayPal Capture ID**.

### Step 5: Verify Order History & Audit Trail
1. In the top navigation, click on the **Field Supplies** tab.
2. Observe your verified order listed with:
   - Order Reference (e.g. `fs-ord-a1b2c3d4e5`)
   - Status badge: `Captured & Confirmed`
   - Itemized breakdown matching server catalogue pricing
   - PayPal Capture ID recorded in the permanent audit trail.

---

## 4. Automated Verification Commands

Judges can execute all automated test suites locally:

```bash
# Run backend pytest suite (order binding, capture validation, webhooks, catalogue)
cd backend && pytest tests/test_backend_api.py -v

# Run frontend Vitest suite (observations, missions, journal, image validation)
npm test -- --run

# Run frontend production build
npm run build
```
