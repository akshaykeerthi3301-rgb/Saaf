'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal, ModalTitle } from '@/components/ui/modal'
import { saveWelcome } from '@/app/actions/first-run'
import { saveProfileRoles } from '@/app/actions/profile-cards'
import { RolesEditor } from '@/components/features/roles-editor'
import { splitRoles } from '@/lib/role-list'
import { LEVELS, levelFromYears } from '@/lib/first-run'

/**
 * The card a new person sees over their feed after the first scan — the reference product's "Welcome! We found N
 * roles" step. It asks one thing the scan cannot know (the level they are at, pre-ticked from the years we read)
 * and one optional thing (a LinkedIn link). Closing it without confirming saves nothing and keeps the feed open.
 *
 * The count is the number of roles scored for this person, and the years line says where the pre-tick came from,
 * with a way to fix it: years are the field a résumé reader gets wrong most often.
 */
export function WelcomeModal({ found, years, roles: initialRoles }: { found: number; years: number | null; roles: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const pre = levelFromYears(years)
  const [picked, setPicked] = useState<string[]>(pre ? [pre] : [])
  const [linkedin, setLinkedin] = useState('')
  const [roles, setRoles] = useState(initialRoles)
  const rolesChanged = roles.join('\u0000').toLowerCase() !== initialRoles.join('\u0000').toLowerCase()
  const [error, setError] = useState<string>()
  const [busy, start] = useTransition()

  const close = () => { setOpen(false); router.replace('/today') }
  const toggle = (k: string) => setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))

  function confirm() {
    setError(undefined)
    start(async () => {
      // Changing the roles re-scores the list (a few seconds), so it is done first and the card says so.
      if (rolesChanged && roles.length) {
        const r = await saveProfileRoles(splitRoles(roles)).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
        if (!r.ok) { setError(r.error); return }
      }
      const res = await saveWelcome({ levels: picked, linkedinUrl: linkedin })
      if (!res.ok) { setError(res.error); return }
      setOpen(false)
      router.replace(res.feedLevel ? `/today?level=${res.feedLevel}` : '/today')
    })
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) close() }}>
      <div className="overflow-y-auto px-6 pb-6 pt-8 sm:px-10">
        <span className="bg-brand-gradient mx-auto flex size-14 items-center justify-center rounded-full"><Sparkles className="size-6" /></span>
        <ModalTitle className="mt-5 text-balance text-center text-2xl font-semibold tracking-[-0.04em] text-primary sm:text-3xl">
          {found > 0
            ? <>Welcome! We found <span className="text-brand-gradient">{found.toLocaleString('en-IN')}</span> roles that fit you.</>
            : 'Welcome! Your feed fills as the nightly index runs.'}
        </ModalTitle>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {found > 0 ? 'Take a moment to review — just making sure everything looks right for you.' : 'We hold no scored roles for this title yet — that is our coverage, not a verdict on you.'}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold text-primary">Roles you are looking for</p>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">Up to five. The first is your main role; add more to widen your list.</p>
          <RolesEditor roles={roles} onChange={setRoles} />
          {rolesChanged ? <p className="mt-3 text-xs text-muted-foreground">Confirming will update your matches — it takes a few seconds.</p> : null}
        </div>

        <fieldset className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <legend className="px-1 text-sm font-semibold text-primary">Experience levels you are looking at</legend>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {LEVELS.map((l) => {
              const on = picked.includes(l.key)
              return (
                <label
                  key={l.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border hover:bg-secondary/60'}`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(l.key)} className="sr-only" />
                  <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-border'}`}>
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-primary">{l.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.hint}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {years !== null ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Ticked from the {years} {years === 1 ? 'year' : 'years'} of experience we read in your résumé.{' '}
              <Link href="/profile" className="font-semibold text-primary underline underline-offset-4">Not right? Fix it on your profile.</Link>
            </p>
          ) : null}
        </fieldset>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label htmlFor="welcome-linkedin" className="text-sm font-semibold text-primary">
            Your LinkedIn profile link <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="welcome-linkedin"
            type="url"
            inputMode="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="linkedin.com/in/yourname"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-primary outline-none placeholder:text-muted-foreground focus:border-accent"
          />
          <p className="mt-2 text-xs text-muted-foreground">Kept on your profile so the browser extension can fill it into applications. We never open it.</p>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="bg-brand-gradient inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy && rolesChanged ? 'Updating your matches…' : <>Confirm &amp; see jobs</>}
          </button>
          <button type="button" onClick={close} className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary">Skip for now</button>
        </div>
      </div>
    </Modal>
  )
}
