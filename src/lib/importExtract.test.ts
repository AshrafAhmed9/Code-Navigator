import { describe, expect, it } from 'vitest'
import { buildImportIndex, extractImportSpecifiers, resolveImportPath, resolveTsPathAlias } from './importExtract'
import type { TsPathConfig } from './importExtract'

describe('extractImportSpecifiers', () => {
  it('extracts JS/TS import, require, and dynamic import specifiers', () => {
    const source = `
      import Foo from './foo'
      import { Bar } from "../bar"
      export { Baz } from './baz'
      const x = require('./req')
      const y = import('./dyn')
    `
    expect(extractImportSpecifiers(source, 'ts')).toEqual(['./foo', '../bar', './baz', './req', './dyn'])
  })

  it('extracts Python import and from-import specifiers', () => {
    const source = `
import os
from a.b import c
from . import sibling
`
    expect(extractImportSpecifiers(source, 'py')).toEqual(['os', 'a.b', '.'])
  })

  it('extracts Go single and block imports', () => {
    const source = `
import "fmt"
import (
  "github.com/owner/repo/internal/foo"
  "os"
)
`
    expect(extractImportSpecifiers(source, 'go')).toEqual(
      expect.arrayContaining(['fmt', 'github.com/owner/repo/internal/foo', 'os']),
    )
  })

  it('extracts Java imports including static', () => {
    const source = `
import com.foo.Bar;
import static com.foo.Baz.CONST;
`
    expect(extractImportSpecifiers(source, 'java')).toEqual(['com.foo.Bar', 'com.foo.Baz.CONST'])
  })

  it('extracts Ruby require and require_relative', () => {
    const source = `
require 'json'
require_relative './helper'
`
    expect(extractImportSpecifiers(source, 'rb')).toEqual(['json', './helper'])
  })

  it('extracts Rust use paths', () => {
    const source = `
use crate::foo::Bar;
use serde::Deserialize;
`
    expect(extractImportSpecifiers(source, 'rs')).toEqual(['crate::foo::Bar', 'serde::Deserialize'])
  })
})

describe('resolveImportPath: JS/TS relative', () => {
  const paths = ['src/a.ts', 'src/lib/b.ts', 'src/lib/index.ts', 'src/lib/sub/index.tsx']
  const index = buildImportIndex(paths)

  it('resolves a same-dir relative specifier', () => {
    expect(resolveImportPath('src/a.ts', './lib/b', 'ts', index)).toBe('src/lib/b.ts')
  })

  it('resolves a parent-dir relative specifier', () => {
    expect(resolveImportPath('src/lib/b.ts', '../a', 'ts', index)).toBe('src/a.ts')
  })

  it('resolves a directory specifier to its index file', () => {
    expect(resolveImportPath('src/a.ts', './lib', 'ts', index)).toBe('src/lib/index.ts')
  })

  it('resolves a nested directory to index.tsx', () => {
    expect(resolveImportPath('src/a.ts', './lib/sub', 'ts', index)).toBe('src/lib/sub/index.tsx')
  })

  it('returns null for a bare specifier with no tsconfig (external package)', () => {
    expect(resolveImportPath('src/a.ts', 'react', 'ts', index)).toBeNull()
  })
})

describe('resolveImportPath: TS path aliases', () => {
  const paths = ['src/components/Foo.tsx', 'src/utils/helper.ts']

  it('resolves a star alias pattern (@/* -> src/*)', () => {
    const tsPaths: TsPathConfig = { baseUrl: '', paths: { '@/*': ['src/*'] } }
    const index = buildImportIndex(paths, null, tsPaths)
    expect(resolveImportPath('anywhere.ts', '@/components/Foo', 'ts', index)).toBe('src/components/Foo.tsx')
  })

  it('resolves an exact non-star alias', () => {
    const tsPaths: TsPathConfig = { baseUrl: '', paths: { helper: ['src/utils/helper'] } }
    const index = buildImportIndex(paths, null, tsPaths)
    expect(resolveImportPath('anywhere.ts', 'helper', 'ts', index)).toBe('src/utils/helper.ts')
  })

  it('resolves bare baseUrl-relative imports with no matching pattern', () => {
    const tsPaths: TsPathConfig = { baseUrl: 'src', paths: {} }
    const index = buildImportIndex(paths, null, tsPaths)
    expect(resolveImportPath('anywhere.ts', 'utils/helper', 'ts', index)).toBe('src/utils/helper.ts')
  })

  it('normalizes a literal "." baseUrl instead of leaking a stray path segment', () => {
    const tsPaths: TsPathConfig = { baseUrl: '.', paths: {} }
    const index = buildImportIndex(paths, null, tsPaths)
    expect(resolveImportPath('anywhere.ts', 'src/utils/helper', 'ts', index)).toBe('src/utils/helper.ts')
  })

  it('returns null when nothing matches', () => {
    const tsPaths: TsPathConfig = { baseUrl: '', paths: { '@/*': ['src/*'] } }
    const index = buildImportIndex(paths, null, tsPaths)
    expect(resolveTsPathAlias('@/missing/Thing', tsPaths, index.allPaths)).toBeNull()
  })
})

