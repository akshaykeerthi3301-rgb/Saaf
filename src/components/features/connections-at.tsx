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
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              {p.profileUrl ? (
                <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  Profile <ArrowUpRight className="size-3" />
                </a>
              ) : null}
              {p.email ? (
                <a href={`mailto:${p.email}`} className="max-w-[170px] truncate text-xs font-semibold text-accent" title={`${p.email} — ${p.source === 'google' ? 'from your contacts file' : 'you added it'}`}>
                  {p.email}
                </a>
              ) : null}
              <span className="text-[10px] text-muted-foreground">{p.source === 'linkedin' ? 'from LinkedIn' : p.source === 'google' ? 'your contacts file' : 'added by you'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
        From the contacts you uploaded or added. A short, specific note asking about the team usually beats asking for a referral outright —{' '}
        <Link href="/outreach" className="font-semibold text-accent underline underline-offset-2">draft one</Link>.
      </p>
    </section>
  )
}
