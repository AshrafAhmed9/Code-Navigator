import { describe, expect, it } from 'vitest'
import { findUngroundedPaths } from './grounding'

describe('findUngroundedPaths', () => {
  it('does not flag a path present in the evidence', () => {
    const text = 'This logic lives in src/lib/auth.ts and is called from src/app.ts.'
    const grounded = ['src/lib/auth.ts', 'src/app.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('flags a cited path absent from the evidence', () => {
    const text = 'This is handled in src/lib/nonexistent.ts.'
    const grounded = ['src/lib/auth.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual(['src/lib/nonexistent.ts'])
  })

  it('strips trailing prose punctuation before comparing', () => {
    const grounded = ['src/lib/auth.ts', 'src/a/b.ts']
    expect(findUngroundedPaths('See src/lib/auth.ts.', grounded)).toEqual([])
    expect(findUngroundedPaths('See src/lib/auth.ts, then check the caller.', grounded)).toEqual([])
    expect(findUngroundedPaths('(src/a/b.ts) handles this.', grounded)).toEqual([])
  })

  it('does not mis-split multi-dot filenames like .d.ts', () => {
    const text = 'The types come from src/lib/types.d.ts.'
    const grounded = ['src/lib/types.d.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('does not mis-split multi-dot filenames like .min.js', () => {
    const text = 'The bundle is src/dist/app.min.js.'
    const grounded = ['src/dist/app.min.js']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('does not mis-split multi-dot filenames like .test.ts', () => {
    const text = 'Covered by src/lib/importExtract.test.ts.'
    const grounded = ['src/lib/importExtract.test.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('does not mis-split multi-dot filenames like .js.map', () => {
    const text = 'The source map is src/dist/app.js.map.'
    const grounded = ['src/dist/app.js.map']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('flags an ungrounded multi-dot filename rather than silently allowing it', () => {
    const text = 'See src/lib/fake.test.ts for coverage.'
    const grounded = ['src/lib/real.test.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual(['src/lib/fake.test.ts'])
  })

  it('does not flag a bare filename with no slash', () => {
    const text = 'This is defined in auth.py.'
    const grounded = ['src/lib/auth.py']
    expect(findUngroundedPaths(text, grounded)).toEqual([])
  })

  it('returns an empty array when no evidence paths were supplied', () => {
    const text = 'This references src/lib/whatever.ts.'
    expect(findUngroundedPaths(text, [])).toEqual([])
  })

  it('de-duplicates repeated ungrounded citations', () => {
    const text = 'src/lib/fake.ts does X. Later, src/lib/fake.ts does Y too.'
    const grounded = ['src/lib/real.ts']
    expect(findUngroundedPaths(text, grounded)).toEqual(['src/lib/fake.ts'])
  })
})
