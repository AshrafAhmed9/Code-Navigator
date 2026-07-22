import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/settings'
import { detectProvider, providerLabel, testConnection, isLlmConfigured } from '../lib/llm'
import { ensureHostPermission } from '../lib/permissions'
import type { Settings } from '../lib/types'

export function Options() {
  const [settings, setSettings] = useState<Settings>({})
  const [status, setStatus] = useState<string>('')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | 'testing' | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const apiKey = settings.llmApiKey?.trim() ?? ''
  const detected = apiKey ? detectProvider(apiKey) : null
  const isCustom = detected === 'custom'

  async function handleSave() {
    if (isCustom && settings.llmBaseUrl?.trim()) {
      const granted = await ensureHostPermission(settings.llmBaseUrl.trim())
      if (!granted) {
        setStatus('Permission needed for that endpoint — not saved')
        setTimeout(() => setStatus(''), 2500)
        return
      }
    }
    await saveSettings(settings)
    setStatus('Saved')
    setTimeout(() => setStatus(''), 1500)
  }

  async function handleTestConnection() {
    setTestResult('testing')
    const result = await testConnection(settings)
    setTestResult(result)
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <h1 style={{ fontSize: 20 }}>Code Navigator — Settings</h1>
      <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5 }}>
        Both fields are optional. Without them, dependency graphs, impact analysis, and
        architecture tours all still work on public repos — a GitHub token just raises the
        rate limit (60 → 5,000 requests/hour), and an LLM key unlocks natural-language
        explanations and "Find X" search. Keys are stored locally and only ever sent to
        their own provider.
      </p>

      <section style={{ marginTop: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          GitHub Personal Access Token
        </label>
        <input
          type="password"
          placeholder="ghp_..."
          value={settings.githubPat ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, githubPat: e.target.value }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
        <p style={{ color: '#888', fontSize: 12 }}>
          No scopes required for public repos — a token with no permissions is enough.
        </p>
      </section>

      <section style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>LLM API Key</label>
        <input
          type="password"
          placeholder="Paste any Anthropic, OpenAI, Groq, or Gemini key…"
          value={settings.llmApiKey ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, llmApiKey: e.target.value }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
        <p style={{ color: detected && !isCustom ? '#2da44e' : '#888', fontSize: 12 }}>
          {detected ? `Detected: ${providerLabel(detected)}` : 'The provider is detected automatically from the key — no need to pick one.'}
        </p>
      </section>

      {isCustom && (
        <>
          <section style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Endpoint URL</label>
            <input
              type="text"
              placeholder="https://.../v1/chat/completions"
              value={settings.llmBaseUrl ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, llmBaseUrl: e.target.value }))}
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            />
            <p style={{ color: '#888', fontSize: 12 }}>
              This key's provider isn't one Code Navigator recognizes by format — any OpenAI-compatible
              chat-completions endpoint works here (Together, Mistral, DeepSeek, OpenRouter, a local
              Ollama/LM Studio server, etc).
            </p>
          </section>
          <section style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Model</label>
            <input
              type="text"
              placeholder="e.g. llama-3.3-70b-versatile"
              value={settings.llmModel ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, llmModel: e.target.value }))}
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            />
          </section>
        </>
      )}

      {isLlmConfigured(settings) && (
        <section style={{ marginTop: 12 }}>
          <button
            onClick={handleTestConnection}
            disabled={testResult === 'testing'}
            style={{
              padding: '6px 14px', fontSize: 13, background: 'none', color: '#1f6feb',
              border: '1px solid #1f6feb', borderRadius: 6, cursor: testResult === 'testing' ? 'default' : 'pointer',
            }}
          >
            {testResult === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
          {testResult && testResult !== 'testing' && (
            <p style={{ color: testResult.ok ? '#2da44e' : '#cf222e', fontSize: 12, marginTop: 6 }}>
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.message}
            </p>
          )}
        </section>
      )}

      <section style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Sidebar dock position</label>
        <select
          value={settings.dockSide ?? 'right'}
          onChange={(e) => setSettings((s) => ({ ...s, dockSide: e.target.value as Settings['dockSide'] }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        >
          <option value="right">Right edge</option>
          <option value="left">Left edge</option>
        </select>
        <p style={{ color: '#888', fontSize: 12 }}>Also toggleable from the sidebar's own header icon.</p>
      </section>

      <section style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Code font</label>
        <select
          value={settings.codeFont ?? 'sans'}
          onChange={(e) => setSettings((s) => ({ ...s, codeFont: e.target.value as Settings['codeFont'] }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        >
          <option value="sans">System font</option>
          <option value="mono">Monospace</option>
        </select>
        <p style={{ color: '#888', fontSize: 12 }}>Used for file paths and code-ish text throughout the sidebar.</p>
      </section>

      <button
        onClick={handleSave}
        style={{
          marginTop: 24,
          padding: '8px 20px',
          background: '#1f6feb',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Save
      </button>
      {status && <span style={{ marginLeft: 12, color: status === 'Saved' ? '#2da44e' : '#cf222e' }}>{status}</span>}
    </div>
  )
}
