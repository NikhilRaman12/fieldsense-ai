import React, { useState, useEffect } from 'react'
import {
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Terminal,
} from 'lucide-react'
import { ollamaService } from '../services/ollama'
import type { OllamaHealthStatus } from '../types'

interface SettingsViewProps {
  onHealthStatusUpdate?: (status: OllamaHealthStatus) => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onHealthStatusUpdate }) => {
  const [baseUrl, setBaseUrl] = useState<string>(ollamaService.baseUrl)
  const [modelName, setModelName] = useState<string>(ollamaService.modelName)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{
    tested: boolean
    success: boolean
    message: string
    availableModels: string[]
  }>({
    tested: false,
    success: false,
    message: '',
    availableModels: [],
  })

  const testConnection = async () => {
    setIsTesting(true)
    ollamaService.setBaseUrl(baseUrl)
    ollamaService.setModelName(modelName)

    try {
      const health = await ollamaService.checkHealth()
      if (health.isReachable) {
        const models = await ollamaService.listModels()
        const hasSelected = models.some((m) => m.toLowerCase().includes(modelName.toLowerCase()))

        const resultState = {
          tested: true,
          success: true,
          message: hasSelected
            ? `Connected to Ollama! Model "${modelName}" is installed and ready.`
            : `Connected to Ollama, but model "${modelName}" was not found in installed tags (${models.join(', ') || 'none'}). Pull it via terminal!`,
          availableModels: models,
        }
        setTestResult(resultState)

        onHealthStatusUpdate?.({
          isReachable: true,
          baseUrl,
          availableModels: models,
          selectedModel: modelName,
          selectedModelVisionCapable: modelName.toLowerCase().includes('gemma3') || modelName.toLowerCase().includes('llava') || modelName.toLowerCase().includes('vision'),
          lastChecked: new Date().toISOString(),
        })
      } else {
        const resultState = {
          tested: true,
          success: false,
          message: health.message || 'Ollama service is not running or unreachable at ' + baseUrl,
          availableModels: [],
        }
        setTestResult(resultState)

        onHealthStatusUpdate?.({
          isReachable: false,
          baseUrl,
          availableModels: [],
          selectedModel: modelName,
          selectedModelVisionCapable: false,
          lastChecked: new Date().toISOString(),
          errorMessage: health.message,
        })
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'Error communicating with endpoint.',
        availableModels: [],
      })
    } finally {
      setIsTesting(false)
    }
  }

  useEffect(() => {
    // Initial health check on mount
    testConnection()
  }, [])

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <Settings style={{ color: 'var(--color-forest)' }} size={24} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-forest)' }}>
            AI Runtime & Privacy
          </span>
        </div>
        <h2 className="section-title">Open AI Settings & Transparency</h2>
        <p className="section-subtitle">
          FieldSense AI uses local open-weight models executed directly on your hardware via Ollama. No remote paid APIs, no tracking, and no silent cloud fallbacks.
        </p>

        {/* Ollama Connection Settings */}
        <div style={{ maxWidth: '640px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="ollama-url-input">
              Ollama Service Base URL
            </label>
            <input
              id="ollama-url-input"
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'block' }}>
              Default: <code>http://localhost:11434</code> (Ollama native HTTP endpoint)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ollama-model-input">
              Selected Open-Weight Model Name
            </label>
            <input
              id="ollama-model-input"
              type="text"
              className="form-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gemma3"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'block' }}>
              Recommended: <code>gemma3</code> (or compatible multimodal models: <code>gemma3:4b</code>, <code>gemma3:12b</code>, <code>llava</code>)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={testConnection}
              disabled={isTesting}
            >
              <RefreshCw size={16} className={isTesting ? 'spin' : ''} />
              Test Local AI Service
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult.tested && (
            <div
              className={`callout-box ${testResult.success ? 'callout-info' : 'callout-safety'}`}
              style={{ marginTop: '1.25rem' }}
            >
              {testResult.success ? (
                <CheckCircle size={20} style={{ color: '#166534', flexShrink: 0 }} />
              ) : (
                <XCircle size={20} style={{ color: '#b91c1c', flexShrink: 0 }} />
              )}
              <div>
                <strong>{testResult.success ? 'Local Service Reachable' : 'Service Offline / Unavailable'}</strong>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.86rem' }}>{testResult.message}</p>
                {testResult.availableModels.length > 0 && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
                    <strong>Locally Installed Models:</strong> {testResult.availableModels.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Architecture Transparency Explanation */}
      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-forest-dark)', marginBottom: '0.75rem' }}>
          Understanding the Local AI Architecture
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
          <p>
            <strong>1. Open-Source Application Code:</strong> FieldSense AI is entirely open source. All HTML, CSS, React components, and logic run inside your web browser.
          </p>
          <p>
            <strong>2. Separate Local Ollama Runtime:</strong> Ollama is an independent runtime process installed on your operating system. FieldSense AI sends direct HTTP requests to <code>http://localhost:11434</code>.
          </p>
          <p>
            <strong>3. Open-Weight Models (e.g. Gemma 3):</strong> Model weights are downloaded and executed locally on your CPU or GPU.
          </p>
          <p>
            <strong>4. Transparent Offline Fallback:</strong> If Ollama is not installed or the local daemon is stopped, FieldSense seamlessly switches to <em>Offline Guided Mode</em> using botanical heuristics. We will never pretend rule-based suggestions came from an LLM.
          </p>
        </div>

        {/* Quick Setup Instructions */}
        <div style={{ backgroundColor: '#1a2e24', color: '#f0f6f2', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <Terminal size={18} style={{ color: '#6ee7b7' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>How to Install & Run Gemma 3 Locally via Ollama</span>
          </div>

          <ol style={{ paddingLeft: '1.25rem', fontSize: '0.84rem', lineHeight: '1.6' }}>
            <li>
              Download Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6ee7b7' }}>ollama.com</a> and install it for Windows/macOS/Linux.
            </li>
            <li>
              Open your terminal (PowerShell, Command Prompt, or Bash) and run:
              <div style={{ background: '#0a1410', padding: '0.4rem 0.65rem', borderRadius: '4px', margin: '0.35rem 0', fontFamily: 'monospace', color: '#e2ece6' }}>
                ollama pull gemma3
              </div>
            </li>
            <li>
              Ensure Ollama is running, then return here and click <strong>Test Local AI Service</strong>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
