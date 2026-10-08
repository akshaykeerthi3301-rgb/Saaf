'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, MessageSquarePlus, X } from 'lucide-react'
import { Dialog } from '@base-ui/react/dialog'
import { loadInbox, markInboxRead, sendFeedback } from '@/app/actions/engagement'
import type { InboxItem } from '@/lib/services/engagement'

/**
 * "Send feedback" and the inbox bell, both in the app's header (F-1112, F-1110). Feedback
 * is a small dialog: what kind, and what you want to say; the page you were on goes with
 * it so a problem can be found. The inbox holds messages FROM Jobinko — a note to everyone, or
 * to you — and is read when opened, not on every page, so it costs nothing to the feed.
 */
const KINDS = [['idea', 'An idea'], ['problem', 'Something is wrong'], ['praise', 'Something is good'], ['other', 'Something else']] as const

export function FeedbackButton() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('idea')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<string>()
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  function send() {
    setNote(undefined)
    start(async () => {
      const r = await sendFeedback({ kind, message, page: path.startsWith('/') ? path.slice(0, 200) : undefined }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      setDone(true); setMessage('')
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDone(false); setNote(undefined) } }}>
      <button type="button" onClick={() => setOpen(true)} aria-label="Send feedback" title="Send feedback" className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-accent/60 hover:text-primary">
        <MessageSquarePlus className="size-4" />
      </button>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-background/60" />
        <Dialog.Popup aria-label="Send feedback" className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-lg outline-none">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-semibold tracking-[-0.03em] text-primary">Send feedback</Dialog.Title>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1 text-muted-foreground hover:text-primary"><X className="size-4" /></Dialog.Close>
          </div>
          {done ? (
            <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">Thank you — it reached us. We read every one.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="What kind">
                {KINDS.map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${kind === k ? 'border-accent bg-accent/10 text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}>{label}</button>
                ))}
              </div>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5} aria-label="Your feedback"
                placeholder="Tell us what you were trying to do, and what happened."
                className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm leading-6 text-primary outline-none placeholder:text-muted-foreground focus:border-accent"
              />
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">We keep the page you are on ({path}) with it. Never your résumé or your scores.</p>
              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={send} disabled={pending || message.trim().length < 3} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{pending ? 'Sending…' : 'Send'}</button>
                {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function InboxBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [stored, setStored] = useState(true)

  // Loaded once, shortly after the page settles — a count for the bell, not a cost to the feed.
  useEffect(() => {
    const t = setTimeout(() => { loadInbox().then((r) => { if (r.ok) { setItems(r.items); setStored(r.stored) } }).catch(() => {}) }, 2500)
    return () => clearTimeout(t)
  }, [])
  const unread = (items ?? []).filter((i) => !i.read).length

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      const ids = (items ?? []).filter((i) => !i.read).map((i) => i.id)
      markInboxRead(ids).catch(() => {})
      setItems((cur) => (cur ?? []).map((i) => ({ ...i, read: true }))) // shown as read after this opening; the badge clears
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unread ? `Inbox, ${unread} unread` : 'Inbox'} title="Messages from Jobinko" className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-accent/60 hover:text-primary">
        <Bell className="size-4" />
        {unread > 0 ? <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary-foreground">{unread}</span> : null}
      </button>
      {open ? (
        <div role="region" aria-label="Inbox" className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover p-2 shadow-lg">
          {!stored ? <p className="p-3 text-xs leading-5 text-muted-foreground">Messages need a database update (0044) that has not been applied yet.</p> : null}
          {stored && (items ?? []).length === 0 ? <p className="p-3 text-xs leading-5 text-muted-foreground">Nothing yet. When Jobinko has something to tell you — a change that affects you, a thing worth a look — it appears here.</p> : null}
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {(items ?? []).map((m) => (
              <li key={m.id} className="p-3">
                <p className="text-sm font-semibold text-primary">{m.title}</p>
                <p className="mt-0.5 whitespace-pre-line text-xs leading-5 text-muted-foreground">{m.body}</p>
                {m.href ? <a href={m.href} className="mt-1.5 inline-block text-xs font-semibold text-accent">Open</a> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
