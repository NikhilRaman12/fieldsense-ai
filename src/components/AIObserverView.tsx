import React, { useState, useRef } from 'react'
import {
  Upload,
  CheckCircle2,
  BookMarked,
  Shield,
  ShieldAlert,
  X,
  Cpu,
  Layers,
  FlaskConical,
  HelpCircle as QuestionIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ObservationReport, MissionType, FieldContextData } from '../types'
import { processObservationWithFallback, ollamaService } from '../services/ollama'
import { validateImageFile, fileToBase64 } from '../utils/imageUtils'

interface AIObserverViewProps {
  initialMissionType?: MissionType
  onSaveToJournal: (
    notes: string,
    report: ObservationReport,
    imageBase64?: string,
    imageMimeType?: string,
    missionType?: MissionType
  ) => void
}

export const AIObserverView: React.FC<AIObserverViewProps> = ({
  initialMissionType,
  onSaveToJournal,
}) => {
  const [observationText, setObservationText] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  // Guided field context questions
  const [showAdvancedContext, setShowAdvancedContext] = useState<boolean>(true)
  const [affectedParts, setAffectedParts] = useState<string>('Basal older leaves near plant base')
  const [symptomPattern, setSymptomPattern] = useState<string>('Interveinal chlorosis (yellowing between green veins)')
  const [soilMoisture, setSoilMoisture] = useState<string>('Saturated / waterlogged from recent rain')
  const [recentWeather, setRecentWeather] = useState<string>('Prolonged overcast rain followed by sudden heat')
  const [spreadExtent, setSpreadExtent] = useState<string>('Isolated to single specimen; neighboring plants healthy')
  const [habitatContext, setHabitatContext] = useState<string>('Garden vegetable / raised border bed')

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [report, setReport] = useState<ObservationReport | null>(null)
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid image file.')
      return
    }

    try {
      const b64 = await fileToBase64(file)
      setImageFile(file)
      setImageBase64(b64)
      setImagePreviewUrl(b64)
    } catch {
      setImageError('Failed to read image file into memory.')
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImageBase64(null)
    setImagePreviewUrl(null)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyze = async () => {
    if (!observationText.trim() && !imageBase64) {
      alert('Please enter a field note or attach a photo before analyzing.')
      return
    }

    setIsAnalyzing(true)
    setReport(null)
    setSavedSuccess(false)
    setStatusMessage('Coordinating specialist investigation agents...')

    const fieldContext: FieldContextData = {
      affectedParts,
      symptomPattern,
      soilMoisture,
      recentWeather,
      spreadExtent,
      habitatContext,
    }

    try {
      const generatedReport = await processObservationWithFallback(
        {
          observationText: observationText.trim() || 'Outdoor specimen field investigation',
          imageBase64: imageBase64 || undefined,
          imageMimeType: imageFile?.type || undefined,
          missionType: initialMissionType,
          fieldContext,
        },
        (msg) => setStatusMessage(msg)
      )
      setReport(generatedReport)
    } catch (err: any) {
      setStatusMessage(`Analysis error: ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = () => {
    if (!report) return
    onSaveToJournal(
      observationText,
      report,
      imageBase64 || undefined,
      imageFile?.type || undefined,
      initialMissionType
    )
    setSavedSuccess(true)
  }

  return (
    <div className="observer-container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <FlaskConical style={{ color: 'var(--color-forest)' }} size={24} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-forest)' }}>
            Scientific Field Investigator
          </span>
        </div>
        <h2 className="section-title">Field Investigation: Observations → Explanations</h2>
        <p className="section-subtitle">
          Field scientists don't jump to hasty diagnoses from a single photograph. FieldSense coordinates specialist agents (Pathology, Agronomy, and Micro-climate) to formulate competing hypotheses and identify the exact discriminating field tests needed to distinguish them.
        </p>

        {/* Observation text input */}
        <div className="form-group">
          <label className="form-label" htmlFor="field-observation-input">
            1. Primary Field Observation Note
          </label>
          <textarea
            id="field-observation-input"
            className="form-textarea"
            placeholder="e.g. Yellowing leaves observed on tomato plant. Basal leaves turning pale yellow while top leaves look green. Soil feels wet..."
            value={observationText}
            onChange={(e) => setObservationText(e.target.value)}
          />
        </div>

        {/* Field photo upload */}
        <div className="form-group">
          <label className="form-label">
            2. Field Photograph (Optional — processed strictly on local hardware)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            id="field-image-file"
          />

          {!imagePreviewUrl ? (
            <div
              className="image-upload-box"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
            >
              <Upload size={32} style={{ color: 'var(--color-sage)', margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, color: 'var(--color-forest-dark)', fontSize: '0.95rem' }}>
                Tap to attach a field photo
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                JPEG, PNG, or WebP up to 5 MB. Stored purely on this machine.
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="image-preview-wrapper">
                <img src={imagePreviewUrl} alt="Field observation upload preview" />
                <button
                  type="button"
                  className="remove-img-btn"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {imageError && (
            <div style={{ color: '#b91c1c', fontSize: '0.84rem', marginTop: '0.5rem' }}>
              {imageError}
            </div>
          )}
        </div>

        {/* GUIDED FIELD CONTEXT SECTION */}
        <div className="context-fields-panel">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowAdvancedContext(!showAdvancedContext)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: 'var(--color-forest)' }} />
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-forest-dark)' }}>
                3. Field Context & Habitat Clues (Essential for Discriminating Causes)
              </strong>
            </div>
            {showAdvancedContext ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {showAdvancedContext && (
            <div className="context-grid">
              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Where are symptoms located?</label>
                <select
                  className="field-select"
                  value={affectedParts}
                  onChange={(e) => setAffectedParts(e.target.value)}
                >
                  <option value="Basal older leaves near plant base">Basal older leaves near plant base</option>
                  <option value="Young terminal shoots and top leaves">Young terminal shoots and top leaves</option>
                  <option value="Uniform across entire plant canopy">Uniform across entire plant canopy</option>
                  <option value="One single side / branch only">One single side / branch only</option>
                  <option value="Stems and root collar region">Stems and root collar region</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Visual symptom pattern</label>
                <select
                  className="field-select"
                  value={symptomPattern}
                  onChange={(e) => setSymptomPattern(e.target.value)}
                >
                  <option value="Interveinal chlorosis (yellowing between green veins)">Interveinal chlorosis (yellowing between green veins)</option>
                  <option value="Uniform pale yellowing of entire leaf blade">Uniform pale yellowing of entire leaf blade</option>
                  <option value="Marginal scorched or crispy brown leaf edges">Marginal scorched or crispy brown leaf edges</option>
                  <option value="Stippled spots / speckles or halos">Stippled spots / speckles or halos</option>
                  <option value="Wilting / flagging despite moist soil">Wilting / flagging despite moist soil</option>
                  <option value="Holes / margin chewing / physical tear">Holes / margin chewing / physical tear</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Substrate / Soil moisture</label>
                <select
                  className="field-select"
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(e.target.value)}
                >
                  <option value="Saturated / waterlogged from recent rain">Saturated / waterlogged from recent rain</option>
                  <option value="Evenly moist, crumbly loam">Evenly moist, crumbly loam</option>
                  <option value="Bone dry / dusty or surface cracked">Bone dry / dusty or surface cracked</option>
                  <option value="Dense clay / compacted pooling water">Dense clay / compacted pooling water</option>
                  <option value="Sandy / fast draining substrate">Sandy / fast draining substrate</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Recent weather condition</label>
                <select
                  className="field-select"
                  value={recentWeather}
                  onChange={(e) => setRecentWeather(e.target.value)}
                >
                  <option value="Prolonged overcast rain followed by sudden heat">Prolonged overcast rain followed by sudden heat</option>
                  <option value="Extended high heatwave and harsh sun">Extended high heatwave and harsh sun</option>
                  <option value="Recent sudden frost / cold snap">Recent sudden frost / cold snap</option>
                  <option value="Steady temperate weather">Steady temperate weather</option>
                  <option value="Strong drying winds">Strong drying winds</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Spread across population</label>
                <select
                  className="field-select"
                  value={spreadExtent}
                  onChange={(e) => setSpreadExtent(e.target.value)}
                >
                  <option value="Isolated to single specimen; neighboring plants healthy">Isolated to single specimen; neighboring plants healthy</option>
                  <option value="Spreading cluster along row / patch">Spreading cluster along row / patch</option>
                  <option value="All adjacent unrelated plant species affected">All adjacent unrelated plant species affected</option>
                  <option value="Randomly scattered across field">Randomly scattered across field</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Ecological habitat setting</label>
                <select
                  className="field-select"
                  value={habitatContext}
                  onChange={(e) => setHabitatContext(e.target.value)}
                >
                  <option value="Garden vegetable / raised border bed">Garden vegetable / raised border bed</option>
                  <option value="Container / patio potted plant">Container / patio potted plant</option>
                  <option value="Orchard / deciduous tree canopy">Orchard / deciduous tree canopy</option>
                  <option value="Wild forest verge / natural hedgerow">Wild forest verge / natural hedgerow</option>
                  <option value="Open grassland / lawn meadow">Open grassland / lawn meadow</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Safety Note */}
        <div className="callout-box callout-disclaimer">
          <Shield size={20} style={{ flexShrink: 0, color: 'var(--color-forest)' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.45' }}>
            <strong>Investigative Ethics:</strong> We do not jump to definitive disease or nutrient diagnoses. FieldSense helps you understand competing biological explanations, eliminates premature pesticide/fertilizer usage, and guides safe, hands-on tests.
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Cpu size={18} className="spin" /> Coordinating Specialist Agents...
              </>
            ) : (
              <>
                <FlaskConical size={18} /> Coordinate Investigation & Competing Hypotheses
              </>
            )}
          </button>

          {isAnalyzing && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-sage)', fontStyle: 'italic' }}>
              {statusMessage}
            </span>
          )}
        </div>
      </div>

      {/* FIELD INVESTIGATION REPORT */}
      {report && (
        <div className="report-card">
          <div className="report-header">
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                Field Investigation Report
              </span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-forest-dark)', margin: '0.1rem 0' }}>
                {report.summary}
              </h3>
            </div>

            {report.sourceMode === 'langgraph_fastapi' ? (
              <span className="badge-tag badge-ai" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7' }}>
                <Cpu size={14} /> FastAPI + LangGraph Orchestration (6 Specialist Agents)
              </span>
            ) : report.sourceMode === 'ollama' ? (
              <span className="badge-tag badge-ai">
                <Cpu size={14} /> Open-Weight AI ({report.modelUsed || ollamaService.modelName})
              </span>
            ) : (
              <span className="badge-tag badge-offline">
                <ShieldAlert size={14} /> Local model unavailable — guided specialist mode active
              </span>
            )}
          </div>

          {/* INTERACTIVE DECISION: IS MORE EVIDENCE NEEDED? */}
          {report.clarifyingQuestionForUser && (
            <div className="callout-box callout-safety" style={{ margin: '0.5rem 0 1.25rem 0' }}>
              <QuestionIcon size={20} style={{ color: '#b45309', flexShrink: 0 }} />
              <div>
                <strong>Decision: More Evidence Needed</strong>
                <p style={{ margin: '0.2rem 0 0.5rem 0', fontSize: '0.88rem' }}>
                  {report.clarifyingQuestionForUser}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setAffectedParts('Basal older leaves near plant base')
                      handleAnalyze()
                    }}
                  >
                    Confirm: Older Basal Leaves Only
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAffectedParts('Young terminal shoots and top leaves')
                      handleAnalyze()
                    }}
                  >
                    Confirm: Young Top Shoots
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 1. DIRECTLY OBSERVED EVIDENCE */}
          <div className="report-section">
            <div className="report-section-title">1. Directly Observed Empirical Evidence</div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem' }}>
              {report.visibleCharacteristics.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.3rem' }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* 2. SPECIALIST AGENTS DECK */}
          {report.specialistAgents && report.specialistAgents.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">2. Specialist Agent Contributions</div>
              <div className="specialists-deck">
                {report.specialistAgents.map((agent, idx) => (
                  <div key={idx} className="specialist-card">
                    <div className="specialist-header">
                      <span className="specialist-title">{agent.agentName}</span>
                      <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                    </div>
                    <span className="specialist-role">{agent.role}</span>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      <strong>Focus:</strong> {agent.focusArea}
                    </div>
                    <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', margin: '0.2rem 0' }}>
                      {agent.findings.map((f, fIdx) => (
                        <li key={fIdx} style={{ marginBottom: '0.2rem' }}>{f}</li>
                      ))}
                    </ul>
                    {agent.suggestedDiscriminatingTest && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-forest)', background: 'var(--color-sage-subtle)', padding: '0.35rem 0.5rem', borderRadius: '4px', marginTop: 'auto' }}>
                        💡 <strong>Suggested check:</strong> {agent.suggestedDiscriminatingTest}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. RETRIEVED SCIENTIFIC KNOWLEDGE INDEX */}
          {report.retrievedKnowledge && report.retrievedKnowledge.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">3. Retrieved Scientific Knowledge Passages</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {report.retrievedKnowledge.map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#f6f9f7',
                      border: '1px solid var(--color-sage-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--color-forest-dark)' }}>
                        [{doc.id}] {doc.topic}
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-sage)', fontWeight: 600 }}>
                        {doc.domain}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0', color: 'var(--color-text-main)', lineHeight: '1.45' }}>
                      {doc.passage}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-forest)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      Scientific Key: {doc.scientificKey}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. COMPETING HYPOTHESES & SUPPORTING VS CONTRADICTING EVIDENCE */}
          {report.competingHypotheses && report.competingHypotheses.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">4. Competing Biological Explanations & Evidence Matrix</div>
              <div>
                {report.competingHypotheses.map((hyp) => (
                  <div key={hyp.id} className={`hypothesis-item ${hyp.plausibility}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--color-forest-dark)' }}>
                        {hyp.name}
                      </strong>
                      <span className={`plausibility-badge ${hyp.plausibility}`}>
                        Plausibility: {hyp.plausibility.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="evidence-dual-col">
                      <div className="evidence-box support">
                        <strong>✓ Supporting Evidence:</strong>
                        {hyp.supportingEvidence.length > 0 ? (
                          <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', marginBottom: 0 }}>
                            {hyp.supportingEvidence.map((e, eIdx) => (
                              <li key={eIdx}>{e}</li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>None directly confirmed yet.</div>
                        )}
                      </div>

                      <div className="evidence-box contradict">
                        <strong>✗ Contradicting / Inconsistent Evidence:</strong>
                        {hyp.contradictingEvidence.length > 0 ? (
                          <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', marginBottom: 0 }}>
                            {hyp.contradictingEvidence.map((e, eIdx) => (
                              <li key={eIdx}>{e}</li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>No direct contradiction found.</div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                      <strong>Missing Distinguishing Clue:</strong> {hyp.missingDistinguishingClue}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. DISCRIMINATING FIELD TESTS */}
          {report.discriminatingTests && report.discriminatingTests.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">4. Recommended Next Field Tests to Distinguish Explanations</div>
              <div>
                {report.discriminatingTests.map((test, idx) => (
                  <div key={idx} className="test-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-amber)', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.25rem' }}>
                      <FlaskConical size={16} />
                      Target: {test.targetHypothesesToDistinguish}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-forest-dark)', fontWeight: 600 }}>
                      Action: {test.recommendedAction}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      <strong>What to look for:</strong> {test.whatToLookFor}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-sage)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                      Impact: {test.riskOrImpact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. CONFIDENCE & WHAT REMAINS UNKNOWN */}
          <div className="report-section" style={{ background: '#fcfaf6', padding: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <QuestionIcon size={16} style={{ color: 'var(--color-amber)' }} />
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-forest-dark)' }}>
                System Confidence Assessment: {report.uncertainty.rating.toUpperCase()}
              </strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0' }}>
              {report.uncertainty.explanation}
            </p>

            {report.whatRemainsUnknown && report.whatRemainsUnknown.length > 0 && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem', fontSize: '0.82rem' }}>
                <strong style={{ color: 'var(--color-forest)' }}>What Remains Unknown:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.2rem', color: 'var(--color-text-muted)' }}>
                  {report.whatRemainsUnknown.map((unk, uIdx) => (
                    <li key={uIdx}>{unk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Safety Considerations */}
          <div className="report-section" style={{ marginTop: '0.9rem' }}>
            <div className="report-section-title">⚠️ Safety & Responsible Action</div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.84rem', color: '#92400e' }}>
              {report.safetyConsiderations.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Save to Field Journal */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!savedSuccess ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
              >
                <BookMarked size={18} /> Save Investigation into Field Journal
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-forest)', fontWeight: 600, fontSize: '0.9rem' }}>
                <CheckCircle2 size={20} /> Investigation report saved to your local Field Journal!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
