import type { Settings } from './types'

// Every Settings key must be listed here — reading a subset means the rest are
// silently written but never loaded back (dock side, font, and the onboarding
// flag all regressed this way: saved on change, but gone on the next reload).
const SETTINGS_KEYS: (keyof Settings)[] = [
  'githubPat', 'llmApiKey', 'llmBaseUrl', 'llmModel', 'dockSide', 'codeFont', 'onboardedAt',
]

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEYS)
  return result as Settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings)
}
