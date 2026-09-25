'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/sign-out'
import { setSearchStatus } from '@/app/actions/workspace'
import { useAccount } from '@/components/features/account-context'
import type { SearchStatus } from '@/lib/services/workspace'
import {
  BriefcaseBusiness, ChevronsUpDown, FileText, Gauge, KanbanSquare, LogOut, Menu, MessageCircle,
  Send, Settings, ShieldCheck, Sparkles, UserRound, X, GraduationCap } from 'lucide-react'

/**
 * The signed-in workspace — the three-column split.
 *
 *   left   navigation, with the candidate's card and job-search status at the foot
 *   centre the active route
 *   right  an optional context panel the page supplies (`context`), sticky at xl
 *          and stacked under the content below it
 *
 * A client component because the drawer and the status menu need state, but it
 * takes the page body and the context panel as props, so every screen using it
 * stays a server component and keeps its auth check and its reads on the server.
 *
 * Active state reads the URL, not the title a page passes: two pages with one
 * title (or a renamed one) could otherwise light up the wrong item.
 */
const NAV: { label: string; href: string; icon: typeof BriefcaseBusiness }[] = [
  { label: 'Job Search Feed', href: '/today', icon: BriefcaseBusiness },
  { label: 'AI Resume Builder', href: '/resume', icon: FileText },
  { label: 'Application Tracker', href: '/applications', icon: KanbanSquare },
  { label: 'Networking / Outreach', href: '/outreach', icon: Send },
  // Unlocked 2026-09-15 on a measured 4.1% noise rate (TASK-080). If that number
  // is ever unknown again, re-lock it.
  { label: 'Interview Prep', href: '/interview-prep', icon: MessageCircle },
  { label: 'Coaching', href: '/coaching', icon: GraduationCap },
]

const SECONDARY: { label: string; href: string; icon: typeof BriefcaseBusiness }[] = [
  { label: 'Copilot Diagnostic', href: '/copilot', icon: Gauge },
  { label: 'Index audit', href: '/audit', icon: ShieldCheck },
]

const STATUS: Record<SearchStatus, { label: string; dot: string }> = {
  active: { label: 'Actively looking', dot: 'bg-score-high' },
  open: { label: 'Open to offers', dot: 'bg-score-mid' },
  closed: { label: 'Not looking', dot: 'bg-muted-foreground' },
}

export function AppShell({
  title, eyebrow = 'Your workspace', initials, context, contextOnMobile = 'stack', children,
}: {
  title: string
  eyebrow?: string
  /** Fallback when no account is in context (the layout provides one). */
  initials: string
  /** The right-hand context panel. Omit for a two-column page. */
  context?: ReactNode
  /** Below xl: stack the panel under the page, or hide it (the page supplies its own sheet). */
  contextOnMobile?: 'stack' | 'hide'
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const account = useAccount()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const navItem = ({ label, href, icon: Icon }: (typeof NAV)[number], small = false) => {
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 ${small ? 'py-2 text-xs' : 'py-2.5 text-sm'} font-medium transition-colors ${
          active
            ? 'bg-secondary text-primary'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-primary'
        }`}
      >
        {active ? (
          <span className="bg-brand-gradient absolute inset-y-2 left-0 w-1 rounded-full" aria-hidden="true" />
        ) : null}
        <Icon className={small ? 'size-4' : 'size-[18px]'} />
        {label}
      </Link>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto print:hidden border-r border-sidebar-border bg-sidebar px-3 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-2">
            <Link href="/today" className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.05em] text-primary">
              <span className="bg-brand-gradient glow-selected flex size-9 items-center justify-center rounded-xl">
                <Sparkles className="size-4" />
              </span>
              Saaf
            </Link>
            <button
              className="rounded-lg p-2 text-muted-foreground lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-8 space-y-1" aria-label="Primary navigation">
            {NAV.map((n) => navItem(n))}
          </nav>

          <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Insights</p>
          <nav className="mt-2 space-y-0.5" aria-label="Insights">
            {SECONDARY.map((n) => navItem(n, true))}
          </nav>

          <div className="mt-auto space-y-2 pt-4">
            {navItem({ label: 'Profile & Preferences', href: '/profile', icon: UserRound })}
            <UserCard fallbackInitials={initials} />
          </div>
        </aside>

        {open && (
          <button
            className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-20 flex h-16 print:hidden items-center justify-between border-b border-border px-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-xl border border-border p-2 text-primary lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
                <h1 className="truncate text-xl font-semibold tracking-[-0.05em] text-primary">{title}</h1>
              </div>
            </div>
            <Link
              href="/profile"
              className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              aria-label="Your profile"
            >
              {account?.initials ?? initials}
            </Link>
          </header>

          {context ? (
            <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0">{children}</div>
              <aside
                aria-label="Context panel"
                className={`border-t border-border bg-card/40 xl:sticky xl:top-16 xl:block xl:h-[calc(100vh-4rem)] xl:self-start xl:overflow-y-auto xl:border-l xl:border-t-0 print:hidden ${
                  contextOnMobile === 'hide' ? 'hidden' : ''
                }`}
              >
                {context}
              </aside>
            </div>
          ) : (
            // A block wrapper, not the flex column itself: pages centre with
            // mx-auto, and auto margins on a flex item size it to its content —
            // the six-column tracker then pushed the page 256px past the screen.
            <div className="min-w-0 flex-1">{children}</div>
          )}
        </div>
      </div>
    </main>
  )
}

/**
 * The candidate's card: who is signed in, their job-search status, settings
 * and sign-out. The status is optimistic and rolled back on a failed write —
 * the same rule as the tracker (an optimistic update that cannot be undone is a lie).
 */
function UserCard({ fallbackInitials }: { fallbackInitials: string }) {
  const account = useAccount()
  const [status, setStatus] = useState<SearchStatus>(account?.status ?? 'active')
  const [menu, setMenu] = useState(false)
  const [note, setNote] = useState<string>()

  async function choose(next: SearchStatus) {
    setMenu(false)
    if (next === status) return
    const before = status
    setStatus(next)
    setNote(undefined)
    try {
      const res = await setSearchStatus({ status: next })
      if (!res.ok) { setStatus(before); setNote(res.error) }
    } catch {
      setStatus(before)
      setNote('That did not save — check your connection.')
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {account?.initials ?? fallbackInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">{account?.name ?? 'Your account'}</p>
          <p className="truncate text-[11px] text-muted-foreground">{account?.email ?? ''}</p>
        </div>
        <Link
          href="/profile"
          aria-label="Settings"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="listbox"
          aria-expanded={menu}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-primary hover:border-accent/50"
        >
          <span className={`size-2 rounded-full ${STATUS[status].dot}`} aria-hidden="true" />
          <span className="flex-1 text-left">{STATUS[status].label}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
        {menu ? (
          <ul
            role="listbox"
            aria-label="Job-search status"
            className="absolute inset-x-0 bottom-full z-10 mb-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
          >
            {(Object.keys(STATUS) as SearchStatus[]).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s === status}
                  onClick={() => choose(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-primary hover:bg-secondary"
                >
                  <span className={`size-2 rounded-full ${STATUS[s].dot}`} aria-hidden="true" />
                  {STATUS[s].label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {note ? <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{note}</p> : null}

      {/* Signing out kept the account; until this existed the only way out of a
          session was to delete it. */}
      <form action={signOut} className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </form>
    </div>
  )
}
