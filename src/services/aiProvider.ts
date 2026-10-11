import type { ObservationReport, FieldContextData } from '../types'

export interface ObservationInput {
  observationText: string
  imageBase64?: string
  imageMimeType?: string
  missionType?: string
  fieldContext?: FieldContextData
}

export interface AIProvider {
  name: string
  checkHealth(): Promise<{ isReachable: boolean; message?: string }>
  listModels(): Promise<string[]>
  analyzeObservation(input: ObservationInput): Promise<ObservationReport>
}
