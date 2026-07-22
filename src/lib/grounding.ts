/**
 * Post-hoc verification that an LLM narrative didn't cite a file path outside
 * the evidence it was actually given. A grounded system prompt (see
 * prompts.ts's GROUNDING_SYSTEM) makes the model far less likely to invent a
 * fact, but a prompt is an instruction, not a guarantee — this is the
 * verification layer that catches it if one slips through anyway, rather than
 * trusting fluent-sounding output on faith. Quality over confidence: a
 * flagged claim beats a wrong one presented with the same authority as a
 * right one.
 */

// Matches path-like tokens: at least one '/' and a short trailing extension,
// e.g. "src/lib/auth.ts". Deliberately requires a slash — a bare filename
// mention ("auth.py") is too ambiguous with plain prose to check reliably,
// so this only checks the unambiguous case rather than over-flagging.
const PATH_TOKEN_RE = /\b[\w.-]+(?:\/[\w.-]+)+\.[A-Za-z0-9]{1,10}\b/g

/** Returns any path-like token in `text` that isn't in `groundedPaths` — empty if the narrative only cited real evidence. */
export function findUngroundedPaths(text: string, groundedPaths: string[]): string[] {
  if (groundedPaths.length === 0) return []
  const allowed = new Set(groundedPaths)
  const found = new Set<string>()
  for (const match of text.matchAll(PATH_TOKEN_RE)) {
    const candidate = match[0].replace(/[.,;:!?)]+$/, '') // strip trailing prose punctuation
    if (!allowed.has(candidate)) found.add(candidate)
  }
  return Array.from(found)
}
