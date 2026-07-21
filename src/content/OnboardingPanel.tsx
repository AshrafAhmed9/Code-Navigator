import { getSettings, saveSettings } from '../lib/settings'
import { openOptionsPage } from '../lib/openOptions'

export function OnboardingPanel({ onDismiss }: { onDismiss: () => void }) {
  async function dismiss() {
    await saveSettings({ ...(await getSettings()), onboardedAt: Date.now() })
    onDismiss()
  }

  function openOptions(e: React.MouseEvent) {
    e.preventDefault()
    openOptionsPage()
    dismiss()
  }

  return (
    <div className="cn-section cn-onboarding">
      <div className="cn-label">Welcome to Code Navigator</div>
      <p className="cn-muted">
        Dependency graphs, impact analysis, and PR summaries — right inside GitHub. Everything runs
        locally in your browser.
      </p>
      <p className="cn-muted">
        Your GitHub token and LLM key never leave your browser — they're stored locally and sent only
        to api.github.com and your chosen LLM provider.
      </p>
      <p className="cn-muted">
        Without a token, GitHub limits you to 60 requests/hour. A free personal access token raises
        that to 5,000/hour and takes about 2 minutes.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <a href="#" onClick={openOptions} className="cn-flow-btn">
          Add a GitHub token
        </a>
        <button className="cn-flow-btn" onClick={dismiss}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
