import type { RepoGraph } from './types'
import type { LlmRequest } from './llm'
import type { SystemGroup } from './systems'

const GROUNDING_SYSTEM = `You explain source code files inside a developer tool called Code Navigator.
Ground every statement strictly in the evidence provided (the file's imports,
importers, exported symbols, and source excerpt). Never invent behavior,
dependencies, or purposes not visible in the evidence. If the evidence is too
thin to say something specific, say so plainly instead of guessing. Be
concise: 2-4 sentences, no preamble, no markdown headers.

Write like GitHub Copilot Chat: plain, everyday language, short sentences,
one idea at a time. No jargon unless the evidence itself uses that term. No
hedging filler ("it appears that," "this seems to suggest") — just say the
thing plainly, and say plainly when you don't know. Talk directly to the
developer reading this, like a teammate explaining it out loud, not like
documentation.`

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
    groundedPaths: [path, ...file.imports, ...file.importedBy],
  }
}

export function buildWhyIsThisHerePrompt(
  graph: RepoGraph,
  path: string,
): LlmRequest {
  const file = graph.files[path]
  const consumers = file.importedBy
  const evidence = [
    `File: ${path}`,
    `Exported symbols: ${file.exportedSymbols.slice(0, 20).join(', ') || 'none detected'}`,
    `Primary consumers — files that import this one (${consumers.length}):\n${consumers.slice(0, 15).join('\n') || 'none detected'}`,
  ].join('\n\n')

  return {
    system: GROUNDING_SYSTEM,
    prompt: `Distinct from "what does this file do" -- explain WHY this file exists as a separate piece of the codebase: what problem its separation solves, and why its listed consumers need it specifically (not just what it does line-by-line). Base this only on the evidence below; if the consumer list is empty or thin, say the evidence doesn't support a confident answer rather than guessing a rationale.\n\n${evidence}`,
    groundedPaths: [path, ...consumers],
  }
}

export function buildWhatBreaksPrompt(
  path: string,
  affected: string[],
  risk: string,
): LlmRequest {
  const evidence = [
    `Changed file: ${path}`,
    `Risk tier (by fan-out size): ${risk}`,
    `Files that transitively depend on it (${affected.length}):\n${affected.slice(0, 40).join('\n') || 'none'}`,
  ].join('\n\n')

  return {
    system: GROUNDING_SYSTEM,
    prompt: `A developer is about to modify ${path}. Based only on the dependent-file list below, explain what parts of the system are likely to break or need review, grouped by area if the file paths suggest natural groupings (e.g. by directory). Do not invent dependents not listed.\n\n${evidence}`,
    groundedPaths: [path, ...affected],
  }
}

export function buildWhatToTestPrompt(
  path: string,
  affected: string[],
  tests: string[],
): LlmRequest {
  const evidence = [
    `Changed file: ${path}`,
    `Transitively affected files (${affected.length}):\n${affected.slice(0, 40).join('\n') || 'none'}`,
    `Test files that import the changed file or an affected file (${tests.length}):\n${tests.join('\n') || 'none found by import graph'}`,
  ].join('\n\n')

  return {
    system: GROUNDING_SYSTEM,
    prompt: `Recommend what to test before merging a change to ${path}, based only on the evidence below. If no test files were found by the import graph, say so plainly and suggest which untested affected files most need coverage, rather than inventing test file names.\n\n${evidence}`,
    groundedPaths: [path, ...affected, ...tests],
  }
}

export interface PrChangedFile {
  path: string
  risk: string
  affectedCount: number
}

export function buildExplainPrPrompt(
  title: string,
  body: string,
  changedFiles: PrChangedFile[],
  affectedSystems: SystemGroup[],
  reviewOrder: string[],
): LlmRequest {
  const evidence = [
    `PR title: ${title}`,
    body ? `PR description:\n${body.slice(0, 1500)}` : 'PR description: (none provided)',
    `Changed files (${changedFiles.length}):\n${changedFiles
      .map((f) => `${f.path} — risk ${f.risk}, ${f.affectedCount} affected`)
      .join('\n')}`,
    affectedSystems.length > 0
      ? `Core systems touched by this PR:\n${affectedSystems.map((s) => `${s.name} (${s.confidenceLabel} confidence)`).join('\n')}`
      : 'Core systems touched: none matched by keyword detection',
    `Suggested review order (highest-impact first, by import-graph fan-out):\n${reviewOrder.join('\n') || 'none'}`,
  ].join('\n\n')

  return {
    system: GROUNDING_SYSTEM,
    prompt: `Summarize this pull request for a reviewer, based only on the evidence below. In 3-5 sentences: (1) what the PR appears to do, inferred from the title/description/changed files, (2) which systems it touches, (3) overall risk, (4) a suggested order to review the files in. Do not invent files, systems, or intent not supported by the evidence.\n\n${evidence}`,
    groundedPaths: [
      ...changedFiles.map((f) => f.path),
      ...reviewOrder,
      ...affectedSystems.flatMap((s) => s.files.map((f) => f.path)),
    ],
  }
}

export function buildFindPrompt(graph: RepoGraph, query: string, candidates: string[]): LlmRequest {
  const evidence = candidates
    .map((p) => {
      const f = graph.files[p]
      return `${p} — exports: ${f?.exportedSymbols.slice(0, 8).join(', ') || 'none detected'}`
    })
    .join('\n')

  return {
    system: `You rank and explain search results inside a code navigation tool. Only reference files in the provided candidate list -- never invent file paths. Be concise. Write like GitHub Copilot Chat: plain, everyday language, no jargon, no hedging filler -- talk directly to the developer like a teammate, not documentation.`,
    prompt: `A developer searched for "${query}" in this repository. Here are the top candidate files ranked by a heuristic (filename/symbol match + how many other files depend on them):\n\n${evidence}\n\nIn 2-3 sentences, say which of these files is most likely the right starting point and why, citing only paths from the list above.`,
    groundedPaths: candidates,
  }
}
