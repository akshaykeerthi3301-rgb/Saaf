'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Magic link only. No password and no social provider — a password is another
 * secret to leak, and a Google or LinkedIn sign-in would tie a job search to an
 * identity the candidate is specifically hiding it from.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(undefined)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (error) setError('We could not send that link. Try again in a moment.')
    else setSent(true)
  }

  return (
    <main className="measure" style={{ paddingTop: 64, paddingBottom: 64, maxWidth: 480 }}>
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        {sent ? 'Check your email' : 'Sign in'}
      </h1>

      {sent ? (
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)' }}>
          We sent a link to {email}. It works once and expires in an hour.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
            No password. We send a link that signs you in.
          </p>
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button type="submit" disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send me a link'}
          </Button>
        </form>
      )}
    </main>
  )
}
