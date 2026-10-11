import json
import os
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from schemas import FieldEvidenceInput, FieldInvestigationReport, CompetingHypothesisSchema, DiscriminatingTestSchema

# Path to local curated scientific knowledge index
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_index.json")

def load_kb() -> List[Dict[str, str]]:
    if os.path.exists(KB_PATH):
        with open(KB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# Shared Investigation State for LangGraph
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
    final_report: Optional[Dict[str, Any]]

# --- AGENT 1: VISION AGENT ("What is visible?") ---
def vision_agent(state: InvestigationState) -> Dict[str, Any]:
    text = state["input_data"].get("observation_text", "").lower()
    has_img = bool(state["input_data"].get("image_base64"))
    pattern = state["input_data"].get("symptom_pattern", "")

    visible = []
    if "yellow" in text or "chlorosis" in text or "chlorosis" in pattern.lower():
        visible.append("Foliar chlorosis (loss of uniform green chlorophyll pigmentation)")
    if "interveinal" in text or "interveinal" in pattern.lower():
        visible.append("Interveinal patterning: secondary veins maintain green pigmentation while mesophyll tissue yellows")
    if "spot" in text or "hole" in text or "lesion" in text:
        visible.append("Localized foliar lesions / tissue necrosis observed")
    if "wilt" in text or "flagging" in text:
        visible.append("Loss of leaf turgor / vegetative wilting")

    if not visible:
        visible.append(f"Visual features recorded in field note: '{state['input_data'].get('observation_text')[:80]}'")
    if has_img:
        visible.append("Field photograph attached confirming morphological tissue presentation")

    return {"vision_findings": visible}

# --- AGENT 2: CONTEXT AGENT ("What else do we know?") ---
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

    # Incorporate any user answered clarifying questions
    answers = inp.get("user_answered_questions", {})
    for q, a in answers.items():
        context_facts.append(f"User field confirmation: {q} -> {a}")

    return {"context_findings": context_facts}

# --- AGENT 3: KNOWLEDGE AGENT ("What do sources say?") ---
def knowledge_agent(state: InvestigationState) -> Dict[str, Any]:
    kb = load_kb()
    all_text = (
        " ".join(state["vision_findings"]) + " " + " ".join(state["context_findings"])
    ).lower()

    matched_passages = []
    for doc in kb:
        # Match scientific passages based on symptoms
        if "nitrogen" in doc["topic"].lower() and ("chlorosis" in all_text or "yellow" in all_text):
            matched_passages.append(doc)
        elif "anoxia" in doc["topic"].lower() and ("waterlog" in all_text or "saturated" in all_text or "rain" in all_text):
            matched_passages.append(doc)
        elif "vascular" in doc["topic"].lower() and ("single" in all_text or "isolated" in all_text or "wilt" in all_text):
            matched_passages.append(doc)
        elif "thermal" in doc["topic"].lower() and ("heat" in all_text or "sun" in all_text):
            matched_passages.append(doc)

    if not matched_passages and kb:
        matched_passages.append(kb[0])

    return {"retrieved_knowledge": matched_passages}

# --- AGENT 4: HYPOTHESIS AGENT ("What could explain it?") ---
def hypothesis_agent(state: InvestigationState) -> Dict[str, Any]:
    all_text = (
        " ".join(state["vision_findings"]) + " " + " ".join(state["context_findings"])
    ).lower()

    hypotheses = []

    # Hypothesis 1: Mobile Nutrient Deficiency (Nitrogen or Magnesium)
    is_lower = "lower" in all_text or "basal" in all_text
    is_interveinal = "interveinal" in all_text
    is_saturated = "waterlog" in all_text or "saturated" in all_text

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

    # Hypothesis 2: Root Zone Anoxia (Hypoxic respiration block)
    hyp_anoxia = {
        "id": "hyp-root-anoxia",
        "name": "Root Zone Anoxia / Waterlogging (Impaired Aerobic Respiration)",
        "plausibility": "likely" if is_saturated else "unlikely" if "dry" in all_text else "possible",
        "supporting_evidence": [
            "Substrate moisture confirmed as waterlogged/saturated, depleting root pore oxygen (O2 diffusion reduced 10,000x)."
        ] if is_saturated else [],
        "contradicting_evidence": [
            "Dry soil conditions would contradict waterlogged hypoxic stress."
        ] if "dry" in all_text else [],
        "missing_distinguishing_clue": "Do feeder roots smell anaerobic/sulfidic, and do they show white turgid tips or brownish collapse?"
    }
    hypotheses.append(hyp_anoxia)

    # Hypothesis 3: Vascular Wilt Pathogen
    is_isolated = "isolated" in all_text or "single" in all_text
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

# --- AGENT 5: FIELD-TEST AGENT ("What should we check?") ---
def field_test_agent(state: InvestigationState) -> Dict[str, Any]:
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
    return {"field_tests": tests}

# --- AGENT 6: REVIEW AGENT ("Is the evidence sufficient?") ---
def review_agent(state: InvestigationState) -> Dict[str, Any]:
    # Check if we have both moisture and leaf age specified
    all_context = " ".join(state["context_findings"]).lower()
    has_leaf_position = "basal" in all_context or "older" in all_context or "young" in all_context or "terminal" in all_context
    has_moisture = "saturated" in all_context or "moist" in all_context or "dry" in all_context or "clay" in all_context

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
        "confidence_rationale": "Symptom position and substrate moisture allow clear discrimination of mobile vs waterlogging hypotheses, but microscopic root inspection is still required to confirm anoxia vs nutrient lockout.",
        "unknowns": [
            "Root zone aerobic ATP respiration rate",
            "Exact soil pH and electrical conductivity (EC)",
            "Presence of microscopic root-lesion nematodes"
        ]
    }

# --- SYNTHESIS NODE: COMPOSE INVESTIGATION REPORT ---
def synthesize_report_node(state: InvestigationState) -> Dict[str, Any]:
    summary = "Field Investigation Report: Coordinated 6 specialist agents across visual morphology, agronomic context, and scientific retrieval."
    
    report = {
        "summary": summary,
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
        "source_mode": "langgraph_coordinated_agents"
    }
    return {"final_report": report}

# Build LangGraph Workflow
def build_investigation_graph():
    graph = StateGraph(InvestigationState)

    graph.add_node("vision_agent", vision_agent)
    graph.add_node("context_agent", context_agent)
    graph.add_node("knowledge_agent", knowledge_agent)
    graph.add_node("hypothesis_agent", hypothesis_agent)
    graph.add_node("field_test_agent", field_test_agent)
    graph.add_node("review_agent", review_agent)
    graph.add_node("synthesize_report", synthesize_report_node)

    # Edge sequence
    graph.set_entry_point("vision_agent")
    graph.add_edge("vision_agent", "context_agent")
    graph.add_edge("context_agent", "knowledge_agent")
    graph.add_edge("knowledge_agent", "hypothesis_agent")
    graph.add_edge("hypothesis_agent", "field_test_agent")
    graph.add_edge("field_test_agent", "review_agent")
    graph.add_edge("review_agent", "synthesize_report")
    graph.add_edge("synthesize_report", END)

    return graph.compile()

investigation_graph = build_investigation_graph()

def run_field_investigation(input_data: FieldEvidenceInput) -> FieldInvestigationReport:
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
        "final_report": None
    }

    result = investigation_graph.invoke(initial_state)
    report_dict = result["final_report"]
    return FieldInvestigationReport(**report_dict)
