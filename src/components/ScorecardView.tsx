import React from 'react'
import {
  Compass,
  Calendar,
  Clock,
  BookOpen,
  Award,
  ShieldCheck,
  Flame,
} from 'lucide-react'
import type { UserStats, JournalEntry } from '../types'

interface ScorecardViewProps {
  stats: UserStats
  entries: JournalEntry[]
  onStartNewMission: () => void
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  stats,
  entries,
  onStartNewMission,
}) => {
  return (
    <div className="scorecard-container">
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <Award style={{ color: 'var(--color-forest)' }} size={24} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-forest)' }}>
            Transparent Outdoor Metrics
          </span>
        </div>
        <h2 className="section-title">Discovery Scorecard</h2>
        <p className="section-subtitle">
          Real metrics calculated solely from your locally saved field records. No artificial points, no behavioral nudges, and no fake streaks.
        </p>

        {/* 4 Core Honest Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <Compass size={24} style={{ color: 'var(--color-forest)', margin: '0 auto 0.4rem auto' }} />
            <div className="stat-value">{stats.completedMissionsCount}</div>
            <div className="stat-label">Completed Missions</div>
          </div>

          <div className="stat-card">
            <BookOpen size={24} style={{ color: 'var(--color-sage)', margin: '0 auto 0.4rem auto' }} />
            <div className="stat-value">{stats.totalObservationsCount}</div>
            <div className="stat-label">Field Observations</div>
          </div>

          <div className="stat-card">
            <Clock size={24} style={{ color: 'var(--color-amber)', margin: '0 auto 0.4rem auto' }} />
            <div className="stat-value">{stats.totalOutdoorMinutes}</div>
            <div className="stat-label">Outdoor Minutes</div>
          </div>

          <div className="stat-card">
            <Flame size={24} style={{ color: '#ea580c', margin: '0 auto 0.4rem auto' }} />
            <div className="stat-value">{stats.consecutiveDaysStreak}</div>
            <div className="stat-label">Consecutive Active Days</div>
          </div>
        </div>

        {/* Scientific Integrity Note */}
        <div className="callout-box callout-info">
          <ShieldCheck size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.84rem' }}>
            <strong>Scientific & Mindful Design:</strong> FieldSense will never install addictive gamification badges or ping your phone with push notifications. The outdoor session itself is the reward.
          </div>
        </div>
      </div>

      {/* Recent Reflections Card */}
      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-forest-dark)', marginBottom: '0.75rem' }}>
          Recent Field Reflections
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          "What did you notice that you might have missed before?"
        </p>

        {entries.filter((e) => e.userReflection).length === 0 ? (
          <div style={{ padding: '1rem', background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
            No mission reflections logged yet. When you complete a mission, write a brief thought here!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries
              .filter((e) => e.userReflection)
              .slice(0, 5)
              .map((entry) => (
                <div
                  key={entry.id || entry.timestamp}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-sage)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(entry.timestamp).toLocaleDateString()} • {entry.missionTitle || 'Field Mission'}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-forest-dark)', fontStyle: 'italic', margin: 0 }}>
                    "{entry.userReflection}"
                  </p>
                </div>
              ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onStartNewMission}
          >
            <Compass size={18} /> Plan Today's Next Outdoor Mission
          </button>
        </div>
      </div>
    </div>
  )
}
