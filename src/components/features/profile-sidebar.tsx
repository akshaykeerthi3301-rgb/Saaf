'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, ChevronDown, Pencil, SlidersHorizontal, UserRound } from 'lucide-react'
import type { HealthItem } from '@/lib/profile-health'
import { strengthTier } from '@/lib/profile-extras'
import type { SearchStatus } from '@/lib/services/workspace'

/**
 * The profile page's left column: who you are, the three views, and how complete the profile is.
 * The page is one route with a `?view=` — so a view is a link, and the back button works.
 */
export type ProfileView = 'profile' | 'personal' | 'preferences'

const STATUS: Record<SearchStatus, { label: string; dot: string }> = {
  active: { label: 'Actively looking', dot: 'bg-score-high' },
  open: { label: 'Open to offers', dot: 'bg-score-mid' },
  closed: { label: 'Not looking', dot: 'bg-muted-foreground' },
}

const HUB: { view: ProfileView; title: string; note: string; icon: typeof UserRound }[] = [
  { view: 'profile', title: 'Profile', note: 'Edit autofill information', icon: UserRound },
  { view: 'personal', title: 'Personal Info', note: 'Edit demographic data', icon: BarChart3 },
  { view: 'preferences', title: 'Job Preferences', note: 'Refine your job search', icon: SlidersHorizontal },
]

export function ProfileSidebar({ view, name, initials, headline, status, health }: {
  view: ProfileView | 'settings'
  name: string
  initials: string
  headline: string
  status: SearchStatus
  health: { score: number; items: HealthItem[] }
}) {
  const [open, setOpen] = useState(false)
  const tier = strengthTier(health.score)
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex justify-end">
          <Link href="/profile?view=personal" aria-label="Edit your name and contact details" className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Link>
        </div>
        <div className="mt-1 flex flex-col items-center text-center">
          <span className="bg-brand-gradient inline-flex size-16 items-center justify-center rounded-2xl text-2xl font-bold" aria-hidden="true">{initials}</span>
          <h2 className="mt-4 text-xl font-bold tracking-[-0.02em] text-primary">{name}</h2>
          {headline ? <p className="mt-1 text-sm text-primary">{headline}</p> : null}
          <p className="mt-5 text-xs font-semibold text-muted-foreground">Job Search Status</p>
          <span className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
            <span className={`size-2 rounded-full ${STATUS[status].dot}`} aria-hidden="true" /> {STATUS[status].label}
          </span>
        </div>

        <hr className="my-6 border-border" />
        <h3 className="text-sm font-semibold text-primary">My Career Hub</h3>
        <nav aria-label="Profile sections" className="mt-3 space-y-3">
          {HUB.map(({ view: v, title, note, icon: Icon }) => {
            const active = view === v
            return (
              <Link
                key={v} href={v === 'profile' ? '/profile' : `/profile?view=${v}`} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${active ? 'bg-brand-gradient border-transparent' : 'border-border bg-card text-primary hover:bg-secondary/60'}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{title}</span>
                  <span className={`block text-xs ${active ? 'opacity-90' : 'text-muted-foreground'}`}>{note}</span>
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            )
          })}
        </nav>
        <Link href="/profile?view=settings" aria-current={view === 'settings' ? 'page' : undefined} className="mt-4 block text-center text-xs font-semibold text-muted-foreground hover:text-primary">
          Account, alerts &amp; all settings
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm" aria-label="Profile strength">
        <h3 className="text-sm font-semibold text-primary">My Profile Strength</h3>
        <p className="mt-4 text-xl font-bold tracking-[-0.02em] text-primary">{tier.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tier.note}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={health.score} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
            <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${health.score}%` }} />
          </div>
          <span className="text-sm font-bold tabular-nums text-accent">{health.score}%</span>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Hide what counts' : 'Show what counts'} className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary">
            <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {open ? (
          <ul className="mt-4 space-y-2">
            {health.items.map((i) => (
              <li key={i.key} title={i.why} className={`flex items-center gap-2 text-xs ${i.done ? 'text-primary' : 'text-muted-foreground'}`}>
                {i.done ? <Check className="size-3.5 shrink-0 text-score-high" aria-hidden="true" /> : <span className="size-3.5 shrink-0 rounded-full border border-border" aria-hidden="true" />}
                <span className="flex-1">{i.label}</span>
                <span className="tabular-nums">+{i.weight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  )
}
