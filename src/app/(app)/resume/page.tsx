import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, RefreshCw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { listResumes, type SavedResume } from '@/lib/services/resume-documents'
import { SavedResumes } from '@/components/features/saved-resumes'

/**
 * Résumé.
 *
 * ⚠️ THIS SCREEN'S PREMISE CHANGED ON 2026-09-09, AND THE OLD ONE IS QUOTED
 * HERE SO THE REVERSAL IS VISIBLE RATHER THAN SILENT.
 *
 * It used to open: "THIS IS NOT DOCUMENT STORAGE, AND IT CANNOT BE… building a
 * document manager would mean starting to keep the files, which would make the
 * upload screen's third line — 'Deleted the file' — a lie." That was correct
 * about files and it is still enforced: src/app/actions/read-resume-file.ts and
 * parse-resume.ts both parse bytes in memory and drop them, and the upload
 * screen's promise has not changed by a word.
 *
 * What changed is what a candidate can KEEP. Founder decision, taken twice in
 * writing after the conflict was put to them: without somewhere to hold a
 * résumé, the checker is a one-session tool — somebody fixes their document,
 * closes the tab, and tomorrow morning's ingest of 180 boards has nothing of
 * theirs to score against.
 *
 * ⚠️ THE DISTINCTION THAT MAKES THIS DEFENSIBLE, and it is not a technicality:
 * we still never keep the FILE they uploaded. What is saved is the RÉSUMÉ THEY
 * BUILT HERE — the sections they saw, the fixes they accepted, the rewrite they
 * approved — which they can read on this page and delete from it. A file in a
 * bucket is none of those things.
 */
export default async function ResumePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_title, employer, years_experience, preferred_role, city, skills, domain, confirmed_at, credential')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/start')

  /**
   * Read through the service rather than inline, per CLAUDE.md's third
   * invariant. The 25 inline queries in src/app/ predate that rule; this one
   * does not, so it does not get to be the 26th.
   */
  let saved: SavedResume[] = []
  try {
    saved = await listResumes(user.id)
  } catch {
    // Migration 0023 is applied by hand (HANDOFF A1). Until it lands, the table
    // does not exist — and this page's other half, which has worked for weeks,
    // must not go down because of a feature that is not there yet.
  }

  const skills: string[] = profile.skills ?? []
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  const read: { label: string; value: string | null; note?: string }[] = [
    { label: 'Current title', value: profile.current_title },
    { label: 'Employer', value: profile.employer },
    {
      label: 'Years of experience',
      value: profile.years_experience !== null ? String(profile.years_experience) : null,
      note: 'Scored against every posting that states an experience bar.',
    },
    { label: 'Role you want', value: profile.preferred_role, note: 'Decides which roles are scored at all.' },
    { label: 'Where you want to work', value: profile.city, note: 'Decides the location component, and which section a role lands in.' },
    { label: 'Domain', value: profile.domain },
    {
      label: 'Credential',
      value: profile.credential && profile.credential !== 'none' ? profile.credential : 'None on file',
      note: '780 of the roles we index state one.',
    },
  ]

  return (
    <AppShell title="AI Resume Builder" eyebrow="Your résumés" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        {/* The promise this screen exists under, stated first rather than in a
            footnote — and narrowed, not dropped, on 2026-09-09. */}
        <div className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-primary">
              Your uploaded file was deleted. What you build here, you keep.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              The PDF or Word file you uploaded is read once and dropped inside that request — it is
              never written to storage, and that has not changed. What is saved below is the résumé
              you built on this site: the version you fixed, checked and approved. You can read it,
              replace it, and delete it here, and deleting your account takes it with it.
            </p>
          </div>
        </div>

        {/* The two ways to work on a résumé, side by side: build and check it,
            or aim a saved one at a specific role. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/tools/ats-checker" className="glow-hover flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl"><Wand2 className="size-4" /></span>
            <span>
              <span className="block text-sm font-semibold text-primary">Build &amp; check a résumé</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Upload, see what a parser reads, fix it, save it here.</span>
            </span>
          </Link>
          <Link href="/resume/tailor" className="glow-hover flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl"><Sparkles className="size-4" /></span>
            <span>
              <span className="block text-sm font-semibold text-primary">Tailor to a role</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">A saved résumé beside an AI-tailored version, every change marked.</span>
            </span>
          </Link>
        </div>

        <SavedResumes resumes={saved} />

        <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          What we read
        </h2>
        <dl className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {read.map(({ label, value, note }) => (
            <div key={label} className="grid gap-1 p-4 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>
                <p className={value ? 'text-sm text-primary' : 'text-sm italic text-muted-foreground'}>
                  {value ?? 'Not read'}
                </p>
                {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Skills we read
          {skills.length ? (
            <span className="ml-2 font-mono text-sm font-normal tracking-normal text-muted-foreground">
              {skills.length}
            </span>
          ) : null}
        </h2>
        <div className="mt-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          {skills.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-primary">
                    {s}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                A posting naming one of these scores higher on the skills component, which is worth 20
                of 100. Nothing here is inferred — each was read off your résumé and confirmed by you.
              </p>
            </>
          ) : (
            /* Honest, and specific about the consequence. Every profile scored
               out of 80 rather than 100 for as long as no key was configured,
               and a blank panel would not have said so. */
            <p className="text-sm leading-6 text-muted-foreground">
              No skills were read from your résumé. The skills component is worth 20 points of 100, so
              every role you see is being scored out of 80. Re-uploading a résumé that lists your tools
              and specialisms will fix it.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary hover:border-accent/60"
          >
            <FileText className="size-4" />
            Edit these fields
          </Link>
          {/* Re-reading a résumé is the same flow as the first one — there is no
              second parser, and no stored file to diff against. */}
          <Link
            href="/start/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            <RefreshCw className="size-4" />
            Upload a new résumé
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
