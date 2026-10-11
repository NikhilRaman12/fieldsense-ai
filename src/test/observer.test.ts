import { describe, it, expect } from 'vitest'
import { generateOfflineGuidedObservation } from '../services/offlineObserver'
import { validateObservationReport } from '../services/ollama'
import type { FieldContextData } from '../types'

describe('Observation Schema and Multi-Agent Investigation', () => {
  it('generates a transparent field investigation with specialist agents and competing hypotheses', () => {
    const note = 'Yellowing leaves on tomato plant with green veins'
    const context: FieldContextData = {
      affectedParts: 'Basal older leaves near plant base',
      symptomPattern: 'Interveinal chlorosis (yellowing between green veins)',
      soilMoisture: 'Saturated / waterlogged from recent rain',
      recentWeather: 'Prolonged overcast rain followed by sudden heat',
      spreadExtent: 'Isolated to single specimen; neighboring plants healthy',
    }

    const result = generateOfflineGuidedObservation(note, false, context)

    expect(result.report.sourceMode).toBe('offline_guided')
    expect(result.report.summary).toContain('Field Investigation')
    expect(result.report.visibleCharacteristics.length).toBeGreaterThan(0)

    // Verify specialist agents
    expect(result.report.specialistAgents?.length).toBe(3)
    const agentNames = result.report.specialistAgents?.map((a) => a.agentName)
    expect(agentNames).toContain('Pathology & Biotic Specialist')
    expect(agentNames).toContain('Agronomy & Soil Root Specialist')
    expect(agentNames).toContain('Ecology & Environmental Specialist')

    // Verify competing hypotheses
    expect(result.report.competingHypotheses?.length).toBeGreaterThanOrEqual(3)
    const hypNames = result.report.competingHypotheses?.map((h) => h.name).join(' ')
    expect(hypNames).toContain('Nutrient')
    expect(hypNames).toContain('Root Zone Anoxia')

    // Check supporting vs contradicting evidence
    const anoxiaHyp = result.report.competingHypotheses?.find((h) => h.id === 'hyp-root-anoxia')
    expect(anoxiaHyp).toBeDefined()
    expect(anoxiaHyp?.supportingEvidence.length).toBeGreaterThan(0)
    expect(anoxiaHyp?.missingDistinguishingClue).toBeDefined()

    // Verify discriminating tests
    expect(result.report.discriminatingTests?.length).toBeGreaterThan(0)
    expect(result.report.discriminatingTests![0].recommendedAction).toBeDefined()

    // Verify confidence & what remains unknown
    expect(result.report.uncertainty.rating).toBe('moderate')
    expect(result.report.whatRemainsUnknown?.length).toBeGreaterThan(0)
  })

  it('validates structured AI response and defaults missing fields safely', () => {
    const rawJson = {
      summary: 'Chlorosis multi-agent investigation report',
      visibleCharacteristics: ['Basal chlorosis', 'Turgid yellow blades'],
      specialistAgents: [
        {
          agentName: 'Agronomy Specialist',
          role: 'Soil nutrient dynamics',
          focusArea: 'Mobile ions',
          status: 'completed',
          findings: ['Magnesium or Nitrogen reallocation suspected'],
          suggestedDiscriminatingTest: 'Soil ribbon test',
        },
      ],
      competingHypotheses: [
        {
          id: 'hyp-1',
          name: 'Magnesium Deficiency',
          plausibility: 'likely',
          supportingEvidence: ['Basal leaf interveinal chlorosis'],
          contradictingEvidence: [],
          missingDistinguishingClue: 'Substrate pH check',
        },
        {
          id: 'hyp-2',
          name: 'Root Anoxia',
          plausibility: 'possible',
          supportingEvidence: ['High rain reported'],
          contradictingEvidence: [],
          missingDistinguishingClue: 'Root odor test',
        },
      ],
      discriminatingTests: [
        {
          targetHypothesesToDistinguish: 'Magnesium vs Anoxia',
          recommendedAction: 'Extract soil sample 10cm deep and inspect root color',
          whatToLookFor: 'White healthy root tips vs brown rot',
          riskOrImpact: 'Non-destructive',
        },
      ],
      uncertainty: {
        rating: 'moderate',
        explanation: 'Needs discriminating root test to confirm root viability',
      },
      whatRemainsUnknown: ['Root system depth', 'Soil pH'],
      nextObservation: 'Inspect feeder roots and test drainage',
      safetyConsiderations: ['Do not apply foliar sprays in direct midday heat'],
    }

    const validated = validateObservationReport(rawJson, 'gemma3')
    expect(validated.summary).toBe('Chlorosis multi-agent investigation report')
    expect(validated.sourceMode).toBe('ollama')
    expect(validated.modelUsed).toBe('gemma3')
    expect(validated.competingHypotheses?.length).toBe(2)
    expect(validated.specialistAgents?.length).toBe(1)
    expect(validated.discriminatingTests?.length).toBe(1)
    expect(validated.whatRemainsUnknown?.length).toBe(2)
  })

  it('handles malformed AI response gracefully', () => {
    const malformed = {
      summary: '',
      visibleCharacteristics: [],
    }

    const validated = validateObservationReport(malformed, 'gemma3')
    expect(validated.summary).toBe('Field Investigation Report')
    expect(validated.visibleCharacteristics.length).toBeGreaterThan(0)
    expect(validated.uncertainty.rating).toBe('moderate')
  })
})
