import type { RepoGraph } from '../lib/types'
import { getSettings } from '../lib/settings'
import { buildFilePurposePrompt } from '../lib/prompts'
import { fetchFileContent } from '../lib/github'
import { NarrativePanel } from './NarrativePanel'

/**
 * A thin NarrativePanel wrapper, not a separate implementation — it used to
 * duplicate the whole streaming state machine, which meant it silently
 * skipped the grounding-verification check NarrativePanel runs after
 * streaming completes (see src/lib/grounding.ts). "Purpose" is likely the
 * single most-viewed LLM narrative in the product; it shouldn't be the one
 * exempt from the check.
 */
export function PurposePanel({ graph, path }: { graph: RepoGraph; path: string }) {
  return (
    <NarrativePanel
      label="Purpose"
      loadingLabel="Reading file…"
      deps={[graph, path]}
      buildRequest={async () => {
        const settings = await getSettings()
        const [owner, repo] = graph.repoKey.split('/')
        const source = await fetchFileContent({ owner, repo }, graph.commitSha, path, settings.githubPat)
        return buildFilePurposePrompt(graph, path, source)
      }}
    />
  )
}
