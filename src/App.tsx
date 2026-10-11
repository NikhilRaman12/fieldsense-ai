import React, { useState, useEffect } from 'react'
import {
  Compass,
  Eye,
  BookOpen,
  Award,
  Settings,
  Leaf,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { MissionView } from './components/MissionView'
import { AIObserverView } from './components/AIObserverView'
import { FieldJournalView } from './components/FieldJournalView'
import { ScorecardView } from './components/ScorecardView'
import { SettingsView } from './components/SettingsView'
import {
  getAllJournalEntries,
  saveJournalEntry,
  calculateUserStats,
} from './services/journalService'
import { ollamaService } from './services/ollama'
import type {
  MissionType,
  MissionDefinition,
  ObservationReport,
  JournalEntry,
  UserStats,
  OllamaHealthStatus,
} from './types'

type ActiveTab = 'mission' | 'observer' | 'journal' | 'scorecard' | 'settings'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mission')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [stats, setStats] = useState<UserStats>({
    completedMissionsCount: 0,
    totalObservationsCount: 0,
    totalOutdoorMinutes: 0,
    consecutiveDaysStreak: 0,
  })
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false)
  const [pendingObserverMissionType, setPendingObserverMissionType] = useState<MissionType | undefined>()

  const loadData = async () => {
    try {
      const all = await getAllJournalEntries()
      setEntries(all)
      const calculated = calculateUserStats(all)
      setStats(calculated)
    } catch (err) {
      console.error('Failed to load journal entries from IndexedDB:', err)
    }
  }

  const checkOllama = async () => {
    try {
      const health = await ollamaService.checkHealth()
      setOllamaOnline(health.isReachable)
    } catch {
      setOllamaOnline(false)
    }
  }

  useEffect(() => {
    loadData()
    checkOllama()
  }, [])

  const handleCompleteMission = async (
    mission: MissionDefinition,
    actualMinutes: number,
    reflectionText: string
  ) => {
    const newEntry: Omit<JournalEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      missionType: mission.type,
      missionTitle: mission.title,
      durationMinutes: actualMinutes,
      notes: `Completed outdoor field mission: ${mission.title}.`,
      userReflection: reflectionText.trim() || undefined,
      report: {
        summary: `Completed ${mission.title} field session (${actualMinutes} min)`,
        visibleCharacteristics: mission.tasks.map((t) => t.instruction),
        possibleInterpretations: ['Self-guided natural discovery and habitat engagement'],
        alternativeExplanations: ['Natural phenomena vary widely across weather conditions and season'],
        uncertainty: {
          rating: 'low',
          explanation: 'Empirical user observation logged locally without speculative remote inference.',
        },
        nextObservation: 'Return to this habitat in 7–14 days to observe seasonal shifts.',
        safetyConsiderations: [mission.safetyReminder],
        distinctionEvidenceVsInference: {
          observedEvidence: mission.tasks.map((t) => t.instruction),
          inferredHypotheses: ['Outdoor observational engagement logged by user'],
        },
        sourceMode: 'offline_guided',
        generatedAt: new Date().toISOString(),
      },
    }

    await saveJournalEntry(newEntry)
    await loadData()
    setActiveTab('scorecard')
  }

  const handleSaveObservationToJournal = async (
    notes: string,
    report: ObservationReport,
    imageBase64?: string,
    imageMimeType?: string,
    missionType?: MissionType
  ) => {
    const newEntry: Omit<JournalEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      missionType,
      missionTitle: missionType ? missionType.replace('_', ' ').toUpperCase() : 'Natural Observation',
      notes: notes || 'Field observation record',
      imageDataBase64: imageBase64,
      imageMimeType: imageMimeType,
      report,
    }

    await saveJournalEntry(newEntry)
    await loadData()
  }

  const handleNavigateToObserver = (missionType?: MissionType) => {
    setPendingObserverMissionType(missionType)
    setActiveTab('observer')
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <Leaf className="brand-logo-icon" />
          <div className="brand-text-block">
            <h1>FieldSense AI</h1>
            <span className="brand-tagline">
              Step outside. Observe deeply. Let AI guide the discovery—not replace it.
            </span>
          </div>
        </div>

        <div>
          {ollamaOnline ? (
            <span className="header-status-badge" title="Local Ollama runtime is reachable">
              <span className="status-dot online"></span>
              <Wifi size={12} /> Local AI Online
            </span>
          ) : (
            <span
              className="header-status-badge"
              title="Local Ollama is offline — guided rule mode active"
              onClick={() => setActiveTab('settings')}
              style={{ cursor: 'pointer' }}
            >
              <span className="status-dot offline"></span>
              <WifiOff size={12} /> Guided Mode
            </span>
          )}
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="app-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'mission' ? 'active' : ''}`}
          onClick={() => setActiveTab('mission')}
        >
          <Compass className="nav-icon" />
          <span>Field Mission</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'observer' ? 'active' : ''}`}
          onClick={() => setActiveTab('observer')}
        >
          <Eye className="nav-icon" />
          <span>AI Observer</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('journal')
            loadData()
          }}
        >
          <BookOpen className="nav-icon" />
          <span>Field Journal ({entries.length})</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('scorecard')
            loadData()
          }}
        >
          <Award className="nav-icon" />
          <span>Scorecard</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="nav-icon" />
          <span>AI Settings</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'mission' && (
          <MissionView
            onCompleteMission={handleCompleteMission}
            onNavigateToObserver={handleNavigateToObserver}
          />
        )}

        {activeTab === 'observer' && (
          <AIObserverView
            initialMissionType={pendingObserverMissionType}
            onSaveToJournal={handleSaveObservationToJournal}
          />
        )}

        {activeTab === 'journal' && (
          <FieldJournalView entries={entries} onRefresh={loadData} />
        )}

        {activeTab === 'scorecard' && (
          <ScorecardView
            stats={stats}
            entries={entries}
            onStartNewMission={() => setActiveTab('mission')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onHealthStatusUpdate={(status: OllamaHealthStatus) => {
              setOllamaOnline(status.isReachable)
            }}
          />
        )}
      </main>
    </div>
  )
}
export default App
