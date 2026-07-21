export type Theme = 'light' | 'dark'

/**
 * GitHub sets data-color-mode="light"|"dark"|"auto" on <html>, plus
 * data-light-theme/data-dark-theme naming which concrete theme is active for
 * each mode. We only care about light vs dark, not GitHub's specific theme
 * names (dimmed, high-contrast, etc.) — those all map to one of the two.
 */
export function detectGitHubTheme(): Theme {
  const html = document.documentElement
  const mode = html.getAttribute('data-color-mode')

  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'

  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Fallback for pages where the attribute isn't present yet (fast nav, old GitHub Enterprise).
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Calls `onChange` whenever GitHub's live theme toggle or OS theme changes. */
export function watchGitHubTheme(onChange: (theme: Theme) => void): () => void {
  const html = document.documentElement
  const observer = new MutationObserver(() => onChange(detectGitHubTheme()))
  observer.observe(html, { attributes: true, attributeFilter: ['data-color-mode', 'data-dark-theme', 'data-light-theme'] })

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const mediaListener = () => onChange(detectGitHubTheme())
  media.addEventListener('change', mediaListener)

  return () => {
    observer.disconnect()
    media.removeEventListener('change', mediaListener)
  }
}
