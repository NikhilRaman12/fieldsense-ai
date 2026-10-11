import React, { useState } from 'react'
import {
  Compass,
  Clock,
  Sparkles,
  ShieldAlert,
  Smartphone,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { generateMission, MISSION_TEMPLATES } from '../data/missions'
import type { MissionType, MissionDuration, MissionDifficulty, MissionDefinition } from '../types'

interface MissionViewProps {
  onCompleteMission: (mission: MissionDefinition, actualMinutes: number, reflectionText: string) => void
  onNavigateToObserver: (missionType?: MissionType) => void
}

export const MissionView: React.FC<MissionViewProps> = ({
  onCompleteMission,
  onNavigateToObserver,
}) => {
  const [selectedType, setSelectedType] = useState<MissionType>('plant_detective')
  const [duration, setDuration] = useState<MissionDuration>(20)
  const [difficulty, setDifficulty] = useState<MissionDifficulty>('curious')
  const [activeMission, setActiveMission] = useState<MissionDefinition | null>(null)
  const [isInMissionMode, setIsInMissionMode] = useState<boolean>(false)
  const [reflection, setReflection] = useState<string>('')
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({})

  const handleStartMission = () => {
    const mission = generateMission(selectedType, duration, difficulty)
    setActiveMission(mission)
    setIsInMissionMode(true)
    setCheckedTasks({})
    setReflection('')
  }

  const toggleTaskCheck = (taskId: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  const handleFinishMission = () => {
    if (!activeMission) return
    onCompleteMission(activeMission, activeMission.durationMinutes, reflection)
    setIsInMissionMode(false)
    setActiveMission(null)
  }

  return (
    <div className="mission-container">
      {!isInMissionMode ? (
        <>
          {/* Welcome Card */}
          <div className="card card-hero">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Compass style={{ color: 'var(--color-forest)' }} size={24} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-forest)' }}>
                Field Missions
              </span>
            </div>
            <h2 className="section-title">Today's Field Mission</h2>
            <p className="section-subtitle">
              Put the phone in your pocket, step into the outdoor world, and observe living details you normally rush past.
            </p>

            <div className="callout-box callout-info" style={{ margin: '0.5rem 0 1.25rem 0' }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Honest Outdoor Principle:</strong> FieldSense will never pretend to GPS-verify that you went outside. You own your time in nature.
              </div>
            </div>

            {/* Mission Type Selection */}
            <div className="selector-group">
              <label className="selector-label">1. Choose Observation Exploration</label>
              <div className="mission-grid">
                {(Object.keys(MISSION_TEMPLATES) as MissionType[]).map((typeKey) => {
                  const tmpl = MISSION_TEMPLATES[typeKey]
                  const isSelected = selectedType === typeKey
                  return (
                    <div
                      key={typeKey}
                      className={`mission-card-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedType(typeKey)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedType(typeKey)
                      }}
                    >
                      <div className="mission-option-header">
                        <span className="mission-option-title">{tmpl.title}</span>
                        {isSelected && <CheckCircle size={18} style={{ color: 'var(--color-forest)' }} />}
                      </div>
                      <p className="mission-option-desc">{tmpl.tagline}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-sage)', marginTop: 'auto' }}>
                        📍 {tmpl.natureZone}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Duration and Difficulty */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="selector-group">
                <label className="selector-label">
                  <Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  2. Mission Duration
                </label>
                <div className="pill-group">
                  {([10, 20, 30] as MissionDuration[]).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      className={`pill-btn ${duration === dur ? 'active' : ''}`}
                      onClick={() => setDuration(dur)}
                    >
                      {dur} Minutes
                    </button>
                  ))}
                </div>
              </div>

              <div className="selector-group">
                <label className="selector-label">
                  <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  3. Observation Depth
                </label>
                <div className="pill-group">
                  {(['gentle', 'curious', 'explorer'] as MissionDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      className={`pill-btn ${difficulty === diff ? 'active' : ''}`}
                      onClick={() => setDifficulty(diff)}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleStartMission}
                style={{ width: '100%', maxWidth: '360px' }}
              >
                <Compass size={20} /> Start My Field Mission
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ACTIVE MISSION MODE */
        activeMission && (
          <div>
            {/* PHONE AWAY SCREEN */}
            <div className="phone-away-screen" style={{ marginBottom: '1.5rem' }}>
              <Smartphone className="phone-away-icon" />
              <h3 className="phone-away-title">Phone in Pocket Mode</h3>
              <p className="phone-away-text">
                Your <strong>{activeMission.title}</strong> mission is now active for roughly{' '}
                <strong>{activeMission.durationMinutes} minutes</strong>. We encourage you to lock your screen or put the phone away. Take your time to breathe, watch the breeze, and observe nature directly.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                  href="#mission-tasks-section"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  View Observation Prompts ↓
                </a>
              </div>
            </div>

            {/* Step-by-step outdoor tasks */}
            <div id="mission-tasks-section" className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-sage)', fontWeight: 700 }}>
                    Active Field Session • {activeMission.difficulty.toUpperCase()} ({activeMission.durationMinutes} MIN)
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-forest-dark)' }}>
                    {activeMission.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    {activeMission.objective}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsInMissionMode(false)}
                >
                  <RotateCcw size={14} /> Change Mission
                </button>
              </div>

              {/* Safety notice */}
              <div className="callout-box callout-safety">
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Safety First:</strong> {activeMission.safetyReminder}
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--color-forest)' }}>
                Field Observation Steps:
              </h4>

              <div className="field-steps-list">
                {activeMission.tasks.map((task, idx) => {
                  const isChecked = !!checkedTasks[task.id]
                  return (
                    <div
                      key={task.id}
                      className="field-step-item"
                      style={{
                        backgroundColor: isChecked ? '#f4faf6' : '#ffffff',
                        borderColor: isChecked ? 'var(--color-forest)' : 'var(--color-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTaskCheck(task.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        aria-label={`Toggle task ${idx + 1}`}
                      >
                        {isChecked ? (
                          <CheckCircle size={24} style={{ color: 'var(--color-forest)' }} />
                        ) : (
                          <div className="step-num-badge">{idx + 1}</div>
                        )}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div
                          className="step-content-instruction"
                          style={{
                            textDecoration: isChecked ? 'line-through' : 'none',
                            color: isChecked ? 'var(--color-text-muted)' : 'var(--color-forest-dark)',
                          }}
                        >
                          {task.instruction}
                        </div>
                        <div className="step-content-tip">{task.fieldTip}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reflection & Finish */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <label className="form-label" htmlFor="mission-reflection">
                  Field Reflection: "What did you notice that you might have missed before?"
                </label>
                <textarea
                  id="mission-reflection"
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="e.g., I noticed the underside of the leaf was fuzzy and a tiny spider had woven a micro-web between two stems..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleFinishMission}
                  >
                    <CheckCircle size={18} /> I'm Back — Complete Mission
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onNavigateToObserver(activeMission.type)}
                  >
                    <BookOpen size={18} /> Record Observation with AI Observer <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
