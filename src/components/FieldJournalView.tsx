import React, { useState, useRef } from 'react'
import {
  BookOpen,
  Calendar,
  Trash2,
  Download,
  Upload,
  HelpCircle,
  Clock,
  Shield,
  Edit2,
  Check,
} from 'lucide-react'
import type { JournalEntry } from '../types'
import {
  deleteJournalEntry,
  clearAllJournalEntries,
  exportJournalToJson,
  validateAndParseImportJson,
  saveJournalEntry,
  updateJournalEntry,
} from '../services/journalService'

interface FieldJournalViewProps {
  entries: JournalEntry[]
  onRefresh: () => void
}

export const FieldJournalView: React.FC<FieldJournalViewProps> = ({
  entries,
  onRefresh,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState<string>('')
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<boolean>(false)

  const importFileRef = useRef<HTMLInputElement>(null)

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (window.confirm('Are you sure you want to delete this field observation?')) {
      await deleteJournalEntry(id)
      onRefresh()
    }
  }

  const handleStartEdit = (entry: JournalEntry) => {
    if (!entry.id) return
    setEditingId(entry.id)
    setEditText(entry.notes)
  }

  const handleSaveEdit = async (id: number) => {
    await updateJournalEntry(id, { notes: editText })
    setEditingId(null)
    onRefresh()
  }

  const handleExport = () => {
    if (entries.length === 0) {
      alert('Your field journal has no entries to export yet.')
      return
    }
    const jsonStr = exportJournalToJson(entries)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fieldsense-journal-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedEntries = validateAndParseImportJson(text)
      for (const item of importedEntries) {
        await saveJournalEntry(item)
      }
      alert(`Successfully imported ${importedEntries.length} field observations!`)
      onRefresh()
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse import file.')
    } finally {
      if (importFileRef.current) {
        importFileRef.current.value = ''
      }
    }
  }

  const handleClearAll = async () => {
    await clearAllJournalEntries()
    setConfirmClear(false)
    onRefresh()
  }

  return (
    <div className="journal-container">
      {/* Header and Controls */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <BookOpen style={{ color: 'var(--color-forest)' }} size={24} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-forest)' }}>
                Field Journal
              </span>
            </div>
            <h2 className="section-title">Your Outdoor Observations</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              All records and photographs are held strictly in your browser's local IndexedDB. Nothing is uploaded to remote servers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExport}
              disabled={entries.length === 0}
            >
              <Download size={15} /> Export JSON
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => importFileRef.current?.click()}
            >
              <Upload size={15} /> Import JSON
            </button>

            <input
              type="file"
              ref={importFileRef}
              onChange={handleImportFile}
              accept=".json"
              style={{ display: 'none' }}
            />

            {entries.length > 0 && !confirmClear && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 size={15} /> Clear All
              </button>
            )}

            {confirmClear && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleClearAll}
                >
                  Confirm Delete All
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {importError && (
          <div style={{ color: '#b91c1c', fontSize: '0.84rem', marginTop: '0.75rem' }}>
            {importError}
          </div>
        )}

        {/* Local Storage Disclosure */}
        <div className="callout-box callout-info" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          <Shield size={18} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem' }}>
            <strong>Local Privacy & Storage Disclosure:</strong> Data is saved on this browser profile via IndexedDB. Browser storage is sandboxed on this computer, but is neither encrypted at rest by the browser nor permanently durable if browser history/site data is completely cleared. Use <em>Export JSON</em> to keep offline backup archives.
          </div>
        </div>
      </div>

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <BookOpen size={48} style={{ color: 'var(--color-sage-light)', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-forest-dark)', marginBottom: '0.5rem' }}>
            Your Field Notebook is Empty
          </h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.92rem' }}>
            Begin by selecting a field mission on the home screen or head straight to the AI Observer to record what you see in the grass, leaves, or soil today.
          </p>
        </div>
      ) : (
        /* List of Journal Entries */
        <div>
          {entries.map((entry) => {
            const dateStr = new Date(entry.timestamp).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            const isEditing = editingId === entry.id

            return (
              <div key={entry.id || entry.timestamp} className="journal-item">
                <div className="journal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-forest-dark)', fontSize: '1rem' }}>
                      {entry.report.summary || 'Field Observation'}
                    </span>
                    {entry.missionTitle && (
                      <span className="badge-tag" style={{ backgroundColor: 'var(--color-sage-subtle)', color: 'var(--color-forest)' }}>
                        {entry.missionTitle}
                      </span>
                    )}
                    {entry.durationMinutes && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={12} /> {entry.durationMinutes} min
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(entry)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sage)' }}
                        aria-label="Edit notes"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
                      aria-label="Delete entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="journal-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  <Calendar size={13} /> {dateStr}
                  <span style={{ margin: '0 0.35rem' }}>•</span>
                  <span>
                    Mode: {entry.report.sourceMode === 'ollama' ? `Ollama (${entry.report.modelUsed || 'local'})` : 'Guided Rule Engine'}
                  </span>
                </div>

                {/* Photo if present */}
                {entry.imageDataBase64 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <img
                      src={entry.imageDataBase64}
                      alt="Field observation"
                      style={{ maxHeight: '200px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                )}

                {/* User Notes */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Field Notes:</strong>
                  {isEditing ? (
                    <div style={{ marginTop: '0.4rem' }}>
                      <textarea
                        className="form-textarea"
                        style={{ minHeight: '70px' }}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveEdit(entry.id!)}
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                      {entry.notes || 'No user notes added.'}
                    </p>
                  )}
                </div>

                {/* Reflection if recorded */}
                {entry.userReflection && (
                  <div style={{ background: '#fdfbf7', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-amber)', marginBottom: '0.85rem', fontSize: '0.86rem' }}>
                    <em>Reflection: "{entry.userReflection}"</em>
                  </div>
                )}

                {/* Observation Report Summary */}
                <div style={{ backgroundColor: 'var(--color-cream)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-forest)', fontWeight: 600, marginBottom: '0.35rem' }}>
                    <HelpCircle size={15} />
                    Uncertainty / Confidence: {entry.report.uncertainty.rating.toUpperCase()}
                  </div>

                  {entry.report.competingHypotheses && entry.report.competingHypotheses.length > 0 && (
                    <div style={{ marginTop: '0.35rem', marginBottom: '0.4rem' }}>
                      <strong>Plausible Explanations:</strong>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {entry.report.competingHypotheses.map((h) => (
                          <span
                            key={h.id}
                            className={`plausibility-badge ${h.plausibility}`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {h.name} ({h.plausibility})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ color: 'var(--color-text-muted)' }}>
                    <strong>Next discriminating field check:</strong> {entry.report.nextObservation}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
