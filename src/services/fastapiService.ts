import type { ObservationInput } from './aiProvider'
import type { ObservationReport, OrderQuote, OrderRecord, RecommendedProduct } from '../types'

const FASTAPI_BASE_URL = 'http://127.0.0.1:8000'

export async function checkFastAPIHealth(): Promise<{ isReachable: boolean; orchestrator?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`${FASTAPI_BASE_URL}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      return { isReachable: true, orchestrator: data.service || 'FieldSense AI Platform' }
    }
    return { isReachable: false }
  } catch {
    return { isReachable: false }
  }
}

export async function fetchCatalogue(): Promise<RecommendedProduct[]> {
  const res = await fetch(`${FASTAPI_BASE_URL}/api/catalogue`)
  if (!res.ok) throw new Error('Failed to fetch product catalogue')
  return res.json()
}

export async function fetchQuote(items: Array<{ sku: string; quantity: number }>): Promise<OrderQuote> {
  const res = await fetch(`${FASTAPI_BASE_URL}/api/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Quote calculation failed')
  }
  return res.json()
}

export async function createBackendPayPalOrder(
  items: Array<{ sku: string; quantity: number }>,
  customerNotes?: string
): Promise<{ order_id: number; paypal_order_id: string; total: number; currency: string }> {
  const res = await fetch(`${FASTAPI_BASE_URL}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, customer_notes: customerNotes || '' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create PayPal order')
  }
  return res.json()
}

export async function captureBackendPayPalOrder(
  orderId: number,
  paypalOrderId: string
): Promise<{ order_id: number; status: string; paypal_capture_id: string; total_amount: number }> {
  const res = await fetch(`${FASTAPI_BASE_URL}/api/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paypal_order_id: paypalOrderId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to capture PayPal order')
  }
  return res.json()
}

export async function fetchOrdersHistory(): Promise<OrderRecord[]> {
  const res = await fetch(`${FASTAPI_BASE_URL}/api/orders`)
  if (!res.ok) throw new Error('Failed to fetch orders history')
  return res.json()
}

export async function runFastAPILangGraphInvestigation(
  input: ObservationInput,
  userAnsweredQuestions?: Record<string, string>
): Promise<ObservationReport> {
  const payload = {
    observation_text: input.observationText,
    image_base64: input.imageBase64 || null,
    affected_parts: input.fieldContext?.affectedParts || null,
    symptom_pattern: input.fieldContext?.symptomPattern || null,
    soil_moisture: input.fieldContext?.soilMoisture || null,
    recent_weather: input.fieldContext?.recentWeather || null,
    spread_extent: input.fieldContext?.spreadExtent || null,
    habitat_context: input.fieldContext?.habitatContext || null,
    user_answered_questions: userAnsweredQuestions || {},
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)

  const response = await fetch(`${FASTAPI_BASE_URL}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
  clearTimeout(timeout)

  if (!response.ok) {
    throw new Error(`FastAPI Investigation error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  return {
    summary: data.summary,
    visibleCharacteristics: data.observed_facts || [],
    possibleInterpretations: (data.competing_hypotheses || []).map((h: any) => `${h.name} (${h.plausibility})`),
    alternativeExplanations: (data.competing_hypotheses || [])
      .filter((h: any) => h.plausibility !== 'likely')
      .map((h: any) => h.name),
    uncertainty: {
      rating: data.system_confidence || 'moderate',
      explanation: data.confidence_rationale || 'Multi-agent evaluation requires further field validation.',
    },
    nextObservation: data.discriminating_tests?.[0]?.recommended_action || 'Inspect leaf undersides and soil core.',
    safetyConsiderations: [
      'Do not apply chemical pesticides or synthetic fertilizer until root cause is differentiated.',
      'Leave specimen and surrounding habitat intact.',
    ],
    distinctionEvidenceVsInference: {
      observedEvidence: data.observed_facts || [],
      inferredHypotheses: (data.competing_hypotheses || []).map(
        (h: any) => `${h.name}: ${h.supporting_evidence?.join('; ') || 'Under evaluation'}`
      ),
    },
    fieldContext: input.fieldContext,
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
    recommended_products: data.recommended_products || [],
    moreEvidenceNeeded: data.more_evidence_needed,
    clarifyingQuestionForUser: data.clarifying_question_for_user,
    sourceMode: data.source_mode || 'langgraph_fastapi',
    modelUsed: data.model_used || 'Ollama + LangGraph Multi-Agent Orchestrator',
    generatedAt: new Date().toISOString(),
  }
}
