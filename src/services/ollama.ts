import type { AIProvider, ObservationInput } from './aiProvider'
import type { ObservationReport, CompetingHypothesis, SpecialistAgentContribution } from '../types'
import { generateOfflineGuidedObservation } from './offlineObserver'

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'gemma3'

export const SYSTEM_PROMPT = `You are FieldSense AI, a coordinator of specialist field science agents (Plant Pathology & Entomology, Soil Agronomy & Root Physiology, and Environmental Ecology & Micro-Climate).
Your core objective: Move from raw field observations to evidence-based explanations—NEVER jump straight to a single hasty diagnosis.
For example, if leaf chlorosis or damage is observed, do not declare a single nutrient deficiency or pathogen. Coordinate specialist agents, evaluate competing hypotheses, identify supporting vs contradicting evidence, and recommend concrete discriminating tests to separate them.

Respond STRICTLY in valid JSON matching this schema:
{
  "summary": "Concise factual summary of the field investigation",
  "visibleCharacteristics": ["What was directly observed in the plant, soil, and environment"],
  "specialistAgents": [
    {
      "agentName": "Pathology & Biotic Specialist",
      "role": "Investigates fungal, bacterial, viral, and insect causes",
      "focusArea": "Lesions, pustules, undersides, and frass",
      "status": "completed",
      "findings": ["Direct evidence identified by this specialist"],
      "suggestedDiscriminatingTest": "Field observation or test to confirm or eliminate biotic causes"
    },
    {
      "agentName": "Agronomy & Soil Root Specialist",
      "role": "Investigates mobile vs immobile nutrients, soil compaction, and root health",
      "focusArea": "Leaf age pattern, venation, and root zone moisture",
      "status": "completed",
      "findings": ["Direct evidence identified by this specialist"],
      "suggestedDiscriminatingTest": "Field test for substrate and root aeration"
    },
    {
      "agentName": "Ecology & Micro-Climate Specialist",
      "role": "Investigates sunscald, wind, frost, and distribution across population",
      "focusArea": "Micro-climate, weather transition, and surrounding species",
      "status": "completed",
      "findings": ["Direct evidence identified by this specialist"],
      "suggestedDiscriminatingTest": "Inspection of adjacent species and micro-climate gradients"
    }
  ],
  "competingHypotheses": [
    {
      "id": "hyp-1",
      "name": "Hypothesis name (e.g. Mobile Nutrient Deficiency, Root Zone Anoxia, Vascular Wilt, Sunscald)",
      "plausibility": "likely" | "possible" | "unlikely" | "ruled_out",
      "supportingEvidence": ["Evidence directly supporting this hypothesis"],
      "contradictingEvidence": ["Evidence that makes this hypothesis unlikely or contradicts it"],
      "missingDistinguishingClue": "Key missing clue needed to confirm or rule out"
    }
  ],
  "discriminatingTests": [
    {
      "targetHypothesesToDistinguish": "Which competing hypotheses this test separates",
      "recommendedAction": "Concrete field test action (e.g. soil ribbon test, scraping cambium, inspecting leaf underside)",
      "whatToLookFor": "What positive vs negative results look like",
      "riskOrImpact": "Non-destructive or low impact note"
    }
  ],
  "uncertainty": {
    "rating": "low" | "moderate" | "high",
    "explanation": "Why uncertainty remains and why further field tests are required"
  },
  "whatRemainsUnknown": ["Critical factors not yet known from current visual observation"],
  "nextObservation": "Immediate next physical action the user should take outdoors",
  "safetyConsiderations": ["Specific outdoor safety rules applicable here"],
  "distinctionEvidenceVsInference": {
    "observedEvidence": ["Empirical facts visible on site"],
    "inferredHypotheses": ["Plausible explanations deduced by specialists"]
  }
}`

