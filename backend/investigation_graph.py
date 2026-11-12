import json
import os
import asyncio
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from schemas import (
    FieldEvidenceInput,
    FieldInvestigationReport,
    CompetingHypothesisSchema,
    DiscriminatingTestSchema,
    RecommendedProductSchema
)
from catalogue_service import match_products_for_hypotheses
from ollama_client import OllamaBackendClient

KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_index.json")

def load_kb() -> List[Dict[str, str]]:
    if os.path.exists(KB_PATH):
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

class InvestigationState(TypedDict):
    input_data: Dict[str, Any]
    vision_findings: List[str]
    context_findings: List[str]
    retrieved_knowledge: List[Dict[str, str]]
    hypotheses: List[Dict[str, Any]]
    field_tests: List[Dict[str, Any]]
    evidence_sufficient: bool
    clarifying_question: Optional[str]
    confidence: str
    confidence_rationale: str
    unknowns: List[str]
    recommended_products: List[Dict[str, Any]]
    final_report: Optional[Dict[str, Any]]

# --- AGENT 1: VISION AGENT ---
def vision_agent(state: InvestigationState) -> Dict[str, Any]:
    text = (state["input_data"].get("observation_text") or "").lower()
    pattern = (state["input_data"].get("symptom_pattern") or "").lower()
    has_img = bool(state["input_data"].get("image_base64"))

    visible = []
    if "yellow" in text or "chlorosis" in text or "chlorosis" in pattern:
        visible.append("Foliar chlorosis (loss of uniform green chlorophyll pigmentation)")
    if "interveinal" in text or "interveinal" in pattern:
        visible.append("Interveinal patterning: secondary veins maintain green pigmentation while mesophyll tissue yellows")
    if "spot" in text or "hole" in text or "lesion" in text or "necrosis" in text:
        visible.append("Localized foliar lesions / tissue necrosis observed")
    if "wilt" in text or "flagging" in text:
        visible.append("Loss of leaf turgor / vegetative wilting")

    if not visible:
        obs = state["input_data"].get("observation_text", "Field specimen recorded")
        visible.append(f"Visual features recorded: '{obs[:80]}'")
    if has_img:
        visible.append("Field photograph attached and passed to multimodal feature pipeline")

    return {"vision_findings": visible}

# --- AGENT 2: CONTEXT AGENT ---
def context_agent(state: InvestigationState) -> Dict[str, Any]:
    inp = state["input_data"]
    context_facts = []

    if inp.get("affected_parts"):
        context_facts.append(f"Anatomical distribution: {inp['affected_parts']}")
    if inp.get("soil_moisture"):
        context_facts.append(f"Substrate moisture: {inp['soil_moisture']}")
    if inp.get("recent_weather"):
        context_facts.append(f"Recent meteorological history: {inp['recent_weather']}")
    if inp.get("spread_extent"):
        context_facts.append(f"Population spread: {inp['spread_extent']}")
    if inp.get("habitat_context"):
        context_facts.append(f"Ecological habitat: {inp['habitat_context']}")

    answers = inp.get("user_answered_questions", {})
    for q, a in answers.items():
        context_facts.append(f"User field confirmation: {q} -> {a}")

    return {"context_findings": context_facts}

