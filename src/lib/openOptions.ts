/**
 * chrome.runtime.openOptionsPage() only works from extension pages (background,
 * options, popup) — NOT from content scripts, which run in an isolated world
 * with a restricted chrome.runtime surface. Calling it directly from a content
 * script silently no-ops. Route through the background service worker instead,
 * which does have full access.
 */
export function openOptionsPage(): void {
  chrome.runtime.sendMessage({ type: 'open-options' })
}
