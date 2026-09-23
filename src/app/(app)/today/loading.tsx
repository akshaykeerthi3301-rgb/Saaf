import { AppShell } from '@/components/features/app-shell'

/**
 * What /today shows while its query runs.
 *
 * Measured 2026-09-23: 9.95 s cold for the shortlist query alone, and a
 * candidate who opens Saaf once a day always arrives cold. Before this file the
 * navigation showed nothing at all for that long (docs/QA-AUDIT.md QA-02,
 * QA-12). TASK-093 attacks the wait itself; this makes the wait legible.
 *
 * The shape of the real card — badge, title, company, chips, reason, ring — so
 * the page does not jump when the list arrives. There is no (app) layout, so
 * the shell is drawn here or the sidebar would vanish during the wait; the
 * initials are not known yet and the avatar stays blank for that moment.
 */
export default function TodayLoading() {
  return (
    <AppShell title="Jobs" initials="">
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8" role="status" aria-live="polite">
        <span className="sr-only">Loading your matches…</span>
        <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
          <div className="h-9 w-64 rounded-xl bg-secondary" />
          <div className="mt-6 flex flex-wrap gap-2">
            {['w-28', 'w-40', 'w-24', 'w-20'].map((w) => (
              <div key={w} className={`h-8 rounded-xl bg-secondary ${w}`} />
            ))}
          </div>

          <div className="mt-8 grid gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
                  <div>
                    <div className="h-5 w-32 rounded-md bg-secondary" />
                    <div className="mt-4 h-7 w-3/4 rounded-lg bg-secondary" />
                    <div className="mt-2 h-4 w-1/3 rounded-lg bg-secondary" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-24 rounded-lg bg-secondary" />
                      <div className="h-7 w-32 rounded-lg bg-secondary" />
                    </div>
                    <div className="mt-4 h-4 w-2/3 rounded-lg bg-secondary" />
                  </div>
                  <div className="hidden h-40 rounded-2xl bg-secondary lg:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
