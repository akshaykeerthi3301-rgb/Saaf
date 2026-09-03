'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * Magic-link failures arrive in the URL fragment, which never reaches the
 * server — so without this the app silently renders the home page and the
 * candidate has no idea why they are not signed in.
 *
 * Saying "this link was already used" is the difference between a product that
 * looks broken and one that tells you what happened. Read through
 * useSyncExternalStore because the hash is genuinely external state, and
 * reading it in an effect would trigger a cascading render.
 */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

let cachedHash: string | null = null
let cachedMsg: string | undefined

function snapshot(): string | undefined {
  const hash = window.location.hash
  if (hash === cachedHash) return cachedMsg
  cachedHash = hash

  const p = new URLSearchParams(hash.slice(1))
  const code = p.get('error_code')
  const err = p.get('error')
  cachedMsg = !code && !err
    ? undefined
    : code === 'otp_expired'
      ? 'That sign-in link had already been used, or it expired. Links work once and last an hour — request a fresh one.'
      : `Sign-in didn't complete (${code ?? err}). Request a fresh link.`
  return cachedMsg
}

const serverSnapshot = () => undefined

export function AuthFragmentNotice() {
  const msg = useSyncExternalStore(subscribe, snapshot, serverSnapshot)

  // Clearing the fragment is a genuine external-system sync, which is what
  // effects are for.
  useEffect(() => {
    if (msg) history.replaceState(null, '', window.location.pathname)
  }, [msg])

  if (!msg) return null

  return (
    <div style={{
      border: '1px solid var(--color-outline)', padding: 'var(--space-md)',
      marginBottom: 'var(--space-lg)', fontSize: 'var(--type-body-md-size)',
    }}>
      <p style={{ margin: '0 0 8px', color: 'var(--color-on-surface)' }}>{msg}</p>
      <a href="/signin" style={{ textDecoration: 'underline' }}>Send me a new link</a>
    </div>
  )
}
