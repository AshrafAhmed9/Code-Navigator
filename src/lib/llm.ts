import type { Settings } from './types'

export type LlmProviderId = 'anthropic' | 'openai' | 'groq' | 'gemini' | 'custom'

interface ProviderConfig {
  label: string
  baseUrl: string
  defaultModel: string
}

/**
 * Anthropic is the only provider with a genuinely different wire format
 * (its own `messages`/`system`/`content_block_delta` shape, `x-api-key`
 * auth). Every other provider here — OpenAI itself, and Groq/Gemini's own
 * OpenAI-compatible endpoints — speaks the same `chat/completions` request
 * and `choices[].delta.content` streaming format with `Authorization:
 * Bearer` auth, so they all share streamOpenAICompatible below. This is
 * also why a "custom" endpoint (any other OpenAI-compatible provider —
 * Together, Mistral, DeepSeek, OpenRouter, local Ollama/LM Studio, etc.) is
 * supported for free: it's the same code path with a user-supplied URL.
 */
const KNOWN_PROVIDERS: Record<Exclude<LlmProviderId, 'custom'>, ProviderConfig> = {
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1/messages', defaultModel: 'claude-sonnet-5' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-5' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: 'llama-3.3-70b-versatile' },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-3.5-flash',
  },
}

/**
 * Identifies the provider from the API key's own format — no manual
 * "which provider is this" selection needed for these four. Order matters:
 * Anthropic's "sk-ant-" prefix is itself a "sk-" prefix, so it must be
 * checked before the generic OpenAI "sk-" match.
 */
export function detectProvider(apiKey: string): LlmProviderId {
  const key = apiKey.trim()
  if (key.startsWith('sk-ant-')) return 'anthropic'
  if (key.startsWith('gsk_')) return 'groq'
  if (key.startsWith('AIza')) return 'gemini'
  if (key.startsWith('sk-')) return 'openai'
  return 'custom'
}

export function providerLabel(id: LlmProviderId): string {
  return id === 'custom' ? 'Unrecognized — treated as a custom OpenAI-compatible endpoint' : KNOWN_PROVIDERS[id].label
}

export interface LlmRequest {
  system: string
  prompt: string
  /**
   * Every file path the model was actually given as evidence for this
   * request — used to catch the rare hallucinated file reference after the
   * fact (see src/lib/grounding.ts). A grounded system prompt makes this
   * rare, not impossible; this is the verification layer on top of asking
   * nicely, not a replacement for it.
   */
  groundedPaths: string[]
}

/**
 * Fires one real, minimal request through the exact same code path
 * production narratives use, so it validates key + endpoint + model
 * together rather than checking them separately and hoping. A custom
 * endpoint in particular has no built-in default to fall back on, so a
 * typo'd URL or an unavailable local model would otherwise only surface as
 * "why isn't my LLM working?" the first time a real narrative fails.
 */
export async function testConnection(settings: Settings): Promise<{ ok: boolean; message: string }> {
  try {
    let gotResponse = false
    const req: LlmRequest = { system: 'Reply with a single word.', prompt: 'Say OK.', groundedPaths: [] }
    for await (const delta of streamCompletion(settings, req)) {
      if (delta) gotResponse = true
      break // one real delta is enough to prove the whole chain works
    }
    return gotResponse
      ? { ok: true, message: 'Connected successfully.' }
      : { ok: false, message: 'Connected, but got no response — double-check the model name.' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

export function isLlmConfigured(settings: Settings): boolean {
  const apiKey = settings.llmApiKey?.trim()
  if (!apiKey) return false
  // A key we don't recognize has no default endpoint/model to fall back to —
  // both must be supplied explicitly (the Settings page only shows these
  // fields once a key resolves to 'custom').
  if (detectProvider(apiKey) === 'custom') {
    return !!settings.llmBaseUrl?.trim() && !!settings.llmModel?.trim()
  }
  return true
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
  const apiKey = settings.llmApiKey?.trim()
  if (!apiKey) throw new Error('No LLM configured')
  const provider = detectProvider(apiKey)

  if (provider === 'anthropic') {
    const model = settings.llmModel?.trim() || KNOWN_PROVIDERS.anthropic.defaultModel
    yield* streamAnthropic(apiKey, model, req)
    return
  }

  if (provider === 'custom') {
    const baseUrl = settings.llmBaseUrl?.trim()
    const model = settings.llmModel?.trim()
    if (!baseUrl || !model) {
      throw new Error('This key\'s provider isn\'t recognized — add its endpoint URL and model name in Settings')
    }
    yield* streamOpenAICompatible(baseUrl, apiKey, model, req)
    return
  }

  const config = KNOWN_PROVIDERS[provider]
  const model = settings.llmModel?.trim() || config.defaultModel
  yield* streamOpenAICompatible(config.baseUrl, apiKey, model, req)
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

/** Shared by OpenAI itself and every OpenAI-compatible provider (Groq, Gemini, and any custom endpoint). */
async function* streamOpenAICompatible(baseUrl: string, apiKey: string, model: string, req: LlmRequest): AsyncGenerator<string> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      // GPT-5/o1/o3 reject `max_tokens` outright ("Unsupported parameter")
      // and require `max_completion_tokens` instead; GPT-4/4o and every
      // other OpenAI-compatible provider tested (Groq, Gemini) accept both,
      // so this is the one name that works across the whole lineup — not a
      // tradeoff.
      max_completion_tokens: 500,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
      stream: true,
    }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`LLM API ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
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
