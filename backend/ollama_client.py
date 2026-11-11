import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1:8b"

SYSTEM_PROMPT = """You are FieldSense AI, a coordinator of specialist field science agents (Plant Pathology & Entomology, Soil Agronomy & Root Physiology, and Environmental Ecology & Micro-Climate).
Your core objective: Move from raw field observations to evidence-based explanations—NEVER jump straight to a single hasty diagnosis.
Coordinate specialist agents, evaluate competing hypotheses, identify supporting vs contradicting evidence, and recommend concrete discriminating tests to separate them.

Respond STRICTLY in valid JSON matching this schema:
{
  "summary": "Concise factual summary of the field investigation",
  "observed_facts": ["Direct factual observations recorded on site"],
  "context_facts": ["Environmental, soil, or weather context facts"],
  "competing_hypotheses": [
    {
      "id": "hyp-1",
      "name": "Hypothesis name (e.g. Mobile Nutrient Translocation, Root Zone Anoxia, Vascular Wilt, Abiotic Stress)",
      "plausibility": "likely",
      "supporting_evidence": ["Evidence directly supporting this hypothesis"],
      "contradicting_evidence": ["Evidence that makes this hypothesis unlikely or contradicts it"],
      "missing_distinguishing_clue": "Key missing clue needed to confirm or rule out"
    }
  ],
  "discriminating_tests": [
    {
      "target_hypotheses": "Which competing hypotheses this test separates",
      "recommended_action": "Concrete field test action (e.g. soil ribbon test, scrape cambium, inspect leaf underside)",
      "what_to_look_for": "What positive vs negative results look like",
      "risk_or_impact": "Non-destructive or low impact note"
    }
  ],
  "system_confidence": "moderate",
  "confidence_rationale": "Why uncertainty remains and why further field tests are required",
  "what_remains_unknown": ["Critical factors not yet known from current visual observation"],
  "more_evidence_needed": false,
  "clarifying_question_for_user": null
}"""

class OllamaBackendClient:
    """
    Client for interacting with local Ollama runtime to produce structured
    field investigation reports via genuine LLM inference.
    """
    def __init__(self, base_url: str = DEFAULT_OLLAMA_URL, model: str = DEFAULT_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    selected_model = self.model if self.model in models else (models[0] if models else self.model)
                    return {
                        "is_reachable": True,
                        "available_models": models,
                        "selected_model": selected_model,
                    }
                return {"is_reachable": False, "status_code": res.status_code}
        except Exception as e:
            return {"is_reachable": False, "error": str(e)}

    async def generate_investigation(
        self,
        observation_text: str,
        image_base64: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        health = await self.check_health()
        if not health.get("is_reachable"):
            logger.warning("Ollama is not reachable at %s. Falling back to offline heuristics.", self.base_url)
            return None

        active_model = health.get("selected_model", self.model)

        context_str = ""
        if context:
            context_str = (
                f"\nField Context:\n"
                f"- Affected Parts: {context.get('affected_parts', 'Not specified')}\n"
                f"- Symptom Pattern: {context.get('symptom_pattern', 'Not specified')}\n"
                f"- Soil Moisture: {context.get('soil_moisture', 'Not specified')}\n"
                f"- Recent Weather: {context.get('recent_weather', 'Not specified')}\n"
                f"- Spread Extent: {context.get('spread_extent', 'Not specified')}\n"
                f"- Habitat: {context.get('habitat_context', 'Not specified')}\n"
            )

        prompt = (
            f"Field Observation Note:\n{observation_text}\n"
            f"{context_str}\n"
            f"Coordinate specialist agents to formulate competing hypotheses with supporting and contradicting evidence, "
            f"and define discriminating field tests to separate them. Return strictly valid JSON matching the schema."
        )

        payload: Dict[str, Any] = {
            "model": active_model,
            "prompt": prompt,
            "system": SYSTEM_PROMPT,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
            },
        }

        if image_base64:
            clean_b64 = re.sub(r"^data:image/[a-zA-Z]+;base64,", "", image_base64)
            payload["images"] = [clean_b64]

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code != 200:
                    logger.error("Ollama generate failed with code %d: %s", res.status_code, res.text)
                    return None

                data = res.json()
                raw_response = data.get("response", "")

                try:
                    parsed = json.loads(raw_response)
                except Exception:
                    match = re.search(r"\{[\s\S]*\}", raw_response)
                    if match:
                        parsed = json.loads(match.group(0))
                    else:
                        logger.error("Failed to parse JSON from Ollama response: %s", raw_response[:200])
                        return None

                parsed["source_mode"] = "ollama_inference"
                parsed["model_used"] = active_model
                return parsed
        except Exception as e:
            logger.error("Error during Ollama inference: %s", str(e))
            return None
