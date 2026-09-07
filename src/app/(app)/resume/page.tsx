import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'

/**
 * Résumé.
 *
 * ⚠️ THIS IS NOT DOCUMENT STORAGE, AND IT CANNOT BE. The reference for this
 * screen was Simplify's "My Documents" — a table of stored résumé files with
 * Edit, Copy and Delete. Saaf cannot build that, because the upload flow tells
 * the candidate in as many words that the file is DELETED once it has been
 * read, and src/app/actions/parse-resume.ts keeps that promise: the bytes are
 * parsed in memory, never written to storage, never logged.
 *
 * Building a document manager would mean starting to keep the files, which
 * would make that screen's third line — "Deleted the file" — a lie. So this
 * screen shows the thing we DO hold and the candidate cannot otherwise see:
 * what we read out of their résumé, and what it is doing to their shortlist.
 *
 * Everything on it is stored profile data, and every field is editable at the
 * place that owns it.
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
    <AppShell title="Résumé" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        {/* The promise this screen exists under, stated first rather than in a
            footnote — it is the reason there is no file list here. */}
        <div className="flex gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-primary">Your résumé file was deleted.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We read it once, kept the fields you confirmed, and deleted the file itself — it was
              never written to storage. So there is nothing to list here, and nothing of yours sitting
              on a server. What we kept is below, and it is all you can be matched on.
            </p>
          </div>
        </div>

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
