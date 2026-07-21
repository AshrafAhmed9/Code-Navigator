import type { Language } from './types'

const EXT_MAP: Record<string, Language> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  mjs: 'js',
  cjs: 'js',
  jsx: 'jsx',
  py: 'py',
  go: 'go',
  java: 'java',
  rb: 'rb',
  rs: 'rs',
}

export function detectLanguage(path: string): Language {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MAP[ext] ?? 'other'
}

export const CODE_EXTENSIONS = new Set(Object.keys(EXT_MAP))

export function isLikelyTestFile(path: string): boolean {
  return /(^|\/)(test|tests|__tests__|spec)(\/|_|\.)|(\.|_)(test|spec)\.[a-z]+$/i.test(path)
}

export function isVendoredOrGenerated(path: string): boolean {
  return /(^|\/)(node_modules|vendor|dist|build|\.git|target|__pycache__)(\/|$)/.test(path)
}
