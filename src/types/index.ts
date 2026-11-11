export type MissionType =
  | 'plant_detective'
  | 'backyard_biodiversity'
  | 'bird_habitat'
  | 'nature_texture'
  | 'mindful_walk'

export type MissionDuration = 10 | 20 | 30

export type MissionDifficulty = 'gentle' | 'curious' | 'explorer'

export interface MissionStep {
  id: string
  instruction: string
  fieldTip: string
}

export interface MissionDefinition {
  id: string
  type: MissionType
  title: string
  tagline: string
  objective: string
  durationMinutes: MissionDuration
  difficulty: MissionDifficulty
  tasks: MissionStep[]
  safetyReminder: string
  recordingTip: string
  natureZone: string
}

export interface UncertaintyLevel {
  rating: 'low' | 'moderate' | 'high'
  explanation: string
}

export interface CompetingHypothesis {
  id: string
  name: string
  plausibility: 'likely' | 'possible' | 'unlikely' | 'ruled_out'
  supportingEvidence: string[]
  contradictingEvidence: string[]
  missingDistinguishingClue: string
}

export interface SpecialistAgentContribution {
  agentName: string
  role: string
  focusArea: string
  status: 'completed' | 'pending'
  findings: string[]
  suggestedDiscriminatingTest: string
}

export interface FieldContextData {
  affectedParts?: string
  symptomPattern?: string
  soilMoisture?: string
  recentWeather?: string
  spreadExtent?: string
  habitatContext?: string
}

export interface RecommendedProduct {
  sku: string
  title: string
  description: string
  category: string
  price: number
  currency: string
  target_hypotheses?: string[]
}

export interface OrderQuote {
  items: Array<{
    sku: string
    title: string
    unit_price: number
    quantity: number
    total_price: number
    currency: string
  }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
}

export interface OrderRecord {
  id: number
  client_order_ref: string
  paypal_order_id?: string
  paypal_capture_id?: string
  status: 'DRAFT' | 'CREATED' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  currency: string
  subtotal: number
  shipping: number
  tax: number
  total_amount: number
  created_at: string
  items: Array<{
    sku: string
    title: string
    unit_price: number
    quantity: number
    total_price: number
  }>
}

export interface ObservationReport {
  summary: string
  visibleCharacteristics: string[]
  possibleInterpretations: string[]
  alternativeExplanations: string[]
  uncertainty: UncertaintyLevel
  nextObservation: string
  safetyConsiderations: string[]
  distinctionEvidenceVsInference: {
    observedEvidence: string[]
    inferredHypotheses: string[]
  }
  fieldContext?: FieldContextData
  specialistAgents?: SpecialistAgentContribution[]
  competingHypotheses?: CompetingHypothesis[]
  discriminatingTests?: Array<{
    targetHypothesesToDistinguish: string
    recommendedAction: string
    whatToLookFor: string
    riskOrImpact: string
  }>
  whatRemainsUnknown?: string[]
  retrievedKnowledge?: Array<{
    id: string
    topic: string
    domain: string
    passage: string
    scientificKey: string
  }>
  recommended_products?: RecommendedProduct[]
  moreEvidenceNeeded?: boolean
  clarifyingQuestionForUser?: string
  sourceMode: 'langgraph_fastapi' | 'ollama' | 'offline_guided' | 'ollama_inference'
  modelUsed?: string
  generatedAt: string
}

export interface JournalEntry {
  id?: number
  timestamp: string
  missionType?: MissionType
  missionTitle?: string
  notes: string
  imageBlobUrl?: string
  imageDataBase64?: string
  imageMimeType?: string
  report: ObservationReport
  userReflection?: string
  durationMinutes?: number
}

export interface UserStats {
  completedMissionsCount: number
  totalObservationsCount: number
  totalOutdoorMinutes: number
  consecutiveDaysStreak: number
  lastActiveDate?: string
}

export interface OllamaModelInfo {
  name: string
  size?: number
  digest?: string
  modified_at?: string
  hasVisionSupport?: boolean
}

export interface OllamaHealthStatus {
  isReachable: boolean
  baseUrl: string
  availableModels: string[]
  selectedModel: string
  selectedModelVisionCapable: boolean
  lastChecked: string
  errorMessage?: string
}
