'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import { getCompanyFacts, type CompanyFactsResult } from '@/app/actions/company-facts'
import type { CompanyFacts, CompanyNews } from '@/lib/services/company-facts'

/**
 * Company facts from open data (Wikidata) and news that mentions the company
 * (GDELT). Shown only when the company was matched unambiguously; every fact
 * says where it came from and links there, because community-edited data can
 * be out of date and the reader should be able to check it.
 */
export function CompanyFactsView({ facts, news }: { facts: CompanyFacts | null; news: CompanyNews }) {
  if (!facts) {
    return (
      <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
        No open company record matched this employer by name with certainty, so none is shown — a wrong company&apos;s facts would be worse than none.
      </p>
    )
  }
  const rows: [string, string][] = [
    ['Founded', facts.founded ? String(facts.founded) : ''],
    ['Headquarters', facts.headquarters ?? ''],
    ['Employees', facts.employees ? facts.employees.toLocaleString('en-IN') : ''],
    ['Industry', facts.industries.join(', ')],
    ['CEO', facts.ceo ?? ''],
    ['Stock market', facts.publiclyListed ? 'Publicly listed' : ''],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-start gap-3">
        {facts.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a remote Wikimedia file; next/image would need a domain allow-list for one small logo
          <img src={facts.logoUrl} alt="" className="size-10 shrink-0 rounded-lg bg-secondary object-contain p-1" loading="lazy" />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{facts.label}</p>
          {facts.description ? <p className="text-xs text-muted-foreground">{facts.description}</p> : null}
        </div>
      </div>
      {rows.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
              <dd className="text-xs text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {facts.website ? (
        <a href={facts.website} target="_blank" rel="nofollow noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
          Company website <ArrowUpRight className="size-3" />
        </a>
      ) : null}
      {news.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Recent news that mentions {facts.label}</p>
          <ul className="mt-1.5 space-y-1.5">
            {news.map((n) => (
              <li key={n.url} className="text-xs leading-5">
                <a href={n.url} target="_blank" rel="nofollow noopener noreferrer" className="text-primary hover:text-accent">{n.title}</a>
                <span className="text-muted-foreground"> · {n.source} · {n.date}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
        Facts from <a href={facts.wikidataUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Wikidata</a>, the open, community-edited database behind Wikipedia — check the link if something looks out of date.{news.length ? ' News via GDELT.' : ''} Funding is not shown: no free source carries it reliably.
      </p>
    </div>
  )
}

/** The panel's lazy loader: the match analysis never waits on open-data look-ups. */
export function CompanyFactsCard({ company }: { company: string }) {
  const [state, setState] = useState<CompanyFactsResult | 'loading'>('loading')
  useEffect(() => {
    let live = true
    getCompanyFacts({ company })
      .catch((): CompanyFactsResult => ({ ok: false }))
      .then((r) => { if (live) setState(r) })
    return () => { live = false }
  }, [company])
  if (state === 'loading') {
    return <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Looking up {company} in open company records…</p>
  }
  if (!state.ok) return null
  return <CompanyFactsView facts={state.facts} news={state.news} />
}
