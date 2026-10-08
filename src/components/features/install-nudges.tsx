'use client'

import { Download, Puzzle, X } from 'lucide-react'

/**
 * The two install prompts, as small cards in the corner (F-1111, TASK-201). Which one may
 * appear, and when, is decided by the popup governor (src/lib/nudges.ts) — these only draw
 * what it chose. "Not now" pauses it; "Don't show again" is a no. Neither is a modal: the
 * page underneath stays usable.
 */
function Card({ icon: Icon, title, body, cta, onCta, onLater, onNever }: {
  icon: typeof Download; title: string; body: string; cta: string; onCta: () => void; onLater: () => void; onNever: () => void
}) {
  return (
    <div role="dialog" aria-label={title} className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-lg" data-testid="install-nudge">
      <button type="button" onClick={onNever} aria-label="Don’t show this again" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-primary"><X className="size-3.5" /></button>
      <p className="flex items-center gap-2 pr-6 text-sm font-semibold text-primary"><Icon className="size-4 text-accent" aria-hidden="true" />{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{body}</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={onCta} className="bg-brand-gradient rounded-xl px-3.5 py-1.5 text-xs font-semibold">{cta}</button>
        <button type="button" onClick={onLater} className="text-xs font-semibold text-muted-foreground hover:text-primary">Not now</button>
      </div>
    </div>
  )
}

export function InstallAppCard({ onInstall, onLater, onNever }: { onInstall: () => void; onLater: () => void; onNever: () => void }) {
  return <Card icon={Download} title="Add Saaf to your home screen" body="Open your feed in its own window, one tap away. It is the same site — nothing extra is installed or stored." cta="Install" onCta={onInstall} onLater={onLater} onNever={onNever} />
}

export function InstallExtensionCard({ href, onLater, onNever }: { href: string; onLater: () => void; onNever: () => void }) {
  return (
    <Card
      icon={Puzzle} title="Fill applications from Saaf"
      body="The Saaf browser extension fills the application form from your profile, shows your match on any job page, and puts what you apply to on your tracker. It reads only the page you are on."
      cta="Get the extension" onCta={() => { window.open(href, '_blank', 'noopener,noreferrer'); onNever() }} onLater={onLater} onNever={onNever}
    />
  )
}
