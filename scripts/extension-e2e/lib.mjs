import { chromium } from 'playwright'
import { cpSync, rmSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'

const REPO = fileURLToPath(new URL('../..', import.meta.url))

/** Copy the extension and let it run on localhost, so a local mock job page and the local app can stand in for real sites. */
export function patchedExtension() {
  const dir = join(mkdtempSync(join(tmpdir(), 'jx-')), 'ext')
  cpSync(join(REPO, 'extension'), dir, { recursive: true, filter: (s) => !/\.test\.ts$/.test(s) })
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  const local = ['http://localhost/*', 'http://localhost:*/*', 'http://127.0.0.1/*', 'http://127.0.0.1:*/*']
  m.host_permissions.push(...local, 'http://[::1]/*', 'http://[::1]:*/*', 'https://careers.veeva.com/*') // [::1]: a stand-in for a site the built-in list does not cover — host access only, no content script
  for (const c of m.content_scripts) c.matches.push(...local)
  m.externally_connectable = { matches: ['http://localhost/*', 'http://localhost:*/*'] }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m, null, 2))
  // localSite: aim the extension's own constants at the local app, so no production data is touched.
  for (const f of ['service-worker.js', 'content-script.js', 'config.js']) {
    const p = join(dir, f)
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll("https://jobinko.in", 'http://localhost:3000'))
  }
  return dir
}

export async function launch(extDir, { headless = true } = {}) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'jprof-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: chromiumPath(), headless,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
    viewport: { width: 1280, height: 800 },
  })
  let [sw] = context.serviceWorkers()
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15000 })
  const id = new URL(sw.url()).host
  return { context, sw, id }
}

/** The Chromium Playwright downloaded (Chrome's branded builds no longer load unpacked extensions from the command line). CHROMIUM_PATH overrides. */
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const cache = join(process.env.HOME, 'Library/Caches/ms-playwright')
  const newest = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop()
  return join(cache, newest, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
}