describe('resolveImportPath: Python', () => {
  const paths = ['pkg/a.py', 'pkg/sub/b.py', 'pkg/sub/__init__.py']
  const index = buildImportIndex(paths)

  it('resolves a single-dot relative import (same package)', () => {
    expect(resolveImportPath('pkg/sub/b.py', '.a', 'py', index)).toBeNull() // .a means pkg/sub/a, not present
  })

  it('resolves a double-dot relative import (parent package)', () => {
    expect(resolveImportPath('pkg/sub/b.py', '..a', 'py', index)).toBe('pkg/a.py')
  })

  it('resolves a relative import to a package via __init__.py', () => {
    expect(resolveImportPath('pkg/a.py', '.sub', 'py', index)).toBe('pkg/sub/__init__.py')
  })

  it('resolves a dotted absolute import', () => {
    expect(resolveImportPath('pkg/a.py', 'pkg.sub.b', 'py', index)).toBe('pkg/sub/b.py')
  })

  it('returns null for an external package', () => {
    expect(resolveImportPath('pkg/a.py', 'numpy', 'py', index)).toBeNull()
  })
})

describe('resolveImportPath: Java', () => {
  it('resolves a fully-qualified class name via suffix match against a nested source root', () => {
    const paths = ['src/main/java/com/foo/Bar.java']
    const index = buildImportIndex(paths)
    expect(resolveImportPath('anywhere.java', 'com.foo.Bar', 'java', index)).toBe('src/main/java/com/foo/Bar.java')
  })

  it('returns null when the suffix match is ambiguous', () => {
    const paths = ['module-a/src/main/java/com/foo/Bar.java', 'module-b/src/main/java/com/foo/Bar.java']
    const index = buildImportIndex(paths)
    expect(resolveImportPath('anywhere.java', 'com.foo.Bar', 'java', index)).toBeNull()
  })

  it('returns null for an external package', () => {
    const paths = ['src/main/java/com/foo/Bar.java']
    const index = buildImportIndex(paths)
    expect(resolveImportPath('anywhere.java', 'java.util.List', 'java', index)).toBeNull()
  })
})

describe('resolveImportPath: Go', () => {
  const paths = ['internal/foo/foo.go', 'internal/foo/foo_test.go', 'internal/bar/bar.go']
  const goModulePath = 'github.com/owner/repo'
  const index = buildImportIndex(paths, goModulePath)

  it('resolves a module-relative package import to a representative non-test file', () => {
    expect(resolveImportPath('main.go', 'github.com/owner/repo/internal/foo', 'go', index)).toBe('internal/foo/foo.go')
  })

  it('resolves the module root itself', () => {
    const rootPaths = ['main.go']
    const rootIndex = buildImportIndex(rootPaths, goModulePath)
    expect(resolveImportPath('other.go', goModulePath, 'go', rootIndex)).toBe('main.go')
  })

  it('returns null for stdlib or another module', () => {
    expect(resolveImportPath('main.go', 'fmt', 'go', index)).toBeNull()
    expect(resolveImportPath('main.go', 'github.com/other/repo/pkg', 'go', index)).toBeNull()
  })

  it('returns null when no go.mod was found', () => {
    const noGoIndex = buildImportIndex(paths)
    expect(resolveImportPath('main.go', 'github.com/owner/repo/internal/foo', 'go', noGoIndex)).toBeNull()
  })
})

describe('resolveImportPath: Rust', () => {
  const paths = ['src/lib.rs', 'src/foo.rs', 'src/foo/bar.rs', 'src/other.rs']
  const index = buildImportIndex(paths)

  it('resolves crate:: as a module file', () => {
    expect(resolveImportPath('src/lib.rs', 'crate::foo', 'rs', index)).toBe('src/foo.rs')
  })

  it('resolves crate:: with a trailing item name (falls back to parent module)', () => {
    expect(resolveImportPath('src/lib.rs', 'crate::foo::SomeStruct', 'rs', index)).toBe('src/foo.rs')
  })

  it('resolves crate:: to a nested module submodule', () => {
    expect(resolveImportPath('src/lib.rs', 'crate::foo::bar', 'rs', index)).toBe('src/foo/bar.rs')
  })

  it('resolves self:: relative to the current file\'s own directory', () => {
    expect(resolveImportPath('src/foo.rs', 'self::other', 'rs', index)).toBe('src/other.rs')
  })

  it('resolves super:: one directory up from the current file', () => {
    expect(resolveImportPath('src/foo/bar.rs', 'super::foo', 'rs', index)).toBe('src/foo.rs')
  })

  it('returns null for an external crate', () => {
    expect(resolveImportPath('src/lib.rs', 'serde::Deserialize', 'rs', index)).toBeNull()
  })
})

describe('resolveImportPath: Ruby', () => {
  it('resolves a require-style suffix match', () => {
    const paths = ['lib/app/helper.rb']
    const index = buildImportIndex(paths)
    expect(resolveImportPath('anywhere.rb', 'app/helper', 'rb', index)).toBe('lib/app/helper.rb')
  })

  it('returns null for an external gem', () => {
    const paths = ['lib/app/helper.rb']
    const index = buildImportIndex(paths)
    expect(resolveImportPath('anywhere.rb', 'json', 'rb', index)).toBeNull()
  })
})
