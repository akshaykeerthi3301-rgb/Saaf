'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { AlertCircle, Info, Loader2, Quote, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FitRing } from '@/components/ui/fit-ring'
import { scorePastedJd, type JdMatchResponse } from '@/app/actions/jd-match'
import { askExtension } from '@/lib/extension-client'
import {
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
  MIN_JD_CHARS,
  MIN_RESUME_CHARS,
} from '@/lib/jd-match-constants'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import { TailorPanel } from '@/components/features/tailor-panel'
import { requirementLabel } from '@/lib/display-names'

/**
 * TASK-060 step 3 — the paste-a-JD surface.
 *
 * The scorer, the extractor and the action all existed before this file; the
 * only thing missing was somewhere to type. It is therefore deliberately thin:
 * it collects text, calls one action, and renders what comes back. No scoring
 * decision is taken here and none should be — a second opinion about a number
 * on the client is how two surfaces start disagreeing.
 *
 * ⚠️ NOTHING IS PERSISTED, INCLUDING IN THE BROWSER. No localStorage, no
 * draft-saving, no analytics on the pasted text. A résumé pasted into a public
 * tool is the most sensitive thing this product ever touches, and the promise
 * on the page above is that it is dropped when the request ends. Anything that
 * caches it here would make that promise false without changing the server.
 */

/** The field styling from DESIGN.md's `input-field` token, one line taller. */
const FIELD =
  'w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none ' +
  'transition-colors placeholder:text-muted-foreground hover:border-foreground/30 ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/10'

const LABEL = 'mb-2 block text-sm font-semibold text-primary'

type Result = Extract<JdMatchResponse, { ok: true }>

export function JdMatchForm() {
  const [jdText, setJdText] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdLocation, setJdLocation] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [preferredRole, setPreferredRole] = useState('')

  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [fromExtension, setFromExtension] = useState(false)

  /**
   * "Tailor my résumé" in the browser extension opens this page with `?from=extension` and leaves the
   * posting it was looking at (and the résumé stored in the extension) for this page to take, once.
   * Nothing is sent anywhere by this: the text lands in the boxes below and the candidate presses the
   * button. The ask is made ONCE per page load — the extension hands the posting over a single time,
   * and React's development double-run would otherwise take it and then find it gone.
   */
  const taken = useRef<ReturnType<typeof askExtension<{ ok: boolean; jd: { text: string; title: string; location: string } | null; resumeText: string }>> | null>(null)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('from') !== 'extension') return
    taken.current ??= askExtension({ type: 'saaf:take-jd' })
    let alive = true
    void taken.current.then((r) => {
      if (!alive || !r?.ok || !r.jd) return
      setJdText(r.jd.text.slice(0, MAX_JD_CHARS)); setJdTitle(r.jd.title); setJdLocation(r.jd.location)
      if (r.resumeText) setResumeText(r.resumeText.slice(0, MAX_RESUME_CHARS))
      setFromExtension(true)
    })
    return () => { alive = false }
  }, [])

  /**
   * The button is disabled below the server's own minimum rather than at some
   * friendlier number of our own. A client check that disagrees with the server
   * either blocks something the server would have accepted or waves through
   * something it rejects; both read as a broken form.
   */
  const ready =
    jdText.trim().length >= MIN_JD_CHARS && resumeText.trim().length >= MIN_RESUME_CHARS

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const res = await scorePastedJd({
        jdText,
        resumeText,
        jdTitle: jdTitle.trim() || undefined,
        jdLocation: jdLocation.trim() || undefined,
        yearsExperience: yearsExperience.trim() || undefined,
        preferredRole: preferredRole.trim() || undefined,
      })

      if (res.ok) {
        setResult(res)
      } else {
        // The previous result is cleared on failure. Leaving a stale score on
        // screen under a fresh error invites the reader to believe the number
        // describes what they just pasted.
        setResult(null)
        setError(res.error)
      }
    })
  }

  return (
    <div className="mt-8">
      <form onSubmit={onSubmit}>
        {fromExtension ? (
          <p role="status" className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-primary">
            The posting{jdTitle ? ` (${jdTitle})` : ''} came from the Jobinko extension{resumeText ? ', with the résumé stored in it' : ''}. Nothing has been sent yet — check the boxes, then press the button.
          </p>
        ) : null}
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label className={`${LABEL} mb-0`} htmlFor="jd-text">
              The job description
            </label>
            <CharCount value={jdText} max={MAX_JD_CHARS} />
          </div>
          <textarea
            id="jd-text"
            className={`${FIELD} min-h-[220px] resize-y leading-6`}
            placeholder="Paste the whole posting — the requirements matter most, so don't trim them out."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label className={`${LABEL} mb-0`} htmlFor="resume-text">
              Your résumé
            </label>
            <CharCount value={resumeText} max={MAX_RESUME_CHARS} />
          </div>
          <textarea
            id="resume-text"
            className={`${FIELD} min-h-[180px] resize-y leading-6`}
            placeholder="Paste it as text. Your phone number and email are stripped on the server before anything is read."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            required
          />
        </div>

        {/* Collapsed by default, because a wall of optional fields in front of
            the one thing the visitor came to do is how a tool goes unused. The
            result names the fields that would have changed it, and this is
            where they go — open the moment they are told they matter. */}
        <details className="group mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
            <span className="inline-flex items-center gap-2">
              <Info className="size-4 text-accent" aria-hidden="true" />
              Optional — these four move the score more than anything else
            </span>
          </summary>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            We read all four out of what you pasted. Filling one in overrides our
            reading; leaving it blank is fine, and the result will tell you what we
            guessed.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SmallField
              id="jd-title" label="Role title" value={jdTitle} onChange={setJdTitle}
              placeholder="Senior Product Manager"
              helper="Worth 28 of 100, and it sets the seniority read."
            />
            <SmallField
              id="jd-location" label="Where the role is" value={jdLocation} onChange={setJdLocation}
              placeholder="Bengaluru, India"
              helper="Worth 10 of 100. Blank is scored as unstated, not against you."
            />
            <SmallField
              id="years" label="Your years of experience" value={yearsExperience} onChange={setYearsExperience}
              placeholder="5" type="number" min={0} max={50}
              helper="Worth 25, and it caps the total. The single most decisive field here."
            />
            <SmallField
              id="preferred-role" label="The role you want" value={preferredRole} onChange={setPreferredRole}
              placeholder="Product Manager"
              helper="Defaults to your current title — not to the posting's."
            />
          </div>
        </details>

        <Button type="submit" disabled={!ready || pending} className="w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Scoring
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              Score this posting
            </>
          )}
        </Button>

        {!ready && (jdText.length > 0 || resumeText.length > 0) ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Both boxes need at least {MIN_JD_CHARS} characters before we can read
            anything useful out of them.
          </p>
        ) : null}
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-6 flex gap-2 rounded-2xl border border-destructive/40 bg-card p-5 text-sm leading-6 text-destructive shadow-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <JdResult result={result} />
          {/* The conversion step, at the moment the candidate has just been told
              how they score against this posting. */}
          <TailorPanel jdText={jdText} resumeText={resumeText} jdTitle={jdTitle} />
        </>
      ) : null}
    </div>
  )
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.trim().length
  if (n === 0) return null
  return (
    <span
      className={`font-mono text-[11px] tabular-nums ${
        n > max ? 'text-destructive' : 'text-muted-foreground'
      }`}
    >
      {n.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
    </span>
  )
}

