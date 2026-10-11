import { db } from '../db'
import type { JournalEntry, UserStats } from '../types'

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const entries = await db.journalEntries.orderBy('timestamp').reverse().toArray()
  return entries
}

export async function getJournalEntryById(id: number): Promise<JournalEntry | undefined> {
  return await db.journalEntries.get(id)
}

export async function saveJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<number> {
  const id = await db.journalEntries.add(entry as JournalEntry)
  return id
}

export async function updateJournalEntry(id: number, changes: Partial<JournalEntry>): Promise<void> {
  await db.journalEntries.update(id, changes)
}

export async function deleteJournalEntry(id: number): Promise<void> {
  await db.journalEntries.delete(id)
}

export async function clearAllJournalEntries(): Promise<void> {
  await db.journalEntries.clear()
}

export function calculateUserStats(entries: JournalEntry[]): UserStats {
  const totalObservationsCount = entries.length

  // Filter completed missions (entries with duration or missionType)
  const completedMissions = entries.filter((e) => e.missionType && e.durationMinutes && e.durationMinutes > 0)
  const completedMissionsCount = completedMissions.length

  // Sum outdoor minutes reported by user
  const totalOutdoorMinutes = entries.reduce((acc, curr) => {
    return acc + (curr.durationMinutes || 0)
  }, 0)

  // Calculate consecutive days streak
  if (entries.length === 0) {
    return {
      completedMissionsCount: 0,
      totalObservationsCount: 0,
      totalOutdoorMinutes: 0,
      consecutiveDaysStreak: 0,
    }
  }

  // Get distinct calendar dates in YYYY-MM-DD
  const dateSet = new Set<string>()
  entries.forEach((e) => {
    const d = new Date(e.timestamp)
    if (!isNaN(d.getTime())) {
      dateSet.add(d.toISOString().slice(0, 10))
    }
  })

  const sortedDates = Array.from(dateSet).sort().reverse() // newest first

  if (sortedDates.length === 0) {
    return {
      completedMissionsCount,
      totalObservationsCount,
      totalOutdoorMinutes,
      consecutiveDaysStreak: 0,
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Streak is only active if the latest entry is today or yesterday
  const latestDate = sortedDates[0]
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return {
      completedMissionsCount,
      totalObservationsCount,
      totalOutdoorMinutes,
      consecutiveDaysStreak: 0,
      lastActiveDate: latestDate,
    }
  }

  let streak = 0
  let currentDate = new Date(latestDate)

  for (let i = 0; i < sortedDates.length; i++) {
    const expectedStr = currentDate.toISOString().slice(0, 10)
    if (sortedDates.includes(expectedStr)) {
      streak++
      currentDate = new Date(currentDate.getTime() - 86400000)
    } else {
      break
    }
  }

  return {
    completedMissionsCount,
    totalObservationsCount,
    totalOutdoorMinutes,
    consecutiveDaysStreak: streak,
    lastActiveDate: latestDate,
  }
}

export function exportJournalToJson(entries: JournalEntry[]): string {
  const exportPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    appName: 'FieldSense AI',
    entriesCount: entries.length,
    entries,
  }
  return JSON.stringify(exportPayload, null, 2)
}

export function validateAndParseImportJson(jsonString: string): JournalEntry[] {
  let parsed: any
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON file format.')
  }

  const rawEntries = Array.isArray(parsed) ? parsed : parsed.entries
  if (!Array.isArray(rawEntries)) {
    throw new Error('Import data does not contain a valid entries list.')
  }

  const validated: JournalEntry[] = []

  for (let i = 0; i < rawEntries.length; i++) {
    const item = rawEntries[i]
    if (!item || typeof item !== 'object') continue
    if (!item.timestamp || typeof item.timestamp !== 'string') continue
    if (typeof item.notes !== 'string') continue

    // Validate report structure if present
    if (!item.report || typeof item.report !== 'object' || !item.report.summary) {
      continue
    }

    validated.push({
      timestamp: item.timestamp,
      missionType: item.missionType,
      missionTitle: item.missionTitle,
      notes: item.notes,
      durationMinutes: typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined,
      userReflection: typeof item.userReflection === 'string' ? item.userReflection : undefined,
      imageDataBase64: typeof item.imageDataBase64 === 'string' ? item.imageDataBase64 : undefined,
      imageMimeType: typeof item.imageMimeType === 'string' ? item.imageMimeType : undefined,
      report: item.report,
    })
  }

  if (validated.length === 0 && rawEntries.length > 0) {
    throw new Error('No valid FieldSense journal entries found in file.')
  }

  return validated
}