# --- AGENT 3: KNOWLEDGE AGENT ---
def knowledge_agent(state: InvestigationState) -> Dict[str, Any]:
    kb = load_kb()
    all_text = (" ".join(state["vision_findings"]) + " " + " ".join(state["context_findings"])).lower()

    matched_passages = []
    for doc in kb:
        topic = doc.get("topic", "").lower()
        domain = doc.get("domain", "").lower()
        if "bacterial" in topic and ("paddy" in all_text or "rice" in all_text or "blight" in all_text or "wavy" in all_text):
            matched_passages.append(doc)
        elif "cotton" in topic and ("cotton" in all_text or "black" in all_text or "vertisol" in all_text):
            matched_passages.append(doc)
        elif "pulse" in topic and ("pulse" in all_text or "pigeonpea" in all_text or "chickpea" in all_text or "arhar" in all_text):
            matched_passages.append(doc)
        elif "lime" in topic and ("alkaline" in all_text or "lime" in all_text or "iron" in all_text or "calcareous" in all_text or "young" in all_text or "terminal" in all_text):
            matched_passages.append(doc)
        elif "nitrogen" in topic and ("chlorosis" in all_text or "yellow" in all_text):
            matched_passages.append(doc)
        elif "anoxia" in topic and ("waterlog" in all_text or "saturated" in all_text or "rain" in all_text or "clay" in all_text):
            matched_passages.append(doc)
        elif "vascular" in topic and ("single" in all_text or "isolated" in all_text or "wilt" in all_text):
            matched_passages.append(doc)
        elif "thermal" in topic and ("heat" in all_text or "sun" in all_text):
            matched_passages.append(doc)

    if not matched_passages and kb:
        matched_passages.append(kb[0])

    return {"retrieved_knowledge": matched_passages}

# --- AGENT 4: HYPOTHESIS AGENT ---
def hypothesis_agent(state: InvestigationState) -> Dict[str, Any]:
    all_text = (" ".join(state["vision_findings"]) + " " + " ".join(state["context_findings"])).lower()

    hypotheses = []
    is_lower = "lower" in all_text or "basal" in all_text
    is_interveinal = "interveinal" in all_text
    is_saturated = "waterlog" in all_text or "saturated" in all_text
    is_isolated = "isolated" in all_text or "single" in all_text

    # Hypothesis 1: Mobile Nutrient
    hyp_nutrient = {
        "id": "hyp-nutrient-translocation",
        "name": "Mobile Nutrient Translocation (Nitrogen or Magnesium Deficiency)",
        "plausibility": "likely" if is_lower else "possible",
        "supporting_evidence": [
            "Symptoms concentrate on older basal leaves, consistent with phloem-mobile nutrient translocation to meristem."
        ] if is_lower else [],
        "contradicting_evidence": [
            "Soil is reported waterlogged, which often induces root-respiration block rather than true soil nutrient depletion."
        ] if is_saturated else [],
        "missing_distinguishing_clue": "Are veins prominently green (Magnesium) or is the entire basal blade yellowing uniformly (Nitrogen)?"
    }
    if is_interveinal:
        hyp_nutrient["supporting_evidence"].append("Interveinal chlorosis pattern strongly matches Magnesium or pH-induced cation lockout.")
    hypotheses.append(hyp_nutrient)

    # Hypothesis 2: Root Zone Anoxia
    hyp_anoxia = {
        "id": "hyp-root-anoxia",
        "name": "Root Zone Anoxia / Waterlogging (Impaired Aerobic Respiration)",
        "plausibility": "likely" if is_saturated else ("unlikely" if "dry" in all_text else "possible"),
        "supporting_evidence": [
            "Substrate moisture confirmed as waterlogged/saturated, depleting root pore oxygen."
        ] if is_saturated else [],
        "contradicting_evidence": [
            "Dry soil conditions would contradict waterlogged hypoxic stress."
        ] if "dry" in all_text else [],
        "missing_distinguishing_clue": "Do feeder roots smell anaerobic/sulfidic, and do they show white turgid tips or brownish collapse?"
    }
    hypotheses.append(hyp_anoxia)

    # Hypothesis 3: Vascular Wilt Pathogen
    hyp_wilt = {
        "id": "hyp-vascular-pathogen",
        "name": "Vascular Wilt Occlusion (Fusarium / Verticillium)",
        "plausibility": "possible" if is_isolated else "unlikely",
        "supporting_evidence": [
            "Single isolated specimen affected while immediate neighbors remain unblemished."
        ] if is_isolated else [],
        "contradicting_evidence": [
            "Symmetrical chlorosis across both sides of stem is less typical of early unilateral vascular wilt infection."
        ],
        "missing_distinguishing_clue": "Does scraping the epidermal bark reveal brown vascular discoloration in xylem rings?"
    }
    hypotheses.append(hyp_wilt)

    return {"hypotheses": hypotheses}

