'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/sign-out'
import {
  BriefcaseBusiness, FileText, Gauge, Grid2X2, Lock, LogOut, Menu, MessageCircle,
  Settings, ShieldCheck, Sparkles, X,
} from 'lucide-react'

/**
 * The signed-in shell — sidebar, mobile drawer, page header.
 *
 * A client component because the mobile drawer needs state, but it takes the
 * page body as `children`, so every screen using it stays a server component
 * and keeps its auth check and its database read on the server. That is the
 * pattern the saaf-ai export could not have: its dashboard is `use client` all
 * the way down, which would have dragged the shortlist query into the browser.
 *
 * NAV MATCHES THE DESIGN, AND EVERY ITEM EITHER WORKS OR SAYS IT DOES NOT.
 * Jobs, Kanban Board, Résumé and Copilot Diagnostic are built and routed.
 * Interview Prep is not, so it renders with a lock, is not a link, and cannot
 * be clicked — which is how the design drew it. The earlier rule here was to
 * omit unbuilt items entirely; a lock is better, because it tells the candidate
 * what is coming instead of leaving the product looking thinner than it is.
 */
const NAV: {
  label: string
  href?: string
  icon: typeof BriefcaseBusiness
  /** Designed, not built. Rendered with a lock and not clickable. */
  locked?: string
}[] = [
  { label: 'Jobs', href: '/today', icon: BriefcaseBusiness },
  { label: 'Kanban Board', href: '/applications', icon: Grid2X2 },
  { label: 'Résumé', href: '/resume', icon: FileText },
  { label: 'Copilot Diagnostic', href: '/copilot', icon: Gauge },
  // ⚠️ LOCKED, NOT HIDDEN — and the distinction is the point. An item that
  // looks available and goes nowhere is a promise the product breaks on click.
  // A lock says "this is coming and it is not ready", which is true, and is how
  // the design itself drew it.
  { label: 'Interview Prep', icon: MessageCircle, locked: 'Not built yet' },
  { label: 'Index audit', href: '/audit', icon: ShieldCheck },
]

export function AppShell({
  title, eyebrow = 'Your workspace', initials, children,
}: {
  title: string
  eyebrow?: string
  initials: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card px-4 py-5 transition-transform lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.05em] text-primary">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              Saaf AI
            </Link>
            <button
              className="rounded-lg p-2 text-muted-foreground lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-10 space-y-1" aria-label="Primary navigation">
            {NAV.map(({ label, href, icon: Icon, locked }) =>
              locked || !href ? (
                <span
                  key={label}
                  title={locked}
                  aria-disabled="true"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-muted-foreground/55"
                >
                  <Icon className="size-[18px]" />
                  <span className="flex-1">{label}</span>
                  <Lock className="size-3.5" aria-label={locked} />
                </span>
              ) : (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={label === title ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
                    label === title
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-primary'
                  }`}
                >
                  <Icon className="size-[18px]" />
                  {label}
                </Link>
              ),
            )}
          </nav>

          <div className="mt-auto space-y-1 border-t border-border pt-4">
            <Link
              href="/profile"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Settings className="size-[18px]" />
              Profile &amp; settings
            </Link>
            {/* Signing out kept the account; until this existed the only way
                out of a session was to delete it. */}
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
              >
                <LogOut className="size-[18px]" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {open && (
          <button
            className="fixed inset-0 z-30 bg-primary/20 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
        )}

        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl border border-border p-2 text-primary lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
                <h1 className="text-2xl font-semibold tracking-[-0.06em] text-primary">{title}</h1>
              </div>
            </div>
            <Link
              href="/profile"
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary"
              aria-label="Your profile"
            >
              {initials}
            </Link>
          </header>

          {children}
        </div>
      </div>
    </main>
  )
}
