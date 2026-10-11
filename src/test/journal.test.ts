import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveJournalEntry,
  getAllJournalEntries,
  deleteJournalEntry,
  calculateUserStats,
  exportJournalToJson,
  validateAndParseImportJson,
  clearAllJournalEntries,
} from '../services/journalService'
import type { JournalEntry } from '../types'

describe('Field Journal CRUD & Scorecard calculations', () => {
  beforeEach(async () => {
    await clearAllJournalEntries()
  })

  it('performs CRUD operations on journal entries', async () => {
    const entryData: Omit<JournalEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      missionType: 'plant_detective',
      missionTitle: 'Plant Detective',
      notes: 'Noticed opposite leaves on a dogwood branch.',
      durationMinutes: 20,
      report: {
        summary: 'Dogwood leaf observation',
        visibleCharacteristics: ['Opposite phyllotaxy', 'Arcuate venation'],
        possibleInterpretations: ['Cornus genus'],
        alternativeExplanations: ['Viburnum species'],
        uncertainty: { rating: 'moderate', explanation: 'Needs floral inspection' },
        nextObservation: 'Check bark alligator patterning',
        safetyConsiderations: ['Watch for ticks on shrub branches'],
        distinctionEvidenceVsInference: {
          observedEvidence: ['Curving leaf veins'],
          inferredHypotheses: ['Cornus florida candidate'],
        },
        sourceMode: 'offline_guided',
        generatedAt: new Date().toISOString(),
      },
    }

    const id = await saveJournalEntry(entryData)
    expect(id).toBeDefined()

    const all = await getAllJournalEntries()
    expect(all.length).toBe(1)
    expect(all[0].notes).toBe('Noticed opposite leaves on a dogwood branch.')

    await deleteJournalEntry(id)
    const afterDelete = await getAllJournalEntries()
    expect(afterDelete.length).toBe(0)
  })

  it('calculates honest scorecards and outdoor minutes without fabrication', () => {
    const today = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000).toISOString()

    const mockEntries: JournalEntry[] = [
      {
        id: 1,
        timestamp: today,
        missionType: 'plant_detective',
        notes: 'First note',
        durationMinutes: 20,
        report: {} as any,
      },
      {
        id: 2,
        timestamp: yesterday,
        missionType: 'backyard_biodiversity',
        notes: 'Second note',
        durationMinutes: 30,
        report: {} as any,
      },
    ]

    const stats = calculateUserStats(mockEntries)
    expect(stats.totalObservationsCount).toBe(2)
    expect(stats.completedMissionsCount).toBe(2)
    expect(stats.totalOutdoorMinutes).toBe(50)
    expect(stats.consecutiveDaysStreak).toBe(2)
  })

  it('validates JSON export and import safely', () => {
    const mockEntries: JournalEntry[] = [
      {
        timestamp: new Date().toISOString(),
        notes: 'Export test note',
        report: {
          summary: 'Summary test',
          visibleCharacteristics: ['A'],
          possibleInterpretations: ['B'],
          alternativeExplanations: ['C'],
          uncertainty: { rating: 'low', explanation: 'Clear' },
          nextObservation: 'Look closer',
          safetyConsiderations: ['Safe'],
          distinctionEvidenceVsInference: { observedEvidence: [], inferredHypotheses: [] },
          sourceMode: 'offline_guided',
          generatedAt: new Date().toISOString(),
        },
      },
    ]

    const json = exportJournalToJson(mockEntries)
    const parsed = validateAndParseImportJson(json)
    expect(parsed.length).toBe(1)
    expect(parsed[0].notes).toBe('Export test note')
  })

  it('rejects invalid or malformed JSON imports', () => {
    expect(() => validateAndParseImportJson('invalid { json')).toThrow('Invalid JSON file format.')
    expect(() => validateAndParseImportJson(JSON.stringify({ notEntries: [] }))).toThrow(
      'Import data does not contain a valid entries list.'
    )
  })
})
