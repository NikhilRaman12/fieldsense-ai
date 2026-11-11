import json
import os
from typing import List, Dict, Any, Optional

CATALOGUE_PATH = os.path.join(os.path.dirname(__file__), "catalogue.json")

def load_catalogue() -> List[Dict[str, Any]]:
    if os.path.exists(CATALOGUE_PATH):
        with open(CATALOGUE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def get_product_by_sku(sku: str) -> Optional[Dict[str, Any]]:
    catalogue = load_catalogue()
    for item in catalogue:
        if item.get("sku") == sku:
            return item
    return None

def match_products_for_hypotheses(hypotheses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    catalogue = load_catalogue()
    matched = []
    matched_skus = set()

    hyp_names = [h.get("name", "").lower() for h in hypotheses]

    for product in catalogue:
        sku = product["sku"]
        if sku in matched_skus:
            continue

        targets = [t.lower() for t in product.get("target_hypotheses", [])]
        for h_name in hyp_names:
            if any(t in h_name or h_name in t for t in targets):
                matched.append(product)
                matched_skus.add(sku)
                break

    # If no specific matches, provide the diagnostic soil kit by default
    if not matched and catalogue:
        matched.append(catalogue[0])

    return matched

def calculate_quote(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Server-authoritative quote calculation.
    Never trusts client prices. Always recalculates from catalogue.json.
    """
    validated_items = []
    subtotal = 0.0

    if not items:
        raise ValueError("Cannot calculate quote for empty items list.")

    for req_item in items:
        sku = req_item.get("sku")
        try:
            quantity = int(req_item.get("quantity", 1))
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quantity for SKU: {sku}")

        if quantity <= 0 or quantity > 100:
            raise ValueError(f"Quantity for SKU '{sku}' must be between 1 and 100.")

        product = get_product_by_sku(sku)
        if not product:
            raise ValueError(f"Invalid or unknown product SKU: {sku}")

        unit_price = float(product["price"])
        item_total = round(unit_price * quantity, 2)
        subtotal += item_total

        validated_items.append({
            "sku": sku,
            "title": product["title"],
            "unit_price": unit_price,
            "quantity": quantity,
            "total_price": item_total,
            "currency": product.get("currency", "USD"),
        })

    subtotal = round(subtotal, 2)
    # Fixed shipping rule: $4.99 standard, free over $50
    shipping = 0.0 if subtotal >= 50.0 or subtotal == 0 else 4.99
    # Estimated standard tax: 6.5%
    tax = round(subtotal * 0.065, 2)
    total = round(subtotal + shipping + tax, 2)

    return {
        "items": validated_items,
        "subtotal": subtotal,
        "shipping": shipping,
        "tax": tax,
        "total": total,
        "currency": "USD",
    }
