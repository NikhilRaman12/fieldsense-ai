# FieldSense AI: Deployment Runbook & PayPal Sandbox Setup

This guide walks through deploying the application and running verified end-to-end PayPal Sandbox test payments.

---

## 1. Prerequisites

- **Python 3.11+** installed
- **Node.js 20+** and `npm` installed
- **Docker & Docker Compose** (optional for containerized deployments)
- A **PayPal Developer Account** with a Sandbox REST App created at [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox)

---

## 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Backend PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id_here
PAYPAL_ENV=sandbox

# Backend CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
```

> **Security Alert:** Never commit real API keys or credentials to version control. The `.env` file is excluded via `.gitignore`.

---

## 3. Local Development Startup

### Terminal 1: Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Verify the backend is live at `http://localhost:8000/api/health`.

### Terminal 2: Frontend
```bash
# In the project root:
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Docker Compose Deployment

To run both services in isolated containers:

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## 5. End-to-End PayPal Sandbox Verification Procedure

Follow these manual steps to verify PayPal checkout against the official PayPal Sandbox:

1. **Obtain Sandbox Buyer Credentials**:
   - In PayPal Developer Dashboard, navigate to **Sandbox > Accounts**.
   - Copy the email and password for a Personal Sandbox Buyer account.

2. **Trigger an AI Recommendation or Select Products**:
   - Open `http://localhost:5173`.
   - Run an AI field investigation or click **Order Supplies** on any mission/observation.
   - In the **Remediation & Supplies** drawer, choose the desired quantities. Notice the server-calculated subtotal, tax, and total.

3. **Initiate Checkout**:
   - Click the PayPal button inside the drawer.
   - Verify network request: `POST /api/paypal/create-order`.
   - Ensure the response returns both `order_id` (local SQLite ID) and `paypal_order_id` (e.g., `8XY...`).

4. **Approve Payment**:
   - In the PayPal popup modal, log in with the Sandbox Buyer account.
   - Confirm payment with Sandbox funds.

5. **Capture & Binding Verification**:
   - Upon modal completion, observe network request: `POST /api/paypal/capture-order` containing `{ order_id, paypal_order_id }`.
   - The backend validates the order binding, captures the funds via PayPal API, updates the DB order record to `COMPLETED`, and saves the actual `capture_id`.
   - The UI displays a green success confirmation containing the real PayPal Capture ID and order summary.
   - The PayPal buttons disappear, preventing duplicate charges.

6. **Order History Inspection**:
   - Navigate to the **Orders** tab in FieldSense AI.
   - Verify the newly completed order appears with:
     - Correct status badge (`COMPLETED`)
     - Real PayPal Order ID and Capture ID
     - Accurate itemized list and server-authoritative total.
