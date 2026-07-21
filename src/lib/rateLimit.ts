export interface RateLimitState {
  remaining: number | null
  limit: number | null
  resetAt: number | null // epoch ms
  authenticated: boolean
}

let state: RateLimitState = { remaining: null, limit: null, resetAt: null, authenticated: false }
const listeners = new Set<(s: RateLimitState) => void>()

export function getRateLimitState(): RateLimitState {
  return state
}

export function onRateLimitChange(cb: (s: RateLimitState) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Called after every GitHub API response so the sidebar can show a live budget and degrade gracefully. */
export function reportRateLimit(headers: Headers, authenticated: boolean): void {
  const remaining = headers.get('x-ratelimit-remaining')
  if (remaining === null) return // raw.githubusercontent.com and some responses don't carry these
  const limit = headers.get('x-ratelimit-limit')
  const reset = headers.get('x-ratelimit-reset')
  state = {
    remaining: Number(remaining),
    limit: limit ? Number(limit) : state.limit,
    resetAt: reset ? Number(reset) * 1000 : state.resetAt,
    authenticated,
  }
  for (const l of listeners) l(state)
}

const LOW_BUDGET_THRESHOLD = 5

export function isRateLimitLow(s: RateLimitState = state): boolean {
  return s.remaining !== null && s.remaining <= LOW_BUDGET_THRESHOLD
}

export function isRateLimitExhausted(s: RateLimitState = state): boolean {
  return s.remaining !== null && s.remaining <= 0
}

export function formatResetIn(s: RateLimitState = state): string {
  if (!s.resetAt) return 'soon'
  const ms = s.resetAt - Date.now()
  if (ms <= 0) return 'now'
  const mins = Math.ceil(ms / 60000)
  return mins <= 1 ? '1 minute' : `${mins} minutes`
}