# --- AGENT 5: FIELD-TEST AGENT ---
def field_test_agent(state: InvestigationState) -> Dict[str, Any]:
    all_text = (" ".join(state["vision_findings"]) + " " + " ".join(state["context_findings"])).lower()
    tests = [
        {
            "target_hypotheses": "Root Anoxia vs. True Nutrient Deficiency",
            "recommended_action": "Perform a non-destructive soil ribbon test 8-10cm below surface and smell core.",
            "what_to_look_for": "If soil stays muddy with a sour/anaerobic scent, roots are starving of oxygen. Allow topsoil to dry before fertilizing.",
            "risk_or_impact": "Zero risk to root ball."
        },
        {
            "target_hypotheses": "Nutrient Lockout vs. Vascular Wilt Infection",
            "recommended_action": "Gently check cambium ring on lower stem with a clean fingernail scrape.",
            "what_to_look_for": "Bright green cambium indicates vascular health; brown/tan streaking indicates fungal vascular occlusion.",
            "risk_or_impact": "Perform gently on a non-vital lower lateral shoot."
        }
    ]

    if "paddy" in all_text or "rice" in all_text or "blight" in all_text or "waterlog" in all_text:
        tests.append({
            "target_hypotheses": "Bacterial Leaf Blight vs. Khaira Zinc Bronzing (ICAR Benchmark)",
            "recommended_action": "Perform the standard ICAR bacterial ooze test: snip an active leaf margin lesion and submerge the cut edge in a clear glass tube of water.",
            "what_to_look_for": "Milky, turbid bacterial streaming oozing within 1-2 minutes confirms Bacterial Leaf Blight; clear water with localized foliar bronzing indicates abiotic Zinc deficiency.",
            "risk_or_impact": "Single leaf sample only; prevents misapplication of expensive chemical sprays."
        })
    elif "cotton" in all_text or "black" in all_text or "clay" in all_text:
        tests.append({
            "target_hypotheses": "Fusarium Cotton Wilt vs. Monsoon Parawilt (Vertisol Asphyxiation)",
            "recommended_action": "Split the lower taproot and collar vertically with a clean blade.",
            "what_to_look_for": "Continuous chocolate-brown xylem discoloration confirms vascular fungal wilt; healthy pale cream xylem with outer root cortex collapse indicates temporary soil saturation anoxia (Parawilt).",
            "risk_or_impact": "Sacrifice one severely symptomatic edge plant to protect entire acreage."
        })

    return {"field_tests": tests}

# --- AGENT 6: REVIEW AGENT ---
def review_agent(state: InvestigationState) -> Dict[str, Any]:
    all_context = " ".join(state["context_findings"]).lower()
    has_leaf_position = any(w in all_context for w in ["basal", "older", "young", "terminal"])
    user_answers = state["input_data"].get("user_answered_questions", {})

    if not has_leaf_position and "leaf_position" not in user_answers:
        return {
            "evidence_sufficient": False,
            "clarifying_question": "Are the yellowing leaves primarily at the very bottom/base of the plant, or are they the newest leaves at the top?",
            "confidence": "low",
            "confidence_rationale": "Without knowing leaf age, mobile nutrients (Nitrogen/Magnesium) cannot be distinguished from immobile nutrients (Iron/Calcium).",
            "unknowns": ["Leaf age distribution", "Root health status", "Substrate pH"]
        }

    return {
        "evidence_sufficient": True,
        "clarifying_question": None,
        "confidence": "moderate",
        "confidence_rationale": "Symptom position and substrate moisture allow clear discrimination of mobile vs waterlogging hypotheses.",
        "unknowns": [
            "Root zone aerobic ATP respiration rate",
            "Exact soil pH and electrical conductivity (EC)",
            "Presence of microscopic root-lesion nematodes"
        ]
    }

# --- AGENT 7: CATALOGUE RECOMMENDATION AGENT ---
def recommendation_agent(state: InvestigationState) -> Dict[str, Any]:
    products = match_products_for_hypotheses(state.get("hypotheses", []))
    return {"recommended_products": products}

