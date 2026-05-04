import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('frontend CI workflow', () => {
  it('runs lint, tests, build, and uploads the dist artifact', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')

    expect(workflow).toContain('actions/checkout@v6')
    expect(workflow).toContain('actions/setup-node@v6')
    expect(workflow).toContain('actions/upload-artifact@v7')
    expect(workflow).toContain('npm ci')
    expect(workflow).toContain('npm run lint')
    expect(workflow).toContain('npm test')
    expect(workflow).toContain('npm run build')
    expect(workflow).toContain('path: dist')
  })

  it('uses least-privilege permissions', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')

    expect(workflow).toContain('permissions:')
    expect(workflow).toContain('contents: read')
    expect(workflow).not.toContain('contents: write')
  })
})
