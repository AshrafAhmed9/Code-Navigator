import type { RepoGraph } from './types'
import type { LlmRequest } from './llm'

const GROUNDING_SYSTEM = `You explain source code files inside a developer tool called Code Navigator.
Ground every statement strictly in the evidence provided (the file's imports,
importers, exported symbols, and source excerpt). Never invent behavior,
dependencies, or purposes not visible in the evidence. If the evidence is too
thin to say something specific, say so plainly instead of guessing. Be
concise: 2-4 sentences, no preamble, no markdown headers.`

export function buildFilePurposePrompt(
  graph: RepoGraph,
  path: string,
  sourceExcerpt: string,
): LlmRequest {
  const file = graph.files[path]
  const evidence = [
    `File: ${path}`,
    `Language: ${file.language}`,
    `Imports (${file.imports.length}): ${file.imports.slice(0, 15).join(', ') || 'none detected'}`,
    `Imported by (${file.importedBy.length}): ${file.importedBy.slice(0, 15).join(', ') || 'none detected'}`,
    `Exported symbols: ${file.exportedSymbols.slice(0, 20).join(', ') || 'none detected'}`,
    `Source excerpt:\n${sourceExcerpt.slice(0, 3000)}`,
  ].join('\n\n')

  return {
    system: GROUNDING_SYSTEM,
    prompt: `Explain what this file is responsible for in the codebase, based only on this evidence:\n\n${evidence}`,
  }
}