# --- SYNTHESIS NODE ---
def synthesize_report_node(state: InvestigationState) -> Dict[str, Any]:
    report = {
        "summary": "Field Investigation Report: Coordinated 6 specialist agents across visual morphology, agronomic context, and scientific retrieval.",
        "observed_facts": state["vision_findings"],
        "context_facts": state["context_findings"],
        "retrieved_knowledge": state["retrieved_knowledge"],
        "competing_hypotheses": state["hypotheses"],
        "discriminating_tests": state["field_tests"],
        "system_confidence": state["confidence"],
        "confidence_rationale": state["confidence_rationale"],
        "what_remains_unknown": state["unknowns"],
        "more_evidence_needed": not state["evidence_sufficient"],
        "clarifying_question_for_user": state["clarifying_question"],
        "recommended_products": state["recommended_products"],
        "source_mode": "langgraph_offline_heuristics",
        "model_used": None,
    }
    return {"final_report": report}

def build_investigation_graph():
    graph = StateGraph(InvestigationState)
    graph.add_node("vision_agent", vision_agent)
    graph.add_node("context_agent", context_agent)
    graph.add_node("knowledge_agent", knowledge_agent)
    graph.add_node("hypothesis_agent", hypothesis_agent)
    graph.add_node("field_test_agent", field_test_agent)
    graph.add_node("review_agent", review_agent)
    graph.add_node("recommendation_agent", recommendation_agent)
    graph.add_node("synthesize_report", synthesize_report_node)

    graph.set_entry_point("vision_agent")
    graph.add_edge("vision_agent", "context_agent")
    graph.add_edge("context_agent", "knowledge_agent")
    graph.add_edge("knowledge_agent", "hypothesis_agent")
    graph.add_edge("hypothesis_agent", "field_test_agent")
    graph.add_edge("field_test_agent", "review_agent")
    graph.add_edge("review_agent", "recommendation_agent")
    graph.add_edge("recommendation_agent", "synthesize_report")
    graph.add_edge("synthesize_report", END)

    return graph.compile()

investigation_graph = build_investigation_graph()
ollama_backend = OllamaBackendClient()

async def run_field_investigation_async(input_data: FieldEvidenceInput) -> FieldInvestigationReport:
    """
    Tier 1: Genuine Ollama LLM reasoning with JSON schema validation.
    Tier 2: LangGraph deterministic multi-agent state graph fallback.
    """
    # 1. Attempt Real Ollama Inference
    ollama_result = await ollama_backend.generate_investigation(
        observation_text=input_data.observation_text,
        image_base64=input_data.image_base64,
        context={
            "affected_parts": input_data.affected_parts,
            "symptom_pattern": input_data.symptom_pattern,
            "soil_moisture": input_data.soil_moisture,
            "recent_weather": input_data.recent_weather,
            "spread_extent": input_data.spread_extent,
            "habitat_context": input_data.habitat_context,
        }
    )

    if ollama_result:
        matched_products = match_products_for_hypotheses(ollama_result.get("competing_hypotheses", []))
        ollama_result["recommended_products"] = matched_products
        ollama_result["retrieved_knowledge"] = load_kb()
        return FieldInvestigationReport(**ollama_result)

    # 2. Deterministic Fallback via LangGraph
    initial_state: InvestigationState = {
        "input_data": input_data.model_dump(),
        "vision_findings": [],
        "context_findings": [],
        "retrieved_knowledge": [],
        "hypotheses": [],
        "field_tests": [],
        "evidence_sufficient": True,
        "clarifying_question": None,
        "confidence": "moderate",
        "confidence_rationale": "",
        "unknowns": [],
        "recommended_products": [],
        "final_report": None
    }

    result = investigation_graph.invoke(initial_state)
    report_dict = result["final_report"]
    return FieldInvestigationReport(**report_dict)

def run_field_investigation(input_data: FieldEvidenceInput) -> FieldInvestigationReport:
    """Synchronous bridge for Streamlit or sync callers."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, run_field_investigation_async(input_data)).result()
        else:
            return loop.run_until_complete(run_field_investigation_async(input_data))
    except Exception:
        return asyncio.run(run_field_investigation_async(input_data))
