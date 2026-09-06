'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BriefcaseBusiness, FlaskConical, Grid2X2, Menu, Settings, ShieldCheck, Sparkles, X,
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
 * NAV CARRIES ONLY ROUTES THAT EXIST. The export's sidebar also lists Résumé,
 * Copilot Diagnostic and Interview Prep. Those are planned, not built, and a
 * nav item that goes nowhere is a worse first impression than a short nav — so
 * they arrive with their features rather than ahead of them.
 */
const NAV = [
  { label: 'Jobs', href: '/today', icon: BriefcaseBusiness },
  { label: 'Applications', href: '/applications', icon: Grid2X2 },
  { label: 'Index audit', href: '/audit', icon: ShieldCheck },
  // The bench 404s outside development and this link goes with it. NODE_ENV is
  // inlined into the client bundle at build time, so the entry is not merely
  // hidden in production — it is not in the shipped array at all.
  ...(process.env.NODE_ENV === 'production'
    ? []
    : [{ label: 'Bench', href: '/dev/bench', icon: FlaskConical }]),
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
            {NAV.map(({ label, href, icon: Icon }) => (
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
            ))}
          </nav>

          <div className="mt-auto border-t border-border pt-4">
            <Link
              href="/profile"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Settings className="size-[18px]" />
              Profile &amp; settings
            </Link>
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