export function validateObservationReport(raw: any, modelUsed: string, input?: ObservationInput): ObservationReport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON returned by AI model.')
  }

  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary : 'Field Investigation Report'
  const visibleCharacteristics = Array.isArray(raw.visibleCharacteristics) && raw.visibleCharacteristics.length > 0
    ? raw.visibleCharacteristics.map(String)
    : ['Visual features as described in user field note']

  const rawHypotheses = Array.isArray(raw.competingHypotheses) ? raw.competingHypotheses : []
  const competingHypotheses: CompetingHypothesis[] = rawHypotheses.map((h: any, i: number) => ({
    id: h.id || `hyp-${i + 1}`,
    name: typeof h.name === 'string' ? h.name : `Plausible Hypothesis ${i + 1}`,
    plausibility: ['likely', 'possible', 'unlikely', 'ruled_out'].includes(h.plausibility) ? h.plausibility : 'possible',
    supportingEvidence: Array.isArray(h.supportingEvidence) ? h.supportingEvidence.map(String) : [],
    contradictingEvidence: Array.isArray(h.contradictingEvidence) ? h.contradictingEvidence.map(String) : [],
    missingDistinguishingClue: typeof h.missingDistinguishingClue === 'string' ? h.missingDistinguishingClue : 'Inspect under 10x magnification',
  }))

  const rawSpecialists = Array.isArray(raw.specialistAgents) ? raw.specialistAgents : []
  const specialistAgents: SpecialistAgentContribution[] = rawSpecialists.map((s: any) => ({
    agentName: typeof s.agentName === 'string' ? s.agentName : 'Specialist Agent',
    role: typeof s.role === 'string' ? s.role : 'Domain Investigator',
    focusArea: typeof s.focusArea === 'string' ? s.focusArea : 'Diagnostic symptoms',
    status: 'completed',
    findings: Array.isArray(s.findings) ? s.findings.map(String) : [],
    suggestedDiscriminatingTest: typeof s.suggestedDiscriminatingTest === 'string' ? s.suggestedDiscriminatingTest : '',
  }))

  const rawTests = Array.isArray(raw.discriminatingTests) ? raw.discriminatingTests : []
  const discriminatingTests = rawTests.map((t: any) => ({
    targetHypothesesToDistinguish: typeof t.targetHypothesesToDistinguish === 'string' ? t.targetHypothesesToDistinguish : 'Distinguish hypotheses',
    recommendedAction: typeof t.recommendedAction === 'string' ? t.recommendedAction : 'Perform field test',
    whatToLookFor: typeof t.whatToLookFor === 'string' ? t.whatToLookFor : 'Compare symptom patterns',
    riskOrImpact: typeof t.riskOrImpact === 'string' ? t.riskOrImpact : 'Non-destructive',
  }))

  const possibleInterpretations = competingHypotheses.length > 0
    ? competingHypotheses.map((h) => `${h.name} (${h.plausibility})`)
    : Array.isArray(raw.possibleInterpretations) ? raw.possibleInterpretations.map(String) : ['Competing physiological hypotheses']

  const alternativeExplanations = competingHypotheses.filter((h) => h.plausibility !== 'likely').map((h) => h.name)

  const rating = ['low', 'moderate', 'high'].includes(raw.uncertainty?.rating)
    ? raw.uncertainty.rating
    : 'moderate'

  const explanation = typeof raw.uncertainty?.explanation === 'string' && raw.uncertainty.explanation.trim()
    ? raw.uncertainty.explanation
    : 'Field observation alone cannot diagnose root causes; laboratory soil assays or discriminating tissue inspections are required to distinguish hypotheses.'

  const nextObservation = typeof raw.nextObservation === 'string' && raw.nextObservation.trim()
    ? raw.nextObservation
    : (discriminatingTests[0]?.recommendedAction || 'Inspect leaf undersides and probe soil moisture 5cm deep.')

  const safetyConsiderations = Array.isArray(raw.safetyConsiderations) && raw.safetyConsiderations.length > 0
    ? raw.safetyConsiderations.map(String)
    : ['Do not consume or handle unknown specimens; do not apply unverified chemical treatments.']

  const observedEvidence = Array.isArray(raw.distinctionEvidenceVsInference?.observedEvidence)
    ? raw.distinctionEvidenceVsInference.observedEvidence.map(String)
    : visibleCharacteristics

  const inferredHypotheses = Array.isArray(raw.distinctionEvidenceVsInference?.inferredHypotheses)
    ? raw.distinctionEvidenceVsInference.inferredHypotheses.map(String)
    : possibleInterpretations

  const whatRemainsUnknown = Array.isArray(raw.whatRemainsUnknown)
    ? raw.whatRemainsUnknown.map(String)
    : ['Exact substrate chemistry/pH and subsurface root pathogen presence']

  return {
    summary,
    visibleCharacteristics,
    possibleInterpretations,
    alternativeExplanations,
    uncertainty: { rating, explanation },
    nextObservation,
    safetyConsiderations,
    distinctionEvidenceVsInference: {
      observedEvidence,
      inferredHypotheses,
    },
    fieldContext: input?.fieldContext,
    specialistAgents,
    competingHypotheses,
    discriminatingTests,
    whatRemainsUnknown,
    sourceMode: 'ollama',
    modelUsed,
    generatedAt: new Date().toISOString(),
  }
}

export class OllamaProvider implements AIProvider {
  name = 'Ollama Local AI'
  baseUrl: string
  modelName: string

