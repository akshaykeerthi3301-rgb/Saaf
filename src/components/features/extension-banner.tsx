'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, Puzzle } from 'lucide-react'
import { EditDrawer } from '@/components/features/profile-ui'
import { askExtension } from '@/lib/extension-client'
import { EXTENSION_FILE_NAME, EXTENSION_VERSION, EXTENSION_ZIP, compareVersions } from '@/lib/extension-package'

/**
 * "Add the Jobinko extension" — the banner at the top of the profile, as in the reference product's.
 *
 * With a Chrome Web Store link (NEXT_PUBLIC_EXTENSION_URL) it is one button. Without one — today — it offers the test
 * build as a download with install steps for a tester, and says plainly that it is a test build. Chrome refuses a link
 * to chrome://extensions from a web page, so the address is copyable text rather than a link.
 */
const STEPS: { text: string; copy?: string }[] = [
  { text: 'Unzip the downloaded file. You get a folder called “jobinko-extension”.' },
  { text: 'In Chrome, open this address (copy it, then paste it into a new tab):', copy: 'chrome://extensions' },
  { text: 'Turn on “Developer mode” in the top-right corner.' },
  { text: 'Click “Load unpacked” and choose the “jobinko-extension” folder.' },
  { text: 'Click the puzzle-piece icon in Chrome’s toolbar and pin Jobinko.' },
  { text: 'Keep jobinko.in open and signed in, then open a job on a supported site (Greenhouse, Lever, Workable, Ashby, Workday and others) and click the Jobinko icon.' },
]

export function ExtensionBanner({ storeUrl }: { storeUrl: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // What this browser has: undefined while asking, null when the extension is not installed, else its version.
  const [installed, setInstalled] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    askExtension<{ ok: boolean; version?: string }>({ type: 'saaf:hello' }).then((r) => { if (live) setInstalled(r?.ok ? (r.version ?? '0.0.0') : null) })
    return () => { live = false }
  }, [])
  const current = typeof installed === 'string' && compareVersions(installed, EXTENSION_VERSION) >= 0
  const outdated = typeof installed === 'string' && !current

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the text is on screen to select */ }
  }

  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm" aria-label="Browser extension">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-primary">
          {current ? 'The Jobinko extension is installed' : outdated ? 'Update the Jobinko extension' : 'Add the Jobinko extension to fill in your applications'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {current ? (
            <><span className="mr-1.5 inline-block size-2 rounded-full bg-score-high align-middle" aria-hidden="true" /><span className="font-semibold text-primary">Connected · version {installed}.</span> Open any job posting and the Jobinko panel appears on the right: match, autofill, save, tailor your résumé.</>
          ) : outdated ? (
            <>You have version {installed}; the current test build is <span className="font-semibold text-primary">{EXTENSION_VERSION}</span>. Download it, replace the folder, then press the reload arrow on chrome://extensions.</>
          ) : (
            <>It scores any job posting against your résumé, fills the application form from this profile, attaches your résumé and saves the job to your tracker.
              {storeUrl ? '' : <> <span className="font-semibold text-primary">Test version {EXTENSION_VERSION}</span> — not in the Chrome Web Store yet.</>}</>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {current ? null : storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <Puzzle className="size-4" aria-hidden="true" /> Add Extension
          </a>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">How to install</button>
            <a href={EXTENSION_ZIP} download={EXTENSION_FILE_NAME} className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
              <Download className="size-4" aria-hidden="true" /> Download extension
            </a>
          </>
        )}
      </div>

      {open ? (
        <EditDrawer open onOpenChange={setOpen} title="Install the Jobinko extension" icon={<Puzzle className="size-5" />} onSave={async () => null} saveLabel="Done">
          <div className="space-y-5">
            <p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
              This is a <span className="font-semibold text-primary">test build ({EXTENSION_VERSION})</span> for people trying Jobinko before it is in the Chrome Web Store. It reads only the page you are on, and it is off on LinkedIn and Naukri on purpose.
            </p>
            <a href={EXTENSION_ZIP} download={EXTENSION_FILE_NAME} className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
              <Download className="size-4" aria-hidden="true" /> Download {EXTENSION_FILE_NAME}
            </a>
            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="bg-brand-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold" aria-hidden="true">{i + 1}</span>
                  <div className="min-w-0 pt-0.5 text-sm text-primary">
                    <p>{s.text}</p>
                    {s.copy ? (
                      <button type="button" onClick={() => copy(s.copy!)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-primary hover:bg-secondary">
                        {copied ? <Check className="size-3.5 text-score-high" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} {s.copy}
                        <span className="text-muted-foreground">{copied ? 'copied' : 'click to copy'}</span>
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">To update later: download the new zip, replace the folder, then press the reload arrow on that Chrome page. Which sites it works on, and how well each has been checked, is written down on the <a href="/extension" className="font-semibold text-primary underline underline-offset-4">extension page</a>.</p>
          </div>
        </EditDrawer>
      ) : null}
    </section>
  )
}
