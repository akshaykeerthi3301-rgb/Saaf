import Link from 'next/link'

/**
 * A role the ingest deleted — it disappeared from the employer's own board, so
 * it has closed. Saying so is the honest answer; a stale page that still says
 * "apply" is the thing this product exists to stop.
 */
export default function RoleClosed() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold tracking-[-0.03em] text-primary">This role has closed</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          It is no longer on the employer&apos;s own hiring page, so we took it down. We never show a role you can no longer apply to.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/today" className="bg-brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold">See roles open today</Link>
          <Link href="/tools/paste-jd" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary">Score any posting</Link>
        </div>
      </div>
    </div>
  )
}
