import type { RepoGraph, FileNode } from './types'

/**
 * Heuristic "core systems" detection — the first thing a developer should see
 * is what systems exist (Authentication, API, Database, ...), not a flat file
 * list. Keyword-matched against path segments and filenames, ranked by how
 * central each matched file is in the import graph (importedBy count).
 */
export interface SystemGroup {
  name: string
  files: FileNode[]
  /** 0-100. A keyword match is a guess, not a fact — this says how much to trust it. */
  confidence: number
  confidenceLabel: 'High' | 'Medium' | 'Low'
  /** Short, human-readable justification for the score (shown in the UI, not hidden). */
  reason: string
}

const SYSTEM_KEYWORDS: Record<string, string[]> = {
  Authentication: ['auth', 'login', 'oauth', 'jwt', 'session', 'sso', 'password'],
  API: ['api', 'route', 'router', 'controller', 'endpoint', 'handler'],
  Database: ['db', 'database', 'model', 'schema', 'migration', 'repository', 'orm', 'prisma', 'sql'],
  Cache: ['cache', 'redis', 'memcache'],
  'Message Queue': ['queue', 'kafka', 'rabbitmq', 'pubsub', 'sqs', 'consumer', 'producer'],
  Payments: ['payment', 'billing', 'stripe', 'invoice', 'checkout', 'subscription'],
  'Background Jobs': ['worker', 'job', 'cron', 'scheduler', 'task'],
  Config: ['config', 'settings', 'env'],
  Storage: ['storage', 'upload', 'bucket', 's3', 'blob'],
  Testing: ['test', 'spec', '__tests__', 'fixture', 'mock'],
}

/** The directory (up to 2 levels deep) that the largest share of matched files share. */
function dominantDirectory(files: FileNode[]): { fraction: number; dir: string } {
  const counts = new Map<string, number>()
  for (const f of files) {
    const parts = f.path.split('/')
    const dir = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join('/') : '(root)'
    counts.set(dir, (counts.get(dir) ?? 0) + 1)
  }
  let bestDir = ''
  let bestCount = 0
  for (const [dir, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestDir = dir
    }
  }
  return { fraction: files.length ? bestCount / files.length : 0, dir: bestDir }
}

export function detectCoreSystems(graph: RepoGraph, maxPerSystem = 5): SystemGroup[] {
  const groups: SystemGroup[] = []

  for (const [name, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    const matchedKeywords = new Set<string>()
    const matches = Object.values(graph.files).filter((f) => {
      const lower = f.path.toLowerCase()
      const hit = keywords.find((k) => lower.includes(k))
      if (hit) matchedKeywords.add(hit)
      return !!hit
    })
    if (matches.length === 0) continue

    const ranked = matches.sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, maxPerSystem)

    // Three independent signals, each capped so no single one can fake high confidence alone:
    // do the matches live together in a real directory, is the evidence more than one keyword,
    // and are the matched files actually central to the graph (not incidental leaf files).
    const { fraction: dirFraction, dir } = dominantDirectory(matches)
    const keywordDiversity = Math.min(1, matchedKeywords.size / 3)
    const avgFanIn = matches.reduce((s, f) => s + f.importedBy.length, 0) / matches.length
    const centrality = Math.min(1, avgFanIn / 5)

    const confidence = Math.round(dirFraction * 45 + keywordDiversity * 30 + centrality * 25)
    const confidenceLabel: SystemGroup['confidenceLabel'] = confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low'

    const reasonParts: string[] = []
    reasonParts.push(dirFraction >= 0.5 ? `clustered in ${dir}/` : 'scattered across the repo')
    reasonParts.push(matchedKeywords.size >= 2 ? `${matchedKeywords.size} distinct keyword signals` : 'single keyword match')
    if (centrality >= 0.5) reasonParts.push('central to the import graph')

    groups.push({ name, files: ranked, confidence, confidenceLabel, reason: reasonParts.join(', ') })
  }

  return groups.sort((a, b) => b.confidence - a.confidence || b.files.length - a.files.length)
}
