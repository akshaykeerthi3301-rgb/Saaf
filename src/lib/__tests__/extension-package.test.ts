import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXTENSION_VERSION, EXTENSION_ZIP, compareVersions } from '@/lib/extension-package'

const root = join(__dirname, '..', '..', '..')
const manifest = JSON.parse(readFileSync(join(root, 'extension', 'manifest.json'), 'utf8')) as {
  version: string
  background: { service_worker: string }
  content_scripts: { js: string[] }[]
  action: { default_popup: string }
}
const zip = join(root, 'public', EXTENSION_ZIP)
const inZip = (name: string) => execFileSync('unzip', ['-p', zip, `jobinko-extension/${name}`], { encoding: 'utf8', maxBuffer: 10_000_000 })
const listing = () => execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean)

describe('the downloadable extension', () => {
  it('names the version the manifest has, so the page never advertises a different build', () => {
    expect(EXTENSION_VERSION).toBe(manifest.version)
  })

  it('exists, and its manifest is the current one (re-run scripts/pack-extension.sh after changing extension/)', () => {
    expect(existsSync(zip)).toBe(true)
    expect(JSON.parse(inZip('manifest.json')).version).toBe(manifest.version)
    // Byte-for-byte: a changed script with an unchanged version number must still fail here.
    for (const f of listing().filter((n) => n.endsWith('.js') || n.endsWith('.html'))) {
      const local = readFileSync(join(root, 'extension', f.replace('jobinko-extension/', '')), 'utf8')
      expect(inZip(f.replace('jobinko-extension/', ''))).toBe(local)
    }
  })

  it('carries every file the manifest loads, and no test files', () => {
    const files = listing().map((n) => n.replace('jobinko-extension/', ''))
    const needed = [manifest.background.service_worker, manifest.action.default_popup, ...manifest.content_scripts.flatMap((c) => c.js), 'manifest.json', 'INSTALL.txt']
    for (const n of needed) expect(files, n).toContain(n)
    expect(files.some((n) => /\.test\./.test(n))).toBe(false)
  })
})

describe('compareVersions', () => {
  it('orders by number, not by text', () => {
    expect(compareVersions('0.7.0', '0.8.0')).toBe(-1)
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.8.0', '0.8.0')).toBe(0)
  })
})
