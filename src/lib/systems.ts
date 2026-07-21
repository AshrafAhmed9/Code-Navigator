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

export function detectCoreSystems(graph: RepoGraph, maxPerSystem = 5): SystemGroup[] {
  const groups: SystemGroup[] = []

  for (const [name, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    const matches = Object.values(graph.files).filter((f) => {
      const lower = f.path.toLowerCase()
      return keywords.some((k) => lower.includes(k))
    })
    if (matches.length === 0) continue
    const ranked = matches.sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, maxPerSystem)
    groups.push({ name, files: ranked })
  }

  return groups.sort((a, b) => b.files.length - a.files.length)
}
