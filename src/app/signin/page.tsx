'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 text-foreground">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary"
        aria-label="Jobinko home"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </span>
        Jobinko
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary">
          Sign in
        </h1>

        <Button
          type="button"
          variant="ghost"
          className="mt-6 w-full"
          onClick={withGoogle}
          disabled={busy}
        >
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit}>
          <p className="mb-5 text-sm text-muted-foreground">No password.</p>
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
          <Button type="submit" className="w-full" disabled={busy || !email}>
            {busy ? 'Signing in…' : 'Continue'}
          </Button>
        </form>
      </div>
    </main>
  )
}