  constructor(baseUrl?: string, modelName?: string) {
    this.baseUrl = baseUrl || DEFAULT_OLLAMA_URL
    this.modelName = modelName || DEFAULT_MODEL
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/$/, '')
  }

  setModelName(model: string) {
    this.modelName = model.trim()
  }

  async checkHealth(): Promise<{ isReachable: boolean; message?: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        return { isReachable: true }
      }
      return { isReachable: false, message: `Server responded with status ${response.status}` }
    } catch (err: any) {
      return {
        isReachable: false,
        message: err.name === 'AbortError' ? 'Connection timed out' : 'Service unreachable at ' + this.baseUrl,
      }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) return []
      const data = await response.json()
      if (Array.isArray(data.models)) {
        return data.models.map((m: any) => m.name || m.model).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }

  async analyzeObservation(input: ObservationInput): Promise<ObservationReport> {
    const health = await this.checkHealth()
    if (!health.isReachable) {
      throw new Error(`Ollama service unavailable at ${this.baseUrl}. ${health.message || ''}`)
    }

    const contextSummary = input.fieldContext
      ? `\nDetailed Field Investigation Context:
- Affected Anatomical Parts: ${input.fieldContext.affectedParts || 'Not specified'}
- Symptom Morphology Pattern: ${input.fieldContext.symptomPattern || 'Not specified'}
- Substrate Moisture: ${input.fieldContext.soilMoisture || 'Not specified'}
- Recent Weather: ${input.fieldContext.recentWeather || 'Not specified'}
- Population Spread / Distribution: ${input.fieldContext.spreadExtent || 'Not specified'}
- Ecological Habitat: ${input.fieldContext.habitatContext || 'Not specified'}`
      : ''

    const promptText = `User Field Observation Notes:
${input.observationText}
${input.missionType ? `Context Mission Type: ${input.missionType}` : ''}
${contextSummary}

Please coordinate specialist agents (Pathology, Agronomy, Micro-climate) to formulate competing hypotheses with supporting vs contradicting evidence and recommended discriminating tests. Output strictly in JSON.`

    const requestPayload: any = {
      model: this.modelName,
      prompt: promptText,
      system: SYSTEM_PROMPT,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
      },
    }

    if (input.imageBase64) {
      const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
      requestPayload.images = [cleanBase64]
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 35000)

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Ollama returned status ${response.status}: ${errorText || response.statusText}`)
      }

      const data = await response.json()
      const responseContent = data.response

      let parsed: any
      try {
        parsed = JSON.parse(responseContent)
      } catch {
        const match = responseContent.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
        } else {
          throw new Error('Could not parse model response as JSON.')
        }
      }

      return validateObservationReport(parsed, this.modelName, input)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Model inference timed out after 35 seconds. Ensure ${this.modelName} is not overloaded.`)
      }
      throw err
    }
  }
}

export const ollamaService = new OllamaProvider()

import { checkFastAPIHealth, runFastAPILangGraphInvestigation } from './fastapiService'

export async function processObservationWithFallback(
  input: ObservationInput,
  onStatusUpdate?: (status: string) => void,
  userAnsweredQuestions?: Record<string, string>
): Promise<ObservationReport> {
  onStatusUpdate?.('Checking LangGraph multi-agent service (FastAPI on port 8000)...')
  const fastApiHealth = await checkFastAPIHealth()

  if (fastApiHealth.isReachable) {
    try {
      onStatusUpdate?.('Orchestrating agents via LangGraph: Vision, Context, Knowledge, Hypothesis, Field-Test, Review...')
      const report = await runFastAPILangGraphInvestigation(input, userAnsweredQuestions)
      return report
    } catch (err: any) {
      onStatusUpdate?.(`FastAPI LangGraph returned error (${err.message}). Checking Ollama...`)
    }
  }

  onStatusUpdate?.('Checking local Ollama service connectivity...')
  const health = await ollamaService.checkHealth()

  if (health.isReachable) {
    try {
      onStatusUpdate?.(`Coordinating specialist agents on local open model (${ollamaService.modelName})...`)
      const report = await ollamaService.analyzeObservation(input)
      return report
    } catch (err: any) {
      onStatusUpdate?.(`Local model returned error: ${err.message}. Activating offline guided investigation mode...`)
      const fallback = generateOfflineGuidedObservation(input.observationText, !!input.imageBase64, input.fieldContext)
      return fallback.report
    }
  } else {
    onStatusUpdate?.('Local model unavailable — using guided multi-agent investigation mode.')
    const fallback = generateOfflineGuidedObservation(input.observationText, !!input.imageBase64, input.fieldContext)
    return fallback.report
  }
}