function SmallField({
  id, label, value, onChange, placeholder, helper, type = 'text', min, max,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helper?: string
  type?: string
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        className={FIELD}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

/**
 * The result, in the same order the shortlist uses: the number, the one line
 * explaining it, then the working.
 *
 * The warnings sit ABOVE the working and below the reason, on purpose. They are
 * what the product could not read, and on this surface they are usually
 * actionable — "we guessed your title" is a prompt to go and correct it, which
 * is why the panel points back at the form.
 */
function JdResult({ result }: { result: Result }) {
  const { breakdown, reason, requirements, warnings, providerLabel } = result

  /**
   * One quote, shown once. Same de-duplication the shortlist card does, and for
   * the same reason: a single sentence often yields two legitimate readings and
   * the panel displays only the quote, so they render as the identical line
   * twice. That reads as a bug in the one product whose claim is that it shows
   * its working.
   */
  const shownRequirements = Object.values(
    requirements
      /**
       * A requirement with no sentence behind it is dropped, not shown empty.
       *
       * The extractor returns a location requirement even when the caller
       * supplied no location — this surface's normal case, since a pasted JD
       * rarely has a clean location field — and its sourceQuote is then ''.
       * Rendering it put a quote mark with nothing after it under the heading
       * "Read from the posting itself", which is the one claim on this page
       * that has to be literally true. The fact is not lost: "No location in
       * the posting" is already in the warnings above.
       */
      .filter((r) => r.sourceQuote.trim().length > 0)
      .reduce<Record<string, (typeof requirements)[number]>>((acc, r) => {
        const key = `${r.kind}||${r.sourceQuote}`
        const prev = acc[key]
        if (
          !prev ||
          r.confidence > prev.confidence ||
          (r.confidence === prev.confidence && r.minYears !== undefined && prev.minYears === undefined)
        ) {
          acc[key] = r
        }
        return acc
      }, {}),
  )

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your match</p>

          {/* The one line explaining the number. Same summariser the shortlist
              uses — this is the same score, said the same way. */}
          <p className="mt-3 text-sm leading-6 text-primary">{reason}</p>

          {warnings.length ? (
            <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What we could not read
              </p>
              <ul className="mt-3 space-y-2">
                {warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Fill these in above and score it again — the number will move.
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                How the number was reached
              </p>
              <ul className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
                {breakdown.components.map((c) => (
                  <li key={c.key} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {c.note}
                  </li>
                ))}
              </ul>
            </div>

            {shownRequirements.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Read from the posting itself
                </p>
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                  {shownRequirements.map((r, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {requirementLabel(r.kind)}
                        {r.confidence < CONFIDENCE_THRESHOLD ? ' · read with low confidence' : ''}
                      </p>
                      {/* Plain text, never dangerouslySetInnerHTML — this is
                          third-party content pasted in by the visitor. */}
                      <blockquote className="mt-1 flex gap-2 text-xs leading-5 text-muted-foreground">
                        <Quote className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                        <span>{r.sourceQuote}</span>
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            {providerLabel
              ? `Your résumé was read by ${providerLabel} with contact details stripped first, then dropped. Nothing was stored.`
              : 'Your résumé was read on our own server, by pattern rather than by a model, and dropped. Nothing was stored.'}
          </p>
        </div>

        <FitRing score={breakdown.total} components={breakdown.components} />
      </div>
    </section>
  )
}
