import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '../types'

export class FieldSenseDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, number>

  constructor() {
    super('FieldSenseDB')
    this.version(1).stores({
      journalEntries: '++id, timestamp, missionType',
    })
  }
}

export const db = new FieldSenseDatabase()
