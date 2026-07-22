import { useEffect, useState } from 'react'
import { getRateLimitState, onRateLimitChange, isRateLimitLow, formatResetIn, type RateLimitState } from '../lib/rateLimit'

// TODO: once published, replace with the real listing URL, e.g.
// "https://chromewebstore.google.com/detail/<extension-id>"
const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/code-navigator'

/** Always-visible budget readout so the user never silently runs dry mid-session. */
export function RateLimitFooter({ onOpenOptions }: { onOpenOptions: () => void }) {
  const [state, setState] = useState<RateLimitState>(() => getRateLimitState())

  useEffect(() => onRateLimitChange(setState), [])

  if (state.remaining === null) return null

  const low = isRateLimitLow(state)

  return (
    <div className={`cn-ratelimit ${low ? 'cn-ratelimit-low' : ''}`}>
      <span>
        {state.remaining}/{state.limit ?? '?'} GitHub calls left
      </span>
      {low && (
        <span>
          {' '}
          — resets in {formatResetIn(state)}
          {!state.authenticated && (
            <>
              {' · '}
              <a href="#" className="cn-link" onClick={(e) => { e.preventDefault(); onOpenOptions() }}>
                add a token
              </a>
            </>
          )}
        </span>
      )}
      {' · '}
      <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer" className="cn-link">
        ⭐ rate & leave feedback
      </a>
    </div>
  )
}
