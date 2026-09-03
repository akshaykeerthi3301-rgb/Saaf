'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { instantSignIn } from '@/app/actions/instant-signin'

/**
 * Instant sign-in (an email address, no verification round-trip) is the
 * default. Google is a second, equal-weight path — the one that actually
 * confirms ownership of the address, never auto-triggered, never
 * pre-selected, and the account chooser is forced every time
 * (prompt: 'select_account') so a candidate searching from a personal device
 * with a work Gmail also signed in isn't one click from the wrong account.
 *
 * No password anywhere — one less secret to leak.
 */
export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

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
    if (error) { setBusy(false); setError('Could not start Google sign-in. Try again, or use email below.') }
  }

  return (
    <main className="measure" style={{ paddingTop: 64, paddingBottom: 64, maxWidth: 480 }}>
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        Sign in
      </h1>

      <Button type="button" variant="ghost" onClick={withGoogle} disabled={busy}>
        Continue with Google
      </Button>

      <hr className="rule" style={{ margin: 'var(--space-md) 0' }} />

      <form onSubmit={submit}>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
          No password. Enter your email to sign in.
        </p>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" disabled={busy || !email}>
          {busy ? 'Signing in…' : 'Continue'}
        </Button>
      </form>
    </main>
  )
}
