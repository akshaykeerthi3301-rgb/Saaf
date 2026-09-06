import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ResumeBench } from '@/components/features/resume-bench'

/**
 * The developer bench. DEVELOPMENT ONLY, and 404s otherwise.
 *
 * Same guard as /api/dev-signin, for the same reason: NODE_ENV is 'production'
 * on every Vercel deployment — preview deployments included, since those are
 * also built in production mode — so this route does not exist there. The
 * server action behind it (src/app/actions/bench.ts) repeats the check rather
 * than trusting this page, because a server action is its own entry point and
 * is reachable without ever rendering the page that calls it.
 *
 * It writes nothing. See the action's comment for what that rules out.
 */
export default async function BenchPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Bench" eyebrow="Development only" initials={initials}>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
        <p className="mb-6 max-w-2xl text-sm leading-6 text-muted-foreground">
          Parses each résumé with the real parser and scores it with the real pipeline. Writes
          nothing — no profile, no results — so a run here cannot disturb the account you are
          signed in as.
        </p>
        <ResumeBench />
      </div>
    </AppShell>
  )
}
