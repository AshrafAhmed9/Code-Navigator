import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/settings'
import type { Settings } from '../lib/types'

export function Options() {
  const [settings, setSettings] = useState<Settings>({})
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function handleSave() {
    await saveSettings(settings)
    setStatus('Saved')
    setTimeout(() => setStatus(''), 1500)
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
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>LLM Provider</label>
        <select
          value={settings.llmProvider ?? ''}
          onChange={(e) =>
            setSettings((s) => ({ ...s, llmProvider: e.target.value as Settings['llmProvider'] }))
          }
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        >
          <option value="">None (graph-only mode)</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
      </section>

      <section style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>LLM API Key</label>
        <input
          type="password"
          placeholder="sk-..."
          value={settings.llmApiKey ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, llmApiKey: e.target.value }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
      </section>

      <section style={{ marginTop: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Model</label>
        <input
          type="text"
          placeholder="e.g. claude-opus-4-8, gpt-5"
          value={settings.llmModel ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, llmModel: e.target.value }))}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
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
      {status && <span style={{ marginLeft: 12, color: '#2da44e' }}>{status}</span>}
    </div>
  )
}
