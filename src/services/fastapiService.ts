import type { ObservationInput } from './aiProvider'
import type { ObservationReport } from '../types'

const FASTAPI_BASE_URL = 'http://127.0.0.1:8000'

export async function checkFastAPIHealth(): Promise<{ isReachable: boolean; orchestrator?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`${FASTAPI_BASE_URL}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      return { isReachable: true, orchestrator: data.orchestrator || 'LangGraph' }
    }
    return { isReachable: false }
  } catch {
    return { isReachable: false }
  }
}

export async function runFastAPILangGraphInvestigation(
  input: ObservationInput,
  userAnsweredQuestions?: Record<string, string>
): Promise<ObservationReport> {
  const payload = {
    observation_text: input.observationText,
    image_base64: input.imageBase64 || null,
    affected_parts: input.fieldContext?.affectedParts || 'Lower older leaves near base',
    symptom_pattern: input.fieldContext?.symptomPattern || 'Interveinal chlorosis',
    soil_moisture: input.fieldContext?.soilMoisture || 'Saturated / waterlogged',
    recent_weather: input.fieldContext?.recentWeather || 'Prolonged overcast rain followed by sudden heat',
    spread_extent: input.fieldContext?.spreadExtent || 'Isolated single plant',
    habitat_context: input.fieldContext?.habitatContext || 'Garden vegetable bed',
    user_answered_questions: userAnsweredQuestions || {},
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  const response = await fetch(`${FASTAPI_BASE_URL}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
  clearTimeout(timeout)

  if (!response.ok) {
    throw new Error(`FastAPI LangGraph service error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Map to ObservationReport
  return {
    summary: data.summary,
    visibleCharacteristics: data.observed_facts || [],
    possibleInterpretations: (data.competing_hypotheses || []).map((h: any) => `${h.name} (${h.plausibility})`),
    alternativeExplanations: (data.competing_hypotheses || [])
      .filter((h: any) => h.plausibility !== 'likely')
      .map((h: any) => h.name),
    uncertainty: {
      rating: data.system_confidence || 'moderate',
      explanation: data.confidence_rationale || 'Coordinated multi-agent evaluation requires further field validation.',
    },
    nextObservation: data.discriminating_tests?.[0]?.recommended_action || 'Inspect leaf undersides and soil core.',
    safetyConsiderations: [
      'Do not apply chemical pesticides or fertilizer until root cause is differentiated.',
      'Leave specimen and surrounding habitat intact.',
    ],
    distinctionEvidenceVsInference: {
      observedEvidence: data.observed_facts || [],
      inferredHypotheses: (data.competing_hypotheses || []).map(
        (h: any) => `${h.name}: ${h.supporting_evidence?.join('; ') || 'Under evaluation'}`
      ),
    },
    fieldContext: input.fieldContext,
    specialistAgents: [
      {
        agentName: 'Vision Agent',
        role: 'Physical morphological observation',
        focusArea: 'Visible symptoms and tissue presentation',
        status: 'completed',
        findings: data.observed_facts || [],
        suggestedDiscriminatingTest: 'Inspect secondary vein patterns with 10x magnification',
      },
      {
        agentName: 'Context Agent',
        role: 'Agronomic and environmental context integrator',
        focusArea: 'Soil moisture, recent weather, and spread',
        status: 'completed',
        findings: data.context_facts || [],
        suggestedDiscriminatingTest: 'Perform soil ribbon roll test 10cm deep',
      },
      {
        agentName: 'Knowledge Retrieval Agent',
        role: 'Scientific literature & index retrieval',
        focusArea: 'Plant physiology, vascular wilts, and hypoxia',
        status: 'completed',
        findings: (data.retrieved_knowledge || []).map((k: any) => `[${k.id}] ${k.topic}: ${k.scientificKey}`),
        suggestedDiscriminatingTest: 'Verify with physiological literature key',
      },
      {
        agentName: 'Hypothesis Agent',
        role: 'Competing explanations generator',
        focusArea: 'Nutrient translocation, root anoxia, and wilt pathogens',
        status: 'completed',
        findings: (data.competing_hypotheses || []).map((h: any) => `${h.name} [${h.plausibility}]`),
        suggestedDiscriminatingTest: 'Formulate discriminating field tests',
      },
      {
        agentName: 'Field-Test Agent',
        role: 'Discriminating action designer',
        focusArea: 'Safe physical tests to separate hypotheses',
        status: 'completed',
        findings: (data.discriminating_tests || []).map((t: any) => `${t.target_hypotheses} -> ${t.recommended_action}`),
        suggestedDiscriminatingTest: data.discriminating_tests?.[0]?.recommended_action || '',
      },
      {
        agentName: 'Review Agent',
        role: 'Evidence sufficiency & confidence gatekeeper',
        focusArea: 'Decision: Is more evidence needed?',
        status: 'completed',
        findings: [
          `Evidence sufficiency: ${!data.more_evidence_needed ? 'Sufficient' : 'Requires further clue'}`,
          `Confidence: ${data.system_confidence}`,
        ],
        suggestedDiscriminatingTest: data.clarifying_question_for_user || 'Evidence sufficient for structured report',
      },
    ],
    competingHypotheses: (data.competing_hypotheses || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      plausibility: h.plausibility,
      supportingEvidence: h.supporting_evidence || [],
      contradictingEvidence: h.contradicting_evidence || [],
      missingDistinguishingClue: h.missing_distinguishing_clue || '',
    })),
    discriminatingTests: (data.discriminating_tests || []).map((t: any) => ({
      targetHypothesesToDistinguish: t.target_hypotheses,
      recommendedAction: t.recommended_action,
      whatToLookFor: t.what_to_look_for,
      riskOrImpact: t.risk_or_impact,
    })),
    whatRemainsUnknown: data.what_remains_unknown || [],
    retrievedKnowledge: data.retrieved_knowledge || [],
    moreEvidenceNeeded: data.more_evidence_needed,
    clarifyingQuestionForUser: data.clarifying_question_for_user,
    sourceMode: 'langgraph_fastapi',
    modelUsed: 'FastAPI + LangGraph Multi-Agent Orchestrator',
    generatedAt: new Date().toISOString(),
  }
}
