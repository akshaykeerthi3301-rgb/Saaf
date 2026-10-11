/**
 * Google sign-in without a redirect through Supabase.
 *
 * The redirect flow (supabase.auth.signInWithOAuth) sends the person to Google with Supabase's address as the
 * return URL, and Google's account chooser prints it: "to continue to adofdvkhdgifvmbuolcj.supabase.co". Founder,
 * 2026-10-11: that reads as a stranger's site and costs trust at the exact moment someone is deciding to sign in.
 * Google only replaces that line with the app's name once the app's branding is verified (which needs the domain
 * proven in Search Console and about a day), and Supabase's own custom domain is a paid add-on.
 *
 * Google Identity Services is the free route that works today: Google's button opens its own small window, the chooser
 * names the site the button sits on (jobinko.in), and the page receives a signed ID token. The server then hands that
 * token to Supabase (signInWithIdToken) — no redirect, no Supabase address on screen.
 *
 * The client id is the SAME one Supabase's Google provider already holds. It is public by design (it appears in every
 * Google button's page source); the secret never leaves Supabase.
 */
export const GOOGLE_CLIENT_ID = '977123641080-tbsu6ialfhg52p2ocua28hl80v8pd8kj.apps.googleusercontent.com'

/** A one-time value: the raw one goes to our server, its SHA-256 hex goes to Google, and Supabase checks they match. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}
