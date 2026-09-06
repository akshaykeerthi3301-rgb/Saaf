'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseResume } from '@/app/actions/parse-resume'
import { benchScore, type BenchResult } from '@/app/actions/bench'
import { BUCKET_META } from '@/match/score'

type Candidate = {
  id: string
  filename: string
  warnings: string[]
  /** Everything below is editable — the point of the bench is varying them. */
  yearsExperience: string
  city: string
  preferredRole: string
  credential: 'CA' | 'CFA' | 'CS' | 'none'
  workModePreference: 'remote' | 'hybrid' | 'onsite' | 'no_preference'
  openToAdjacent: boolean
  skills: string[]
  busy: boolean
  result?: BenchResult
}

const BUCKET_TITLE = Object.fromEntries(BUCKET_META.map((b) => [b.key, b.title]))

const field =
  'w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-primary outline-none ' +
  'transition-colors hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10'

/**
 * The developer bench.
 *
 * Several résumés at once, each parsed with the real parser, each scored with
 * the real pipeline, and NOTHING WRITTEN ANYWHERE. Every field is editable
 * after parsing, because the questions worth asking here are mostly "what if" —
 * what does this résumé score with two years instead of five, or asking for
 * "Product Manager" instead of "manager".
 *
 * Years of experience is blank on purpose even though the file has dates in it.
 * The product asks rather than parses it (see the upload screen's comment), so
 * a bench that guessed it would be testing something the product never does.
 */
export function ResumeBench() {
  const input = useRef<HTMLInputElement>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [reading, setReading] = useState(false)

  async function onFiles(files: FileList) {
    setReading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.set('file', file)
      const res = await parseResume(fd)
      setCandidates((cur) => [
        ...cur,
        {
          id: `${file.name}-${Date.now()}-${cur.length}`,
          filename: file.name,
          warnings: res.ok ? res.warnings : [res.error],
          yearsExperience: '',
          city: res.ok ? res.fields.city ?? '' : '',
          preferredRole: res.ok ? res.fields.currentTitle ?? '' : '',
          credential: 'none',
          workModePreference: 'no_preference',
          openToAdjacent: false,
          skills: res.ok ? res.fields.skills ?? [] : [],
          busy: false,
        },
      ])
    }
    setReading(false)
  }

  const patch = (id: string, p: Partial<Candidate>) =>
    setCandidates((cur) => cur.map((c) => (c.id === id ? { ...c, ...p } : c)))

  async function run(c: Candidate) {
    patch(c.id, { busy: true, result: undefined })
    const result = await benchScore({
      yearsExperience: c.yearsExperience === '' ? 0 : Number(c.yearsExperience),
      city: c.city,
      preferredRole: c.preferredRole,
      credential: c.credential,
      workModePreference: c.workModePreference,
      openToAdjacent: c.openToAdjacent,
      skills: c.skills,
    })
    patch(c.id, { busy: false, result })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => input.current?.click()} disabled={reading}>
          {reading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {reading ? 'Reading…' : 'Add résumés'}
        </Button>
        {candidates.length > 0 && (
          <Button variant="ghost" onClick={() => setCandidates([])}>Clear all</Button>
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Add two or more résumés to compare what the parser reads from each and what the scorer
          does with it. Nothing is saved — this writes no profile and no results.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {candidates.map((c) => (
          <section key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-primary">{c.filename}</p>
              <button
                type="button"
                onClick={() => setCandidates((cur) => cur.filter((x) => x.id !== c.id))}
                aria-label={`Remove ${c.filename}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            {c.warnings.length > 0 && (
              <ul className="mb-4 space-y-1 rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground">
                {c.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-primary">
                Years
                <input
                  className={`mt-1 ${field}`} type="number" min={0} max={50} step={0.5}
                  placeholder="not parsed — enter it"
                  value={c.yearsExperience}
                  onChange={(e) => patch(c.id, { yearsExperience: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold text-primary">
                City
                <input className={`mt-1 ${field}`} value={c.city}
                  onChange={(e) => patch(c.id, { city: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-primary sm:col-span-2">
                Preferred role
                <input className={`mt-1 ${field}`} value={c.preferredRole}
                  onChange={(e) => patch(c.id, { preferredRole: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-primary">
                Credential
                <select className={`mt-1 ${field}`} value={c.credential}
                  onChange={(e) => patch(c.id, { credential: e.target.value as Candidate['credential'] })}>
                  <option value="none">None</option><option value="CA">CA</option>
                  <option value="CFA">CFA</option><option value="CS">CS</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-primary">
                Work mode
                <select className={`mt-1 ${field}`} value={c.workModePreference}
                  onChange={(e) => patch(c.id, { workModePreference: e.target.value as Candidate['workModePreference'] })}>
                  <option value="no_preference">No preference</option>
                  <option value="remote">Remote</option><option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </label>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="size-4 accent-accent" checked={c.openToAdjacent}
                onChange={(e) => patch(c.id, { openToAdjacent: e.target.checked })} />
              Open to adjacent roles
            </label>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              <span className="font-semibold text-primary">Skills read:</span>{' '}
              {c.skills.length ? c.skills.join(', ') : 'none'}
            </p>

            <div className="mt-4 border-t border-border pt-4">
              <Button onClick={() => run(c)} disabled={c.busy || !c.preferredRole}>
                {c.busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {c.busy ? 'Scoring…' : 'Score against the index'}
              </Button>
            </div>

            {c.result ? <Results result={c.result} /> : null}
          </section>
        ))}
      </div>
    </div>
  )
}

function Results({ result }: { result: BenchResult }) {
  if (!result.ok) {
    return <p className="mt-4 text-sm text-destructive">{result.error}</p>
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {result.indexed.toLocaleString('en-IN')} indexed · {result.scoped} scoped
      </p>

      <div className="mt-3 space-y-1">
        {BUCKET_META.map(({ key, title }) => {
          const n = result.buckets.find((b) => b.bucket === key)?.count ?? 0
          if (n === 0) return null
          return (
            <p key={key} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{title}</span>
              <span className="font-mono tabular-nums text-primary">{n}</span>
            </p>
          )
        })}
      </div>

      <ol className="mt-4 space-y-2">
        {result.roles.map((r, i) => (
          <li key={i}>
            <details className="group rounded-xl border border-border bg-secondary/30 p-3">
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <span className="w-8 shrink-0 font-mono text-sm font-semibold tabular-nums text-primary">
                  {r.score}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-primary">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[r.company, r.city].filter(Boolean).join(' · ')} — {BUCKET_TITLE[r.bucket]}
                  </span>
                </span>
              </summary>
              <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
                {r.breakdown.components.map((comp) => (
                  <div key={comp.key} className="grid gap-0.5 sm:grid-cols-[120px_1fr]">
                    <dt className="text-xs font-semibold text-primary">
                      {comp.label}{' '}
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {comp.points}/{comp.max}
                      </span>
                    </dt>
                    <dd className="text-xs leading-5 text-muted-foreground">{comp.note}</dd>
                  </div>
                ))}
                <div className="pt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  experience: {r.breakdown.experience ?? '—'} · location: {r.breakdown.location ?? '—'}
                  {' · '}confidence: {r.breakdown.confidence}
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ol>
    </div>
  )
}
