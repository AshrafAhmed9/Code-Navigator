/**
 * Runtime host-permission grant for custom LLM endpoints. A recognized
 * provider's domain (Anthropic/OpenAI/Groq/Gemini) is already declared in
 * manifest.config.ts's host_permissions and just works — this is only for
 * the "custom" case, where the endpoint is whatever the user typed in and
 * therefore can't be known (and pre-granted) ahead of time. MV3 content
 * scripts can't fetch cross-origin to a host that isn't permitted, so
 * without this, every request to a custom endpoint would be silently
 * blocked.
 */

function toOriginPattern(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return `${u.protocol}//${u.host}/*`
  } catch {
    return null
  }
}

/** Requests (or confirms already-granted) permission to fetch the given endpoint's origin. Returns false if the URL is invalid or the user declines. */
export async function ensureHostPermission(url: string): Promise<boolean> {
  const pattern = toOriginPattern(url)
  if (!pattern) return false
  const already = await chrome.permissions.contains({ origins: [pattern] })
  if (already) return true
  return chrome.permissions.request({ origins: [pattern] })
}
