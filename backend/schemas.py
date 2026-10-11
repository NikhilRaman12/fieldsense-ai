from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FieldEvidenceInput(BaseModel):
    observation_text: str = Field(..., description="Direct observation notes from the field")
    image_base64: Optional[str] = Field(None, description="Optional photo of plant or specimen")
    affected_parts: Optional[str] = Field("Lower older leaves near base", description="Anatomical location of symptoms")
    symptom_pattern: Optional[str] = Field("Interveinal chlorosis", description="Morphology of symptom")
    soil_moisture: Optional[str] = Field("Saturated / waterlogged", description="Current soil or substrate moisture")
    recent_weather: Optional[str] = Field("Prolonged overcast rain followed by sudden heat", description="Meteorological context")
    spread_extent: Optional[str] = Field("Isolated single plant", description="Distribution across adjacent specimens")
    habitat_context: Optional[str] = Field("Garden vegetable bed", description="Ecological habitat")
    user_answered_questions: Optional[Dict[str, str]] = Field(default_factory=dict, description="Follow-up answers from iterative prompts")

class CompetingHypothesisSchema(BaseModel):
    id: str
    name: str
    plausibility: str  # likely, possible, unlikely, ruled_out
    supporting_evidence: List[str]
    contradicting_evidence: List[str]
    missing_distinguishing_clue: str

class DiscriminatingTestSchema(BaseModel):
    target_hypotheses: str
    recommended_action: str
    what_to_look_for: str
    risk_or_impact: str

class FieldInvestigationReport(BaseModel):
    summary: str
    observed_facts: List[str]
    context_facts: List[str]
    retrieved_knowledge: List[Dict[str, str]]
    competing_hypotheses: List[CompetingHypothesisSchema]
    discriminating_tests: List[DiscriminatingTestSchema]
    system_confidence: str  # low, moderate, high
    confidence_rationale: str
    what_remains_unknown: List[str]
    more_evidence_needed: bool
    clarifying_question_for_user: Optional[str] = None
    source_mode: str = "langgraph_coordinated_agents"
