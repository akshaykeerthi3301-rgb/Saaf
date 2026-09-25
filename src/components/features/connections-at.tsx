'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Users } from 'lucide-react'
import { getConnectionsAt } from '@/app/actions/network'
import type { ConnectionAt } from '@/lib/services/network'

/** Who the candidate knows at this company, from their own LinkedIn export. Loads after the panel. */
export function ConnectionsAt({ company }: { company: string }) {
  const [people, setPeople] = useState<ConnectionAt[] | null>(null)
  useEffect(() => {
    let live = true
    getConnectionsAt({ company }).catch(() => ({ ok: false as const, people: [] })).then((r) => { if (live) setPeople(r.people) })
    return () => { live = false }
  }, [company])
  if (!people?.length) return null
  return (
    <section className="mb-6 rounded-xl border border-score-high/30 bg-score-high/5 p-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
        <Users className="size-3.5 text-score-high" /> You know {people.length} {people.length === 1 ? 'person' : 'people'} at {company}
      </h3>
      <ul className="mt-3 space-y-2">
        {people.slice(0, 6).map((p) => (
          <li key={`${p.fullName}-${p.profileUrl}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="font-semibold text-primary">{p.fullName}</span>
              {p.position ? <span className="block truncate text-xs text-muted-foreground">{p.position}</span> : null}
            </span>
            {p.profileUrl ? (
              <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
                Profile <ArrowUpRight className="size-3" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
        From the LinkedIn connections you uploaded. A short, specific note asking about the team usually beats asking for a referral outright —{' '}
        <Link href="/outreach" className="font-semibold text-accent underline underline-offset-2">draft one</Link>.
      </p>
    </section>
  )
}
