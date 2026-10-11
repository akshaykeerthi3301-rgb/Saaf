'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { instantSignIn } from '@/app/actions/instant-signin'
import { GOOGLE_CLIENT_ID, makeNonce } from '@/lib/google-signin'

/**
 * Instant sign-in (an email address, no verification round-trip) is the
 * default. Google is a second, equal-weight path — the one that actually
 * confirms ownership of the address, never auto-triggered, never
 * pre-selected, and the account chooser is forced every time
 * (prompt: 'select_account') so a candidate searching from a personal device
 * with a work Gmail also signed in isn't one click from the wrong account.
 *
 * No password anywhere — one less secret to leak.
 *
 * GOOGLE RUNS THROUGH GOOGLE'S OWN BUTTON, NOT A REDIRECT (founder, 2026-10-11): the redirect flow made Google's
 * chooser say "to continue to adofdvkhdgifvmbuolcj.supabase.co". The button opens Google's small window, which names
 * this site, and hands the page a signed token that /auth/google gives to Supabase (src/lib/google-signin.ts). The old
 * redirect remains as the fallback when Google's script cannot load (an ad blocker, a corporate network).
 *
 * LAID OUT AS A NORMAL SIGN-IN PAGE (founder's reference image, 2026-10-09): wordmark top-left, a bold heading, the
 * email field first, one primary Continue, "or", then Google with its own logo, then the terms line. Before this the
 * Google button was a bare text button above the email field and the page read as unfinished. Shapes stay inside the
 * design system's scale (rounded-xl controls, rounded-2xl card) and colours stay tokens.
 */

type GoogleIdApi = {
  initialize: (o: { client_id: string; nonce: string; ux_mode: 'popup'; callback: (r: { credential: string }) => void }) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleIdApi } } }
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [gisReady, setGisReady] = useState(false)
  const [gisFailed, setGisFailed] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)
  const nonce = useRef<string>('')

  useEffect(() => {
    let cancelled = false
    const fail = () => { if (!cancelled) setGisFailed(true) }
    const start = async () => {
      const g = window.google?.accounts?.id
      if (!g || !googleSlot.current) return fail()
      const n = await makeNonce()
      nonce.current = n.raw
      g.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: n.hashed,
        ux_mode: 'popup',
        callback: async (resp) => {
          setBusy(true); setError(undefined)
          const r = await fetch('/auth/google', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ credential: resp.credential, nonce: nonce.current }),
          }).catch(() => null)
          const j = (await r?.json().catch(() => null)) as { ok?: boolean; path?: string } | null
          if (j?.ok && j.path) { window.location.assign(j.path); return }
          setBusy(false)
          setError('Google sign-in did not finish. Try again, or use your email above.')
        },
      })
      g.renderButton(googleSlot.current, { type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: Math.max(200, Math.min(400, Math.floor(googleSlot.current.parentElement?.clientWidth ?? 360))) })
      if (!cancelled) setGisReady(true)
    }
    if (window.google?.accounts?.id) { void start(); return () => { cancelled = true } }
    const tag = document.createElement('script')
    tag.src = 'https://accounts.google.com/gsi/client'
    tag.async = true
    tag.onload = () => { void start() }
    tag.onerror = fail
    document.head.appendChild(tag)
    const t = setTimeout(() => { if (!window.google?.accounts?.id) fail() }, 8000)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(undefined)
    const res = await instantSignIn(email)
    if (!res.ok) { setBusy(false); setError(res.error); return }
    router.push(res.path)
  }

  async function withGoogle() {
    setBusy(true); setError(undefined)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    // Reached only on a synchronous failure (provider not enabled, network
    // failure before redirect) — on success the browser navigates away
    // before this line runs.
    if (error) { setBusy(false); setError('Could not start Google sign-in. Try again, or use your email above.') }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-24 text-foreground">
      {/* A soft glow behind the card, from the accent token — the reference's warm wash, in this system's colours. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[56rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

      <Link
        href="/"
        className="absolute left-5 top-6 flex items-center gap-2.5 text-base font-semibold tracking-[-0.03em] text-primary sm:left-10 sm:top-8"
        aria-label="Jobinko home"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </span>
        Jobinko
      </Link>

      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.045em] text-primary sm:text-4xl">
          Sign in to Jobinko
        </h1>

        <form onSubmit={submit} className="mt-8">
          <Input
            label="Your email address"
            hideLabel
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Your email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            className="py-4 text-base"
          />
          <Button type="submit" className="-mt-1 w-full py-4 text-base" disabled={busy || !email}>
            {busy ? 'Signing in…' : 'Continue'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Google's own button (see the note at the top). The slot is reserved at full size so the card does not jump when it loads. */}
        <div className={gisFailed ? 'hidden' : 'flex min-h-11 justify-center'} aria-busy={!gisReady}>
          {/* color-scheme light: Google's frame is light, and on this dark page the browser otherwise paints a white backing behind it. */}
          <div ref={googleSlot} style={{ colorScheme: 'light' }} className={busy ? 'pointer-events-none opacity-60' : undefined} />
        </div>
        {gisFailed ? (
          <Button type="button" variant="ghost" className="w-full gap-3 py-4 text-base" onClick={withGoogle} disabled={busy}>
            {/* Google's brand colours must stay exactly as Google draws them, so the logo is a static file (public/google-g.svg), not a component with colours in it. */}
            <Image src="/google-g.svg" alt="" width={20} height={20} className="size-5 shrink-0" unoptimized />
            Continue with Google
          </Button>
        ) : null}

        <p className="mt-8 text-center text-sm leading-6 text-muted-foreground">
          By continuing, you agree to Jobinko’s{' '}
          <Link href="/terms" className="font-semibold text-primary underline underline-offset-4">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="font-semibold text-primary underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}
