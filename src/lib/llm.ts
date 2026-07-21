import type { Settings } from './types'

const DEFAULT_MODEL: Record<NonNullable<Settings['llmProvider']>, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5',
}

export interface LlmRequest {
  system: string
  prompt: string
}

/**
 * Streams text deltas from the configured provider directly from the browser
 * (BYOK — the key never leaves the client except to its own provider).
 * Throws if no provider/key is configured; callers should check availability first.
 */
export async function* streamCompletion(
  settings: Settings,
  req: LlmRequest,
): AsyncGenerator<string> {
  if (!settings.llmProvider || !settings.llmApiKey) {
    throw new Error('No LLM configured')
  }
  const model = settings.llmModel?.trim() || DEFAULT_MODEL[settings.llmProvider]

  if (settings.llmProvider === 'anthropic') {
    yield* streamAnthropic(settings.llmApiKey, model, req)
  } else {
    yield* streamOpenAI(settings.llmApiKey, model, req)
  }
}

export function isLlmConfigured(settings: Settings): boolean {
  return !!(settings.llmProvider && settings.llmApiKey)
}

async function* streamAnthropic(apiKey: string, model: string, req: LlmRequest): AsyncGenerator<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: req.system,
      messages: [{ role: 'user', content: req.prompt }],
      stream: true,
    }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`Anthropic API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }
  for await (const event of parseSse(res.body)) {
    if (event.type !== 'content_block_delta') continue
    const text = event.delta?.text
    if (text) yield text
  }
}

async function* streamOpenAI(apiKey: string, model: string, req: LlmRequest): AsyncGenerator<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // GPT-5/o1/o3 reject `max_tokens` outright ("Unsupported parameter")
      // and require `max_completion_tokens` instead; GPT-4/4o accept both,
      // so this is the one name that works across the whole model lineup —
      // not a tradeoff. `gpt-5` is this extension's own OpenAI default, so
      // the old field name would have hard-failed every default-settings
      // OpenAI user.
      max_completion_tokens: 500,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      stream: true,
    }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`OpenAI API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }
  for await (const event of parseSse(res.body)) {
    const text = event.choices?.[0]?.delta?.content
    if (text) yield text
  }
}

/** Parses a `data: {...}\n\n` SSE stream into JSON events, skipping `[DONE]` markers. */
async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<any> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        try {
          yield JSON.parse(data)
        } catch {
          // ignore malformed/partial chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
