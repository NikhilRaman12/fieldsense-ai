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
  ShoppingBag,
} from 'lucide-react'
import { MissionView } from './components/MissionView'
import { AIObserverView } from './components/AIObserverView'
import { FieldJournalView } from './components/FieldJournalView'
import { ScorecardView } from './components/ScorecardView'
import { SettingsView } from './components/SettingsView'
import { OrdersHistoryView } from './components/OrdersHistoryView'
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

type ActiveTab = 'mission' | 'observer' | 'journal' | 'scorecard' | 'orders' | 'settings'

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
    const interval = setInterval(checkOllama, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleCompleteMission = async (
    mission: MissionDefinition,
    actualMinutes: number,
    reflectionNotes?: string
  ) => {
    const newEntry: Omit<JournalEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      missionType: mission.type,
      missionTitle: mission.title,
      notes: `Outdoor Session: ${mission.title} completed in ${actualMinutes} minutes.`,
      userReflection: reflectionNotes,
      durationMinutes: actualMinutes,
      report: {
        summary: `Completed ${mission.title} field session (${actualMinutes} min)`,
        visibleCharacteristics: mission.tasks.map((t) => t.instruction),
        possibleInterpretations: ['Self-guided natural discovery and habitat engagement'],
        alternativeExplanations: [],
        uncertainty: {
          rating: 'low',
          explanation: 'Direct physical participation logged outdoors.',
        },
        nextObservation: mission.recordingTip,
        safetyConsiderations: [mission.safetyReminder],
        distinctionEvidenceVsInference: {
          observedEvidence: mission.tasks.map((t) => t.instruction),
          inferredHypotheses: ['Direct physical participation logged outdoors'],
        },
        sourceMode: 'offline_guided',
        modelUsed: 'Field Mission Guide',
        generatedAt: new Date().toISOString(),
      },
    }

    try {
      await saveJournalEntry(newEntry)
      await loadData()
      setActiveTab('scorecard')
    } catch (err) {
      console.error('Failed to save mission to journal:', err)
    }
  }

  const handleNavigateToObserver = (missionType?: MissionType) => {
    setPendingObserverMissionType(missionType)
    setActiveTab('observer')
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
      notes,
      imageDataBase64: imageBase64,
      imageMimeType,
      report,
    }

    try {
      await saveJournalEntry(newEntry)
      await loadData()
    } catch (err) {
      console.error('Failed to save observation to journal:', err)
    }
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Leaf size={22} color="#ffffff" />
          </div>
          <div className="brand-titles">
            <h1 className="brand-name">FieldSense AI</h1>
            <p className="brand-tagline">Observe Deeply • Verified Remediation via PayPal</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="ai-status-indicator"
            onClick={() => setActiveTab('settings')}
            title={ollamaOnline ? 'Local open-weight AI connected' : 'Guided Investigation mode'}
          >
            {ollamaOnline ? (
              <>
                <Wifi size={14} style={{ color: 'var(--color-forest)' }} />
                <span className="status-text online">Local AI Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} style={{ color: 'var(--color-sage)' }} />
                <span className="status-text offline">Guided Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs-bar" role="tablist">
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
          onClick={() => {
            setPendingObserverMissionType(undefined)
            setActiveTab('observer')
          }}
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
          className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag className="nav-icon" />
          <span>Field Supplies</span>
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
            onNavigateToOrders={() => setActiveTab('orders')}
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

        {activeTab === 'orders' && (
          <OrdersHistoryView />
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
