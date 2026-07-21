import type { RepoRef, RepoTree, TreeEntry } from './types'
import { reportRateLimit, isRateLimitExhausted } from './rateLimit'

const API = 'https://api.github.com'

export class GitHubApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function headers(pat?: string): HeadersInit {
  const h: HeadersInit = { Accept: 'application/vnd.github+json' }
  if (pat) h['Authorization'] = `Bearer ${pat}`
  return h
}

async function ghFetch(url: string, pat?: string): Promise<Response> {
  const res = await fetch(url, { headers: headers(pat) })
  reportRateLimit(res.headers, !!pat)

  if (!res.ok) {
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      const resetAt = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000
      const mins = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 60000)) : null
      throw new GitHubApiError(
        pat
          ? `GitHub API rate limit reached (5,000/hr). Resets in ${mins ?? 'a few'} min.`
          : `GitHub API rate limit reached (60/hr without a token). Resets in ${mins ?? 'a few'} min — add a Personal Access Token in Settings for 5,000/hr.`,
        403,
      )
    }
    const body = await res.text().catch(() => '')
    throw new GitHubApiError(`GitHub API ${res.status}: ${body.slice(0, 200)}`, res.status)
  }
  return res
}

export function parseRepoUrl(url: string): RepoRef | null {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)
  if (!m) return null
  return { owner: m[1], repo: m[2], ref: 'HEAD' }
}

export interface PrRef {
  owner: string
  repo: string
  number: number
}

export function parsePullRequestUrl(url: string): PrRef | null {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!m) return null
  return { owner: m[1], repo: m[2], number: Number(m[3]) }
}

export interface PrInfo {
  headSha: string
  changedFiles: string[]
  title: string
  body: string
}

export async function fetchPrInfo(pr: PrRef, pat?: string): Promise<PrInfo> {
  const prRes = await ghFetch(`${API}/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`, pat)
  const prJson = await prRes.json()
  const headSha = prJson.head.sha as string
  const title = (prJson.title as string) ?? ''
  const body = (prJson.body as string) ?? ''

  const changedFiles: string[] = []
  let page = 1
  while (true) {
    const res = await ghFetch(
      `${API}/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/files?per_page=100&page=${page}`,
      pat,
    )
    const files = (await res.json()) as Array<{ filename: string; status: string }>
    changedFiles.push(...files.filter((f) => f.status !== 'removed').map((f) => f.filename))
    if (files.length < 100) break
    page++
  }

  return { headSha, changedFiles, title, body }
}

/**
 * GitHub's commits endpoint accepts "HEAD" as a ref directly and resolves it
 * to the default branch's tip commit server-side — no separate "look up the
 * default branch name, then fetch its commit" round trip needed. That used
 * to be two sequential API calls for the (very common) plain-repo-root case;
 * this is the one call that matters on the critical path before anything can
 * render, so cutting it in half here directly speeds up first paint.
 */
export async function resolveCommitSha(
  ref: RepoRef,
  pat?: string,
): Promise<string> {
  const res = await ghFetch(
    `${API}/repos/${ref.owner}/${ref.repo}/commits/${encodeURIComponent(ref.ref)}`,
    pat,
  )
  const json = await res.json()
  return json.sha as string
}

export async function fetchRepoTree(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  commitSha: string,
  pat?: string,
): Promise<RepoTree> {
  const res = await ghFetch(
    `${API}/repos/${ref.owner}/${ref.repo}/git/trees/${commitSha}?recursive=1`,
    pat,
  )
  const json = await res.json()
  const entries: TreeEntry[] = (json.tree as any[])
    .filter((e) => e.type === 'blob' || e.type === 'tree')
    .map((e) => ({ path: e.path, type: e.type, sha: e.sha, size: e.size }))
  return { sha: commitSha, entries, truncated: !!json.truncated }
}

const blobCache = new Map<string, string>()

