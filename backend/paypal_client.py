import os
import json
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

class PayPalClient:
    """
    Server-side PayPal REST API v2 client.
    Handles OAuth2 token acquisition, order creation, capture, and webhook signature verification.
    """
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        webhook_id: Optional[str] = None,
        environment: str = "sandbox",
    ):
        self.client_id = client_id or os.getenv("PAYPAL_CLIENT_ID", "mock_client_id")
        self.client_secret = client_secret or os.getenv("PAYPAL_CLIENT_SECRET", "mock_client_secret")
        self.webhook_id = webhook_id or os.getenv("PAYPAL_WEBHOOK_ID", "mock_webhook_id")
        self.environment = environment or os.getenv("PAYPAL_ENV", "sandbox")

        if self.environment == "live":
            self.base_url = "https://api-m.paypal.com"
        else:
            self.base_url = "https://api-m.sandbox.paypal.com"

        self._access_token: Optional[str] = None

    def is_configured(self) -> bool:
        return (
            bool(self.client_id)
            and self.client_id != "mock_client_id"
            and bool(self.client_secret)
            and self.client_secret != "mock_client_secret"
        )

    async def get_access_token(self) -> str:
        if self._access_token:
            return self._access_token

        if not self.is_configured():
            # Return synthetic token for development/sandbox simulation
            logger.info("Using simulated sandbox access token.")
            return "A21AA_SIMULATED_PAYPAL_SANDBOX_ACCESS_TOKEN"

        auth = (self.client_id, self.client_secret)
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                auth=auth,
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json", "Accept-Language": "en_US"},
            )
            if res.status_code != 200:
                raise RuntimeError(f"PayPal OAuth failed ({res.status_code}): {res.text}")

            data = res.json()
            self._access_token = data.get("access_token")
            return self._access_token

    async def create_order(self, quote: Dict[str, Any], custom_reference: str) -> Dict[str, Any]:
        """
        Creates a v2/checkout/orders transaction on PayPal.
        Amounts are strictly pulled from the server-validated quote.
        """
        if not self.is_configured():
            import uuid
            mock_id = f"PAYPAL-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
            return {
                "id": mock_id,
                "status": "CREATED",
                "simulated": True,
                "links": [
                    {
                        "href": f"https://www.sandbox.paypal.com/checkoutnow?token={mock_id}",
                        "rel": "approve",
                        "method": "GET",
                    }
                ],
            }

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": custom_reference,
        }

        # Build PayPal purchase_units item breakdown
        items = []
        for item in quote.get("items", []):
            items.append({
                "name": item["title"][:127],
                "sku": item["sku"][:127],
                "unit_amount": {
                    "currency_code": quote.get("currency", "USD"),
                    "value": f"{item['unit_price']:.2f}",
                },
                "quantity": str(item["quantity"]),
                "category": "PHYSICAL_GOODS",
            })

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": custom_reference,
                    "description": "FieldSense AI Verified Field Remediation Supplies",
                    "custom_id": custom_reference,
                    "amount": {
                        "currency_code": quote.get("currency", "USD"),
                        "value": f"{quote['total']:.2f}",
                        "breakdown": {
                            "item_total": {
                                "currency_code": quote.get("currency", "USD"),
                                "value": f"{quote['subtotal']:.2f}",
                            },
                            "shipping": {
                                "currency_code": quote.get("currency", "USD"),
                                "value": f"{quote['shipping']:.2f}",
                            },
                            "tax_total": {
                                "currency_code": quote.get("currency", "USD"),
                                "value": f"{quote['tax']:.2f}",
                            },
                        },
                    },
                    "items": items,
                }
            ],
            "application_context": {
                "brand_name": "FieldSense AI",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
                "return_url": "http://localhost:5173/?paypal_status=approved",
                "cancel_url": "http://localhost:5173/?paypal_status=cancelled",
            },
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(f"{self.base_url}/v2/checkout/orders", headers=headers, json=payload)
            if res.status_code not in (200, 201):
                raise RuntimeError(f"PayPal Order Creation failed ({res.status_code}): {res.text}")
            return res.json()

    async def capture_order(self, paypal_order_id: str) -> Dict[str, Any]:
        """
        Captures authorized PayPal funds server-to-server.
        """
        if not self.is_configured():
            import uuid
            capture_id = f"CAP-{uuid.uuid4().hex[:12].upper()}"
            return {
                "id": paypal_order_id,
                "status": "COMPLETED",
                "simulated": True,
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": capture_id,
                                    "status": "COMPLETED",
                                }
                            ]
                        }
                    }
                ],
            }

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                headers=headers,
                json={},
            )
            if res.status_code not in (200, 201):
                raise RuntimeError(f"PayPal Order Capture failed ({res.status_code}): {res.text}")
            return res.json()

    async def verify_webhook_signature(
        self,
        transmission_id: str,
        transmission_time: str,
        cert_url: str,
        auth_algo: str,
        transmission_sig: str,
        raw_body: str,
    ) -> bool:
        """
        Verifies PayPal webhook authenticity via the verification endpoint.
        """
        if not self.is_configured():
            # In simulated development without credentials, verify non-empty headers
            return bool(transmission_id and transmission_sig)

        token = await self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        try:
            body_json = json.loads(raw_body)
        except Exception:
            return False

        verification_payload = {
            "transmission_id": transmission_id,
            "transmission_time": transmission_time,
            "cert_url": cert_url,
            "auth_algo": auth_algo,
            "transmission_sig": transmission_sig,
            "webhook_id": self.webhook_id,
            "webhook_event": body_json,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{self.base_url}/v1/notifications/verify-webhook-signature",
                headers=headers,
                json=verification_payload,
            )
            if res.status_code == 200:
                result = res.json()
                return result.get("verification_status") == "SUCCESS"
            return False

paypal_service = PayPalClient()
