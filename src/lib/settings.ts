import type { Settings } from './types'

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(['githubPat', 'llmProvider', 'llmApiKey', 'llmModel'])
  return result as Settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set(settings)
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = (_changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== 'local') return
    getSettings().then(cb)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
