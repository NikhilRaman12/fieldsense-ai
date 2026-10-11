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
  affectedParts?: string // e.g. "Lower older leaves only", "New terminal shoots", "Whole branch"
  symptomPattern?: string // e.g. "Interveinal chlorosis", "Stippled spots", "Uniform pale yellowing", "Marginal scorched edges"
  soilMoisture?: string // e.g. "Saturated/waterlogged", "Bone dry cracked", "Evenly moist organic loam"
  recentWeather?: string // e.g. "Prolonged heavy rainfall", "Recent heatwave / intense sun", "Sudden cold snap / frost", "Normal temperate"
  spreadExtent?: string // e.g. "Isolated single plant", "Spreading cluster along row", "All adjacent species affected"
  habitatContext?: string // e.g. "Vegetable garden plot", "Orchard / woodland edge", "Container patio pot", "Wild meadow"
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
  // Multi-agent investigative workflow additions
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
  moreEvidenceNeeded?: boolean
  clarifyingQuestionForUser?: string
  sourceMode: 'langgraph_fastapi' | 'ollama' | 'offline_guided'
  modelUsed?: string
  generatedAt: string
}

export interface JournalEntry {
  id?: number
  timestamp: string // ISO string
  missionType?: MissionType
  missionTitle?: string
  notes: string
  imageBlobUrl?: string // for display
  imageDataBase64?: string // for offline persistence
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