export async function fetchFileContent(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  commitSha: string,
  path: string,
  pat?: string,
): Promise<string> {
  const cacheKey = `${ref.owner}/${ref.repo}@${commitSha}:${path}`
  const cached = blobCache.get(cacheKey)
  if (cached !== undefined) return cached

  // contents API returns base64; raw.githubusercontent avoids the encoding
  // overhead but has looser rate limits without a token, so prefer contents API
  // when a PAT is present (5k/hr) and fall back to raw otherwise.
  if (pat) {
    // Only the authenticated Contents API spends api.github.com budget — stop
    // calling it once exhausted instead of failing through every remaining
    // file one by one. raw.githubusercontent.com below has its own separate
    // limit and is unaffected.
    if (isRateLimitExhausted()) {
      throw new GitHubApiError('GitHub API rate limit reached — skipping remaining files', 403)
    }
    const res = await ghFetch(
      `${API}/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path)}?ref=${commitSha}`,
      pat,
    )
    const json = await res.json()
    const content = json.encoding === 'base64' ? atob(json.content.replace(/\n/g, '')) : json.content
    blobCache.set(cacheKey, content)
    return content
  }

  const res = await fetch(
    `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${commitSha}/${path}`,
  )
  if (!res.ok) throw new GitHubApiError(`raw fetch ${res.status} for ${path}`, res.status)
  const content = await res.text()
  blobCache.set(cacheKey, content)
  return content
}

/** Bounded-concurrency fetch pool so large repos don't blow rate limits or memory. */
export async function fetchManyFiles(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  commitSha: string,
  paths: string[],
  pat: string | undefined,
  concurrency = 8,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  let i = 0
  let done = 0
  async function worker() {
    while (i < paths.length) {
      const idx = i++
      const path = paths[idx]
      try {
        const content = await fetchFileContent(ref, commitSha, path, pat)
        results.set(path, content)
      } catch {
        // skip unreadable files (binary, too large, deleted) — never block the batch
      }
      done++
      onProgress?.(done, paths.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker))
  return results
}

export interface FileCriticality {
  commitCount: number
  commitCountIsExact: boolean
  contributors: number
  contributorsIsExact: boolean
}

const criticalityCache = new Map<string, FileCriticality>()

/**
 * A single API call, only made when the user asks to see it (lazy) and cached
 * per file@commit — this is deliberately NOT a repo-wide history crawl, which
 * would burn the rate-limit budget fast on a large repo. One page of up to
 * 100 commits gives commit count (exact if under 100, a documented lower
 * bound otherwise via the Link header's last-page count) and a contributor
 * count (a lower bound if there are more than 100 commits — labeled as such).
 */
export async function fetchFileCriticality(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  path: string,
  commitSha: string,
  pat?: string,
): Promise<FileCriticality> {
  const cacheKey = `${ref.owner}/${ref.repo}@${commitSha}:${path}`
  const cached = criticalityCache.get(cacheKey)
  if (cached) return cached

  const res = await ghFetch(
    `${API}/repos/${ref.owner}/${ref.repo}/commits?path=${encodeURIComponent(path)}&sha=${commitSha}&per_page=100`,
    pat,
  )
  const commits = (await res.json()) as Array<{ author: { login: string } | null; commit: { author: { email: string } | null } }>

  const authors = new Set(commits.map((c) => c.author?.login ?? c.commit.author?.email ?? 'unknown'))

  let commitCount = commits.length
  let commitCountIsExact = commits.length < 100
  const link = res.headers.get('link')
  const lastPageMatch = link?.match(/[?&]page=(\d+)>; rel="last"/)
  if (lastPageMatch) {
    commitCount = Number(lastPageMatch[1]) * 100 // approximate — last page itself may be partial
    commitCountIsExact = false
  }

  const result: FileCriticality = {
    commitCount,
    commitCountIsExact,
    contributors: authors.size,
    contributorsIsExact: commits.length < 100,
  }
  criticalityCache.set(cacheKey, result)
  return result
}
