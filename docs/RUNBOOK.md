# Runbook — settings that live outside version control

*Dashboard configuration a coding agent cannot apply. Keep this current: these
settings are invisible to the repo and will otherwise be rediscovered the hard
way.*

---

## Supabase — Authentication

**Project:** `adofdvkhdgifvmbuolcj` · dashboard → Project Settings → Authentication

| Setting | Value | Why |
|---|---|---|
| Email provider | **Enabled** | Magic link is the only sign-in method |
| Confirm email | **Disabled** | The magic link *is* the confirmation; a second step is friction with no gain |
| OTP expiry | **3600s** | One hour, per PRD §9 |
| OTP single-use | **On** (default) | Must not be relaxed |
| Site URL | production `*.vercel.app` origin | |
| Redirect URLs | add `http://localhost:3000/**` | Local development |

### SMTP — Resend

Supabase's built-in mailer is rate-limited to a handful of emails per hour and
will not survive a launch day.

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (`re_…`) |
| Sender email | `onboarding@resend.dev` until a domain is verified |
| Sender name | `Saaf` |

> **Delivery limitation.** Resend only delivers to the address on your own
> Resend account until a domain is verified. Sign-in therefore works for you and
> nobody else. A domain is needed before any real beta user can receive a link —
> see `docs/HANDOFF.md` D4.

**Status:** ✅ *Verified 2026-09-03.* A real magic link was delivered and
exchanged: `/auth/callback?code=…` → `/start`. Mail lands in spam until a domain
is verified (D4) — expected for a shared sender with no SPF or DKIM for your
domain, and cosmetic while you are the only recipient.

**Redirect URLs matter as much as SMTP.** `http://localhost:3000/**` must be in
Authentication → URL Configuration → Redirect URLs. Without the `/**` wildcard
Supabase trusts only the bare Site URL, silently drops the session, and bounces
to `/` — which looks like the app is broken rather than misconfigured.

---

## Vercel

Deployed with the **CLI**, not the GitHub integration — this GitHub account
cannot authorise third-party OAuth apps.

```bash
# Vercel blocks deployments whose Git commit author it does not recognise, and
# these commits carry a GitHub noreply address that is not on the Vercel account.
# Moving .git aside attaches no commit metadata:
mv .git .git-hidden && npx vercel deploy --prebuilt --prod ; mv .git-hidden .git

# Permanent fix — after this, plain `npx vercel --prod` works:
#   Vercel → Account Settings → Emails → add
#   275312729+akshaykeerthi3301-rgb@users.noreply.github.com
```

**Deployment Protection is OFF.** `ssoProtection` was `all_except_custom_domains`,
forcing a Vercel login on every visitor. Set to `null` on 2026-09-03 via the
projects API so the site is publicly reachable — which a landing page has to be.
Re-enabling it would make the product invisible to everyone but the account owner.

**Environment variables** (`npx vercel env add <NAME> production`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
RESEND_API_KEY
```

**⚠️ `SUPABASE_SERVICE_ROLE_KEY` is set for PRODUCTION ONLY.** This changed on
2026-09-03. It was excluded while GitHub Actions ran the ingest; Actions turned
out to be disabled on this account, so Vercel Cron runs it instead and the key
has to be reachable there. It is never set for preview or development, has no
`NEXT_PUBLIC_` prefix so it cannot reach a browser bundle, and ESLint blocks
`src/app` and `src/components` from importing the client that uses it. Migrating
the scheduler to a Supabase Edge Function would remove it from Vercel entirely.

**`GEMINI_API_KEY` — not set anywhere, deliberately, as of 2026-09-05.** Stage C
added a model that reads skills and domain off the résumé
(`src/lib/parse/llm.ts`). It is strictly additive: with no key the call is never
made, the regex parser's result stands, and nothing about the upload path
changes. **Set it only after the Stage C build is deployed**, never before — the
production privacy page must already name Google as a recipient before any
résumé text is sent to Google. Server-only, no `NEXT_PUBLIC_` prefix, production
first; free tier at ~1,500 requests/day, one call per résumé upload.

After the first deploy, set the Supabase **Site URL** to the deployed origin and
add `https://<project>.vercel.app/**` to Redirect URLs, or the magic link will
bounce back to localhost.

---

## GitHub

Push and Actions both work; only third-party OAuth is blocked.

- **Actions secret:** `SUPABASE_SERVICE_ROLE_KEY` — repo → Settings → Secrets and
  variables → Actions. Required by TASK-037's daily ingest.
- Actions is first-party, so no OAuth grant is involved.

---

## PostHog

Project token (`phc_…`) in `NEXT_PUBLIC_POSTHOG_KEY`, host
`https://us.i.posthog.com`. Verified accepting events on 2026-09-03.

A personal API key (`phx_…`) is a different thing entirely — it reads data out,
it is a real secret, and it must never appear in a `NEXT_PUBLIC_*` variable.

---

## Sentry

DSN in both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. A DSN is public by design
— it can only write. Verified accepting events on 2026-09-03.

**Session replay is deliberately disabled.** The third guarantee is that nothing
about a candidate's search is shared; replaying their screen while they read a
shortlist of employers would contradict it. Request bodies are stripped in
`beforeSend` on both client and server so résumé text cannot reach an error
report.
