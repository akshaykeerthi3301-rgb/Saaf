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
# ⚠️ NEVER MOVE THE REPO'S OWN .git. Stage a copy without it and deploy from
# there. Confirmed again 2026-09-07: a plain `vercel deploy --prod` from the
# repo sat at status UNKNOWN with a 0 ms build for fifteen minutes; the same
# tree staged without .git was Ready in under two minutes.
#
# --prebuilt does NOT work from a partial copy: the traced bundle reaches back
# into node_modules and .next by path, so it fails on the first file it cannot
# find. Copy the sources and let Vercel build.
SP=/tmp/saaf-deploy && rm -rf $SP && mkdir -p $SP
#
# ⚠️ rsync DOES NOT READ .gitignore. Every exclude here must be written out, and
# anything gitignored-but-on-disk is staged unless it is named. On 2026-09-14
# this list was missing `bench`, and staged nine of the founder's real résumés
# from bench/corpus/real/ into a world-readable /tmp directory ready for upload.
# `.vercelignore` now also carries `bench/` — two layers, because the staged copy
# sitting in /tmp is its own exposure even if Vercel never receives it.
rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.next' \
  --exclude '.claude' --exclude 'productos' --exclude 'saaf-ai' --exclude 'docs' \
  --exclude 'bench' --exclude 'extension' \
  --exclude 'registry/candidates.json' --exclude '.env' --exclude '.env.*' \
  ./ $SP/

# Prove it before you deploy — this should print nothing:
find $SP -path '*corpus*' -o -name '.env*' -o -name '*.pem'
(cd $SP && npx vercel deploy --prod)

# Permanent fix — after this, plain `npx vercel --prod` works:
#   Vercel → Account Settings → Emails → add
#   275312729+akshaykeerthi3301-rgb@users.noreply.github.com
```

### ⚠️ "Not authorized" does not mean what it says

Observed 2026-09-08. `vercel deploy --prod` returned:

```
{ "status": "error", "reason": "deploy_failed", "message": "Not authorized" }
```

…while `npx vercel whoami` succeeded and `npx vercel project ls` listed `saaf`
at its correct production URL. It is **not** a scope or account problem — the
message sends you looking for one. Re-linking proved it: the refreshed
`.vercel/project.json` carried the SAME `projectId` and the SAME `orgId` as the
one already on disk. What actually changed was the credential.

**The fix is to re-link, which downloads a fresh `VERCEL_OIDC_TOKEN`:**

```bash
cd /tmp/saaf-deploy && rm -rf .vercel && npx vercel link --yes --project saaf
```

Then retry the deploy. It succeeded on the first attempt afterwards.

Do NOT respond to this error by creating or linking a second project. `saaf` →
`https://saaf-ten.vercel.app` is the only one; a second would split the domain
and the environment variables.

### ⚠️ `vercel link` writes a token into the staged copy — delete it

`vercel link` creates a `.env.local` containing a freshly downloaded
`VERCEL_OIDC_TOKEN`. The rsync above excludes `.env.*`, but the link step runs
**after** the copy, so following these steps in order stages a credential file
for upload. Remove it before deploying:

```bash
rm -f /tmp/saaf-deploy/.env.local
```

Deployment env vars come from the Vercel project, never from a staged file, so
nothing needs it.

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

**⚠️ ONE PROJECT, ONE DOMAIN — `saaf` → `https://saaf-ten.vercel.app`.**
On 2026-09-07 a second Vercel project, `saaf-i9`, was found serving the v0
design export under the Saaf name. It had no `/signin` and no `/start`, and it
answered `/today`, `/applications` and `/profile` with **200 to anonymous
visitors** — a shortlist rendered to the open internet. It also ran in `iad1`
rather than `bom1`. It was deleted. Deploying this repo anywhere but the `saaf`
project recreates the split, and the split is what produced the exposure: two
origins, one of which nobody was maintaining. `saaf-ai/` is a design reference,
is in `.vercelignore`, and is not deployable.

### Cron

Four separate daily crons, one per pipeline stage — see `vercel.json`. JSON
carries no comments, so the schedule reasoning lives here.

| Path | UTC | IST | Why here |
|---|---|---|---|
| `/api/cron/ingest` | `0 21 * * *` | ~02:30 | Fetches boards. Owns 52s of its own 60s function |
| `/api/cron/recompute` | `0 23 * * *` | ~04:30 | Rescores every profile against what the ingest just wrote |
| `/api/cron/audit` | `0 1 * * *` | ~06:30 | Publishes the figures on `/audit`, after scoring is settled |
| `/api/cron/digest` | `0 3 * * *` | ~08:30 | The only stage a person experiences; scheduled for the Indian morning |

**Why split.** They were one call to `runAll()` inside a single 60-second
function, so the four stages competed for one budget and the last of them
silently did not happen on a slow night. Hobby allows **100 cron jobs per
project**, each limited to once a day with ±59 minutes of scheduling jitter —
hence the two-hour gaps, which are jitter margin rather than an estimate of
stage duration.

`npm run ingest` still runs all four in sequence locally, and that is the
verification path.

### Growing the registry

```bash
npm run registry:harvest                      # Common Crawl → registry/candidates.json
npm run registry:qualify -- --limit 2000      # probe candidates → registry/boards.json
git diff registry/boards.json                 # read this before committing
npm run ingest
```

The harvest reads Common Crawl's URL index; it touches no employer's server.
Qualification calls each company's own public ATS API and keeps a board only if
it returns a live India role. Nothing is ever auto-removed — deactivation is the
daily ingest's decision, made on its own evidence.

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

## The digest cron is deliberately absent

`/api/cron/digest` was removed from `vercel.json` on 2026-09-08, when the daily
digest was parked (`docs/PROJECT-STATE.md` → Parked). The route still exists and
still works; nothing about the feature was deleted.

⚠️ **IT WAS REMOVED SO A PARKED FEATURE DOES NOT FAIL NIGHTLY.** With no verified
Resend domain, a send to anyone but the founder is rejected. The moment the first
Google beta user signs up they are marked `email_verified` and become a digest
recipient, so the cron would have started reporting a failed send every night —
for something deliberately switched off. A red cron that is expected to be red
trains you to ignore the ones that are not.

**To turn the digest back on:** restore the entry with schedule `0 3 * * *`, after
the three reversal conditions in PROJECT-STATE are met — a verified domain, more
users than can be messaged by hand, and a week of real per-candidate discovery
data. That data may say weekly rather than daily; the board rotation is ~8 days.
