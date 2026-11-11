from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class RecommendedProductSchema(BaseModel):
    sku: str
    title: str
    description: str
    category: str
    price: float
    currency: str = "USD"
    target_hypotheses: List[str] = Field(default_factory=list)

class FieldEvidenceInput(BaseModel):
    observation_text: str = Field(..., max_length=4000, description="Direct observation notes from the field")
    image_base64: Optional[str] = Field(None, max_length=7000000, description="Optional photo of plant or specimen in Base64 (max ~5MB)")
    affected_parts: Optional[str] = Field(None, max_length=200, description="Anatomical location of symptoms")
    symptom_pattern: Optional[str] = Field(None, max_length=200, description="Morphology of symptom")
    soil_moisture: Optional[str] = Field(None, max_length=200, description="Current soil or substrate moisture")
    recent_weather: Optional[str] = Field(None, max_length=200, description="Meteorological context")
    spread_extent: Optional[str] = Field(None, max_length=200, description="Distribution across adjacent specimens")
    habitat_context: Optional[str] = Field(None, max_length=200, description="Ecological habitat")
    user_answered_questions: Optional[Dict[str, str]] = Field(default_factory=dict, description="Follow-up answers from iterative prompts")

class CompetingHypothesisSchema(BaseModel):
    id: str
    name: str
    plausibility: str = "possible"  # likely, possible, unlikely, ruled_out
    supporting_evidence: List[str] = Field(default_factory=list)
    contradicting_evidence: List[str] = Field(default_factory=list)
    missing_distinguishing_clue: str = ""

class DiscriminatingTestSchema(BaseModel):
    target_hypotheses: str
    recommended_action: str
    what_to_look_for: str
    risk_or_impact: str = "Non-destructive"

class FieldInvestigationReport(BaseModel):
    summary: str
    observed_facts: List[str] = Field(default_factory=list)
    context_facts: List[str] = Field(default_factory=list)
    retrieved_knowledge: List[Dict[str, str]] = Field(default_factory=list)
    competing_hypotheses: List[CompetingHypothesisSchema] = Field(default_factory=list)
    discriminating_tests: List[DiscriminatingTestSchema] = Field(default_factory=list)
    system_confidence: str = "moderate"  # low, moderate, high
    confidence_rationale: str = ""
    what_remains_unknown: List[str] = Field(default_factory=list)
    more_evidence_needed: bool = False
    clarifying_question_for_user: Optional[str] = None
    recommended_products: List[RecommendedProductSchema] = Field(default_factory=list)
    source_mode: str = "langgraph_coordinated_agents"
    model_used: Optional[str] = None
