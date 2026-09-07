# Architecture Audit — Saaf

**Date:** 2026-09-08 · **Scope:** repo root, `src/app/`, `src/lib/`, `src/components/`, plus `ingest/` and `scripts/` where they cross the app boundary
**Status:** read-only audit. No code was changed. Proposed tree in §4 is a proposal, not a migration.

---

## 0. Two corrections to the brief before anything else

**0.1 — There is no `app/`, `lib/` or `components/` at the repo root.** All application code lives under `src/`, with the `@/*` → `./src/*` path alias in `tsconfig.json`. Every path below is therefore `src/`-prefixed. This is correct and idiomatic; nothing to fix.

**0.2 — This codebase is not a dual-sided marketplace, and there is no employer side to separate.** I disagree with the framing in the request, and it matters because the proposed `app/(candidate)` / `app/(employer)` split would create one real folder and one empty one.

What the evidence says:

| Signal | Finding |
|---|---|
| Routes | 15 pages + 7 route handlers. **Zero** employer-facing routes. |
| Database | 21 migrations. Tables: `profiles`, `roles`, `role_requirements`, `gate_results`, `applications`, `refusal_reports`, `role_first_shown`, `boards`, `audit_daily`. **No employer/recruiter identity table.** |
| RLS | Every user policy filters on `auth.uid()` against a *candidate*. No employer role exists in the policy set. |
| `boards` table | Company hiring boards that are **scraped** by `ingest/`. Employers are data, not users. They have no account and never sign in. |
| `docs/PROJECT-STATE.md` | Locks the product as single-sided and candidate-first. The co-pilot half explicitly "does not apply on anyone's behalf." |

**Every route in the app is already the candidate side.** Wrapping it in `(candidate)` renames the whole app for the benefit of a second side that does not exist. §4 gives you the tree that reflects the real seams *plus* the exact place an employer side would attach if you decide to build one — so you get the future-proofing without the empty folder today.

**0.3 — A note on "fragmented after rapid AI generation."** It is less fragmented than you think. ESLint passes clean (exit 0), so there are **zero dead imports**. The real problems are four specific structural ones, listed in §2 and §3, plus one large one you already know about (`saaf-ai/`).

---

## 1. Every file and its primary responsibility

### 1.1 Repo root — configuration and boundary

| File | Responsibility |
|---|---|
| `package.json` | Deps and 15 npm scripts. Next 16.3.4, React 19.2.8, Tailwind 4, Supabase SSR, Zod 4, Vitest 4. |
| `tsconfig.json` | `@/*` → `./src/*`. **Excludes `saaf-ai`.** Strict mode on. |
| `eslint.config.mjs` | Two architectural guard rules (see §3.1) + `globalIgnores` for `saaf-ai/**`. |
| `next.config.ts` | Server Action body limit raised to 8 MB so a 5 MB résumé does not hit the 1 MB platform ceiling silently. |
| `vercel.json` | `bom1` region (Mumbai), 4 security headers, 4 cron schedules staged 21:00→03:00 UTC. |
| `vitest.config.mts` | Test runner config. |
| `postcss.config.mjs` | Tailwind 4 PostCSS plugin. |
| `sentry.client.config.ts` / `sentry.server.config.ts` | Sentry init, loaded lazily by `src/instrumentation*.ts`. |
| `.nvmrc` | Pins Node 22.23.2. |
| `.gitignore` | ProductOS selective-tracking rules + competitor-name exclusion patterns. |
| `.vercelignore`, `.env.local.example` | Deploy exclusions; env template. |
| `AGENTS.md`, `CLAUDE.md` | Agent operating instructions. |
| `saaf-ai/` (25 tracked files) | **A second, separate Next.js app.** See §2.1. |
| `saaf-ai.zip` (89 KB) | A zipped copy of the above. See §2.1. |
| `tsconfig.tsbuildinfo` (380 KB) | Build cache. Ignored by `.gitignore`, present on disk. |

### 1.2 `src/` — framework entry points (not imported by anything; Next.js/Node call them)

| File | Responsibility |
|---|---|
| `src/proxy.ts` | Next 16's renamed `middleware.ts`. Refreshes the Supabase session, redirects signed-out users to `/signin` on 5 matched path groups. Uses `getUser()` not `getSession()` (unspoofable). Documented as **UX, not security** — RLS is the real control. |
| `src/instrumentation.ts` | Server/edge Sentry registration + `onRequestError`. |
| `src/instrumentation-client.ts` | Browser Sentry, loaded on idle (140 KB gzipped kept off first paint). |
| `src/types/pdfjs-worker.d.ts` | Ambient type shim for the pdfjs worker import. |

### 1.3 `src/app/` — routes (15 pages, 7 handlers)

**Marketing — `(marketing)`, public, unauthenticated**

| Route | File | Responsibility |
|---|---|---|
| `/` | `(marketing)/page.tsx` | Landing page (262 lines). Renders `AuditStrip` + `AuthFragmentNotice`. |
| `/audit` | `(marketing)/audit/page.tsx` | Public index audit, nutrition-label form. `revalidate = 3600`. **Builds its own Supabase client inline — see §3.2.** |
| `/privacy` | `(marketing)/privacy/page.tsx` | Privacy doc. Imports `lib/parse/llm` to name the actual LLM provider — content derived from code, not duplicated prose. Good pattern. |
| `/terms` | `(marketing)/terms/page.tsx` | Terms doc. |

**Onboarding — `(onboarding)`, 5-step flow, all `'use client'`**

| Route | File | Responsibility |
|---|---|---|
| `/start` | `(onboarding)/start/page.tsx` | Entry; fires `onboarding_started`. |
| `/start/upload` | `.../upload/page.tsx` | Résumé upload (177 lines); calls `parseResume` action. |
| `/start/reading` | `.../reading/page.tsx` | Parse-in-progress screen; reads draft via `useDraft`. |
| `/start/confirm` | `.../confirm/page.tsx` | Parse-then-**confirm** screen (163 lines). Nothing is written until here. |
| `/start/matching` | `.../matching/page.tsx` | Calls `confirmProfile`, then scoring runs. |

**Signed-in app — `(app)`, guarded by `proxy.ts` + per-page `getUser()`**

| Route | File | Responsibility |
|---|---|---|
| `/today` | `(app)/today/page.tsx` | **606 lines — the largest file in the app.** The ranked shortlist. Fetches profile + `gate_results` + role count + `role_first_shown`, buckets, sorts, caps at 20 cards/bucket, renders. See §3.4. |
| `/applications` | `(app)/applications/page.tsx` | Kanban tracker data fetch; hands to `ApplicationBoard`. |
| `/profile` | `(app)/profile/page.tsx` | Profile fetch; hands 10 fields to `ProfileForm`. Cleanest page in the app — 45 lines, fetch-and-delegate. |
| `/resume` | `(app)/resume/page.tsx` | Shows *what was read* from the résumé. Deliberately not document storage (the file is deleted after parse). |
| `/copilot` | `(app)/copilot/page.tsx` | "Cookie" diagnostic: averages score components across the shortlist to show where points are lost. |

**Other routes**

| Route | File | Responsibility |
|---|---|---|
| `/signin` | `app/signin/page.tsx` | Client component. Instant email sign-in + Google OAuth. **Only file using the browser Supabase client.** |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth/magic-link exchange; routes to `/today` or `/start` by `confirmed_at`. |
| `/dev/bench` | `app/dev/bench/page.tsx` | Dev-only résumé bench. `notFound()` in production. |
| `app/layout.tsx` | — | Root layout. Self-hosted fonts (no Google CDN request — a deliberate privacy choice), favicons, `AnalyticsProvider`. |
| `app/globals.css` | — | Tailwind 4 theme + design tokens. |

**API — `app/api/`**

| Route | File | Responsibility |
|---|---|---|
| `/api/audit/today` | `api/audit/today/route.ts` | Public JSON audit. `revalidate = 3600`. **Third inline Supabase client — see §3.2.** |
| `/api/cron/ingest` | `api/cron/ingest/route.ts` | Ingest, 52s budget of 60s. |
| `/api/cron/recompute` | `api/cron/recompute/route.ts` | Rescore all confirmed profiles. |
| `/api/cron/audit` | `api/cron/audit/route.ts` | Write today's audit row. |
| `/api/cron/digest` | `api/cron/digest/route.ts` | Send daily digest emails. |
| `/api/dev-signin` | `api/dev-signin/route.ts` | Dev-only founder sign-in. **Sidesteps the ESLint service-role guard — see §3.1.** |

All four cron routes are 15-line wrappers over `cronRoute()` that dynamically import from `../../../../../ingest/*` — **five levels of `../` out of `src/`.** Structurally significant; see §4.

**Server Actions — `app/actions/` (11 files, all `'use server'`)**

| File | Responsibility |
|---|---|
| `applications.ts` | Tracker CRUD: `trackRole`, `setApplicationStatus`, `setApplicationDetail`, `removeApplication`. The only table with user-facing insert/update policies. |
| `confirm-profile.ts` | Zod-validated profile upsert, then triggers `evaluateUser`. The write that ends onboarding. |
| `parse-resume.ts` | Résumé → fields. Parses in memory; **never writes the file to storage.** |
| `tailor.ts` | Draft application material for one role via `lib/tailor`. |
| `role-catalogue.ts` | Role/domain counts for the combobox. |
| `report-refusal.ts` | "This score looks wrong" — idempotent on `(user_id, gate_result_id)`. |
| `instant-signin.ts` | Email-only sign-in; delegates the privileged half to `lib/instant-signin`. |
| `sign-out.ts` | Session sign-out (added 2026-09-07; before that the only exit was account deletion). |
| `delete-account.ts` | Irreversible delete; delegates to `lib/delete-user`. |
| `restart-onboarding.ts` | Clears `confirmed_at`. |
| `bench.ts` | Dev-only scoring bench. Repeats its own `NODE_ENV` check — correct, because an action is its own entry point. |

### 1.4 `src/lib/` — infrastructure and services

**Supabase clients — three intended flavours**

| File | Responsibility |
|---|---|
| `lib/supabase/browser.ts` | Anon key, browser. Used by exactly one file (`signin/page.tsx`). |
| `lib/supabase/server.ts` | Anon key + user cookies. **The workhorse — 17 import sites.** |
| `lib/supabase/service.ts` | **Service role. Bypasses RLS entirely.** Guarded by ESLint. 3 import sites, all in `lib/`. |

**Everything else in `lib/`**

| File | Responsibility |
|---|---|
| `lib/utils.ts` | `cn()` — clsx + tailwind-merge. |
| `lib/day.ts` | `istDay()` — today in Asia/Kolkata. Fixes a real bug where UTC made the index look stale 21.5h/day. |
| `lib/cron-route.ts` | Shared `CRON_SECRET` bearer check + timing + error envelope for all 4 cron routes. Good factoring. |
| `lib/analytics.ts` | Typed PostHog funnel (7 events, 1 retired). Dynamic import on idle; autocapture, session replay and remote config all **off** by design. |
| `lib/onboarding-store.ts` | sessionStorage draft + `useSyncExternalStore` plumbing. Unconfirmed data never touches the DB. |
| `lib/use-draft.ts` | 8-line hook wrapping the above. |
| `lib/evaluate-user.ts` | Recompute + persist one candidate's scores. **Service role.** |
| `lib/score-candidate.ts` | Score one candidate against the live index. Extracted so the bench runs the *real* pipeline. Calls the `roles_for_candidate` RPC with a documented fallback. |
| `lib/tailor.ts` | Drafts application material **and applies the grounding filter** that drops invented metrics/employers/credentials. The trust badge is earned here. |
| `lib/delete-user.ts` | Service-role auth-user deletion, isolated to one file. |
| `lib/instant-signin.ts` | Service-role token minting, isolated to one file. |
| `lib/parse/constants.ts` | `MAX_RESUME_BYTES` etc. Its own module because a `'use server'` file may only export async functions. |
| `lib/parse/extract.ts` | Deterministic résumé field extraction. |
| `lib/parse/llm.ts` | LLM-assisted extraction for skills/domain/scope. |
| `lib/parse/pdf.ts` | PDF → text, in memory, dynamic import of pdfjs legacy build. |
| `lib/parse/docx.ts` | DOCX → text via mammoth. 5 lines. |
| `lib/taxonomy/roles.ts` | Job domains → roles. Stops free-text `preferred_role` silently returning zero matches. |
| `lib/taxonomy/locations.ts` | Indian work-location taxonomy (361 lines). Fixes verbatim city substring matching. |

### 1.5 `src/gates/` and `src/match/` — the domain core

`src/gates/` is deliberately **pure and extractable** — an ESLint rule forbids it importing `registry/`, `ingest/` or any database module, so open-sourcing it is a directory move.

| File | Responsibility |
|---|---|
| `gates/types.ts` | `RequirementKind`, `CandidateProfile`, `GateResult`, `TypedRequirement`, `CONFIDENCE_THRESHOLD`. |
| `gates/evaluate.ts` | The gate engine. Pure function, no I/O. |
| `gates/extract.ts` | Requirement extraction from free-text JDs. Built against 211 real postings (handles U+2010/U+2011 hyphens, etc.). |
| `gates/title.ts` | Seniority implied by a job title. |
| `gates/reasons.ts` | **Templated** refusal/clearance reasons. No LLM in this path — that is what makes a reason checkable. |
| `gates/engineering.ts` | **DEAD — see §2.2.** |
| `gates/finance.ts` | **DEAD — see §2.2.** |
| `match/score.ts` | **652 lines.** Per-candidate weighted scoring, 5 components + caps. The scoring brain. |
| `match/function-gap.ts` | Flags candidates ranked without the requirement their function actually turns on. |

### 1.6 `src/components/`

**`components/ui/` — supposedly primitives**

| File | Lines | Responsibility |
|---|---|---|
| `ui/button.tsx` | 46 | CVA button. True primitive. |
| `ui/input.tsx` | 45 | Labelled input with error slot. True primitive. |
| `ui/combobox.tsx` | 244 | Base UI combobox wrapper. Borderline — large, but generic. |
| `ui/role-card.tsx` | **357** | **Not a primitive.** See §3.3. |

**`components/features/` — 17 files**

| File | Responsibility |
|---|---|
| `app-shell.tsx` | Signed-in chrome: nav, avatar, sign-out. Used by 6 pages. |
| `onboarding-shell.tsx` | Onboarding chrome + step indicator. |
| `doc-page.tsx` | Frame for privacy/terms/audit. |
| `profile-form.tsx` | The profile editor; calls 3 different server actions. |
| `application-board.tsx` | 5-column kanban (Saved→Applied→Interviewing→Offer→Closed). |
| `review-drawer.tsx` | "Review & Approve" — the tailored draft surface. Never submits anything. |
| `resume-bench.tsx` | Dev-only multi-résumé bench UI. |
| `role-input.tsx` / `location-input.tsx` / `skills-field.tsx` | Taxonomy-backed form fields. |
| `track-role.tsx` | Optimistic + **reconciled** bookmark button. |
| `report-score.tsx` | Optimistic + reconciled "this score looks wrong" flag. |
| `audit-strip.tsx` | Landing-page proof strip. **Server component with an inline Supabase client — see §3.2.** |
| `auth-fragment-notice.tsx` | Surfaces magic-link errors that arrive in the URL fragment. |
| `analytics-provider.tsx` | 8-line PostHog init. |
| `shortlist-viewed.tsx` | Fires `shortlist_viewed`. |
| `breakdown-engaged.tsx` | Fires `score_breakdown_opened` via one capture-phase listener for the whole list. |

### 1.7 Outside `src/` — the data pipeline

| File | Responsibility |
|---|---|
| `ingest/run.ts` | 603 lines. The daily ingest: registry sync → fetch boards → normalise → India filter → upsert → extract requirements → prune → recompute → audit. |
| `ingest/providers/index.ts` | One adapter per ATS provider (SmartRecruiters, Workday, etc.). |
| `ingest/providers/types.ts` | Adapter contract + `NormalisedRole`. |
| `ingest/classify.ts` | Corporate-vs-gig and function classification. |
| `ingest/dedupe.ts` | Collapses reposted requisitions (H&M listed one role 61×). |
| `ingest/paging.ts` | Works around PostgREST's silent 1,000-row cap. |
| `ingest/pool.ts` | 4-line bounded-concurrency map, isolated so DB-free scripts can use it. |
| `ingest/audit.ts` | Writes the daily audit row. |
| `ingest/digest.ts` | Daily digest email via Resend. Sends on empty days too, by design. |
| `ingest/recompute.ts` | Rescores every confirmed profile. Correctly delegates to `evaluateUser`. |
| `scripts/*.ts` (10 files) | Registry discovery/harvest/qualification, RLS verification, fixtures, seeding, gate auditing. |
| `registry/boards.json` | Curated board registry (tracked). |
| `registry/candidates.json` | Harvest output (gitignored, 4 MB+). |
| `supabase/migrations/*.sql` | 21 migrations. |

---

## 2. Unused components, duplicate utilities, dead imports

### 2.1 🔴 `saaf-ai/` — an entire second Next.js app, committed

| Fact | Detail |
|---|---|
| Tracked in git | **Yes — 25 files** (`git ls-files saaf-ai` returns 25) |
| Excluded from typecheck | Yes (`tsconfig.json` → `"exclude": ["saaf-ai"]`) |
| Excluded from lint | Yes (`eslint.config.mjs` → `globalIgnores`) |
| Own package manager | Yes — `pnpm-lock.yaml` (113 KB), while the real app uses npm |
| Duplicates | `app/layout.tsx`, `app/globals.css`, `lib/utils.ts`, `components/ui/button.tsx`, `public/*` icons |
| Unported screens | `app/dashboard/page.tsx`, `app/kanban/page.tsx`, `app/onboarding/page.tsx` |
| Plus | `saaf-ai.zip` (89 KB) — a zipped copy of the same thing, also at root |

This is **the single largest source of the "fragmented" feeling.** It is a v0 design export staged for porting. The port has largely happened — `application-board.tsx` and `layout.tsx` both cite it in comments as the design source — but the export was never removed, so the repo now carries two `layout.tsx`, two `globals.css`, two `lib/utils.ts` and two `button.tsx`. Anyone (human or agent) grepping the repo hits both.

**Recommendation:** diff the three unported screens against what shipped, extract anything still wanted, then delete `saaf-ai/` and `saaf-ai.zip` and remove both exclusion rules. The exclusions are the tell — they exist only because the folder should not be there.

### 2.2 🟡 Two genuinely dead modules in `src/gates/`

`gates/engineering.ts` and `gates/finance.ts` have **zero inbound imports** anywhere in `src/`, `ingest/` or `scripts/` — verified by full reverse-reference scan. Both are pure pass-throughs:

```
export function evaluateEngineering(profile, requirements): GateResult {
  return evaluate(profile, requirements)   // identical body in evaluateFinance
}
```

They are also **duplicates of each other** — same signature, same one-line body, different names. Written when the plan was per-function gate logic; `evaluate()` absorbed both. Their doc comments are genuinely valuable domain knowledge (why finance gates on a credential, not years) and should be preserved into `gates/evaluate.ts` before the files go.

### 2.3 🔴 Three inline Supabase clients that duplicate `lib/supabase/`

The same 6-line anon-key client is constructed by hand in three places, all querying `audit_daily`:

| File | Layer |
|---|---|
| `src/components/features/audit-strip.tsx` | **component** |
| `src/app/(marketing)/audit/page.tsx` | page |
| `src/app/api/audit/today/route.ts` | route handler |

Each imports `createClient` from `@supabase/supabase-js` directly, bypassing the three-client abstraction in `lib/supabase/`. They also duplicate the *query* — same table, same ordering, overlapping column sets, same "never render zeros" logic expressed three different ways.

This is your "duplicate utility function" finding. See §3.2 for why it is also a boundary problem.

### 2.4 🟡 Service-role client duplicated inside `ingest/`

`lib/supabase/service.ts` exists to be the one definition. `ingest/recompute.ts` uses it correctly. But `ingest/run.ts`, `ingest/audit.ts` and `ingest/digest.ts` each build their own:

```
createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, ...)
```

Four call sites, three of them hand-rolled. The hand-rolled ones also skip the helper's explicit missing-credentials error, so a misconfigured env fails with a confusing Supabase error instead of a clear one.

### 2.5 🟡 Two spellings for the same import across the `src/`↔`ingest/` boundary

| Same target, two paths | Files |
|---|---|
| `@/lib/evaluate-user` **and** `../src/lib/evaluate-user` | `ingest/recompute.ts` vs `scripts/*` |
| `@/lib/day` **and** `../src/lib/...` style | `ingest/audit.ts` vs `ingest/run.ts` |
| `../../../../../ingest/audit` | all 4 cron routes — five levels of `../` |

`ingest/` reaches into `src/` two different ways, and `src/` reaches into `ingest/` with deep relative traversal. Cosmetic today; it becomes a real problem the moment a file moves.

### 2.6 🟢 Dead imports: none

`npx eslint .` exits **0**. `eslint-config-next/typescript` flags unused imports and vars, and there are no violations. The AI-generation sessions did not leave import debris.

### 2.7 🟢 Unused components: none

All 4 `components/ui/` and all 17 `components/features/` files have at least one inbound import. All 11 server actions are called. All 7 route handlers are reachable (4 via `vercel.json` crons, 2 public, 1 dev-only).

One documented near-miss: `lib/analytics.ts` keeps the event `'withheld_section_engaged'` in its type union, fired by nothing. That is **deliberate** — the comment says it exists so historical PostHog data stays typed. Correct call; leave it.

---

## 3. Components bypassing server actions / API routes — direct, unsecured DB calls

Headline: **there is no candidate data leak.** No component queries `profiles`, `gate_results` or `applications` directly. Every candidate-data read goes through a server component or a server action that first calls `supabase.auth.getUser()`, and every table has an `auth.uid()`-scoped RLS policy. The findings below are boundary and guard-integrity problems, ranked by what they could actually cost you.

### 3.1 🔴 HIGH — `api/dev-signin/route.ts` defeats the ESLint service-role guard

The rule in `eslint.config.mjs` blocks `src/app/**` from importing `@/lib/supabase/service`. That rule is the codebase's stated architectural guarantee: *nothing under `src/app/` can reach a client that bypasses RLS.*

`src/app/api/dev-signin/route.ts:50` gets there anyway:

```
const { createClient: createAdmin } = await import('@supabase/supabase-js')
const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } })
```

It imports the **upstream package** rather than the guarded local wrapper, so the pattern-based rule never sees it. It then calls `admin.auth.admin.createUser()` and `admin.auth.admin.generateLink()` — full admin API, inside `src/app/`.

**Is it exploitable today?** No. There are three real guards: a `NODE_ENV === 'production'` early return (Vercel builds every deployment, previews included, in production mode), a hard-coded single email address with no parameter, and a genuine Supabase session rather than a forged one. The file documents all three.

**Why it still matters.** The protection moved from *structural* (a lint rule that cannot be forgotten) to *procedural* (a runtime check inside one file). A future route that copies this pattern gets no warning. The lint rule now reports clean on a file that does exactly the thing it exists to prevent — the guarantee is weaker than the config suggests.

**Fix (not applied):** extend the rule's `group` to include `"@supabase/supabase-js"` for `src/app/**`, forcing every app-layer client through `lib/supabase/`. Then `dev-signin` either moves to `lib/` behind a named dev-only export, or gets an explicit one-line `eslint-disable` with the reason — which makes the exception visible in the diff instead of invisible.

### 3.2 🟠 MEDIUM — a component reaches the database directly

`src/components/features/audit-strip.tsx` is a server component that builds a Supabase client and queries `audit_daily` inside the component body.

**Security impact: none.** `audit_daily` has `create policy "public read audit"` — the data is public by design, it is the landing page's proof, and it contains no user data. The anon key is public by design too. This is not a leak.

**Architectural impact: real.** It is the only component in the codebase that talks to a database, which breaks the otherwise-clean rule that data access lives in `app/` and components receive props. It has three consequences:

1. `AuditStrip` cannot be reused, tested or storybooked without a live database.
2. Its query is duplicated in two other files (§2.3), and the three have already drifted — `audit-strip` selects 3 columns, `audit/page.tsx` selects 4, the API route selects 4 with different downstream handling.
3. It is precedent. The next component that needs data has an in-repo example saying this is fine — and the next table may not be `audit_daily`.

**Fix (not applied):** one `lib/services/audit.ts` exporting `getLatestAudit()`. All three call sites use it; `AuditStrip` takes the result as a prop from `(marketing)/page.tsx`.

### 3.3 🟠 MEDIUM — layer inversion: `components/ui/` imports `components/features/`

`components/ui/role-card.tsx` (357 lines) imports:

```
@/components/features/report-score      ← feature layer
@/components/features/review-drawer     ← feature layer
@/components/features/track-role        ← feature layer
@/gates/types                           ← domain layer
@/match/score                           ← domain layer
```

`ui/` is meant to be the dependency-free bottom of the stack — the layer everything imports and that imports nothing but `lib/utils`. `button.tsx`, `input.tsx` and `combobox.tsx` all obey that. `role-card.tsx` inverts it: it sits in `ui/` while depending on the feature layer *and* the domain layer, and it embeds product logic (`bandFor()`, score-band thresholds, evidence rendering).

It is not a UI primitive. It is the single most product-specific component in the app, filed in the most generic folder. Concretely: you cannot extract `components/ui/` as a design-system package, and anyone told "reuse the primitives in `ui/`" will find a 357-line component that needs a `ScoreBreakdown`.

**Fix (not applied):** move to `components/features/role-card.tsx`. Pure move, no logic change.

### 3.4 🟡 LOW — `(app)/today/page.tsx` is a 606-line page doing four jobs

Four sequential Supabase queries (profile, `gate_results` + nested joins, role count, `role_first_shown`), then bucketing, sorting, new-role detection, evidence mapping and rendering — all in one file. Nothing is insecure; `getUser()` runs first and every query is RLS-scoped.

The cost is that the shortlist is the product's core surface and its scoring/bucketing logic is not independently testable — `src/match/` has three test files, this page has none. Extracting the four queries into `lib/services/shortlist.ts` would make the page a render function and the logic testable.

### 3.5 🟢 Correct-by-design patterns worth naming

Reviewing this codebase, these are done properly and should not be "cleaned up":

- **Every server action re-authenticates.** All 11 call `getUser()` themselves rather than trusting the page that called them. `bench.ts` even repeats its own `NODE_ENV` check with a comment explaining that an action is its own entry point. This is the right instinct.
- **Service role is isolated to exactly two files.** `lib/delete-user.ts` and `lib/instant-signin.ts` (plus `lib/evaluate-user.ts` for scoring). Nothing in `src/app/` imports it — §3.1's route is the one workaround.
- **`proxy.ts` uses `getUser()`, not `getSession()`.** `getSession()` reads the cookie without revalidating and is spoofable. Correctly documented as UX, not security.
- **Optimistic UI is reconciled, not fire-and-forget.** `track-role.tsx` and `report-score.tsx` both roll back on failure. The comment explains a real incident where a broken conflict target shipped unnoticed because the optimistic update could not fail.
- **Cron auth is factored once.** `lib/cron-route.ts` — four routes, one `CRON_SECRET` check, no copy-paste drift.
- **Résumé bytes are never persisted.** Parsed in memory, never written to storage, never logged. The `/resume` page is deliberately not document storage because that would break the promise.
- **Unconfirmed profile data never reaches the database.** It lives in sessionStorage until the confirm screen.

---

## 4. Proposed file structure

### 4.1 What this proposal does and does not do

It **does not** add `(candidate)` and `(employer)` groups — §0.2 explains why: one would hold the entire app and the other would be empty. It instead uses the seams that actually exist in this product, and marks the exact insertion point for an employer side.

Route groups `(name)` do not appear in URLs, so **every change below is URL-neutral.** No links break, no bookmarks break, no redirects needed.

### 4.2 Proposed tree

```
saaf/
├── src/
│   ├── proxy.ts                          # session refresh + route guard
│   ├── instrumentation.ts
│   ├── instrumentation-client.ts
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   │
│   │   ├── (marketing)/                  # public, unauthenticated
│   │   │   ├── page.tsx
│   │   │   ├── audit/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   └── terms/page.tsx
│   │   │
│   │   ├── (auth)/                       # NEW — signin currently sits loose at app/
│   │   │   ├── signin/page.tsx
│   │   │   └── callback/route.ts         # from app/auth/callback/  (URL: add a
│   │   │                                 #   redirect, or keep app/auth/callback/
│   │   │                                 #   as-is — this is the one URL-affecting move)
│   │   │
│   │   ├── (onboarding)/                 # unchanged — already correct
│   │   │   └── start/{,upload,reading,confirm,matching}/page.tsx
│   │   │
│   │   ├── (app)/                        # signed-in candidate surface
│   │   │   ├── today/page.tsx            # 606 → ~250 after §3.4 extraction
│   │   │   ├── applications/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── resume/page.tsx
│   │   │   └── copilot/page.tsx
│   │   │
│   │   ├── (dev)/                        # NEW — dev-only, one place, one guard
│   │   │   └── bench/page.tsx
│   │   │
│   │   ├── actions/                      # ← KEEP AT app/actions/. See §4.4.
│   │   │   ├── profile.ts                # confirm-profile + restart-onboarding
│   │   │   ├── applications.ts
│   │   │   ├── resume.ts                 # parse-resume + tailor
│   │   │   ├── auth.ts                   # instant-signin + sign-out + delete-account
│   │   │   ├── catalogue.ts              # role-catalogue
│   │   │   ├── feedback.ts               # report-refusal
│   │   │   └── bench.ts                  # dev-only
│   │   │
│   │   └── api/
│   │       ├── (public)/                 # unauthenticated JSON
│   │       │   └── audit/today/route.ts
│   │       ├── (cron)/                   # CRON_SECRET-guarded
│   │       │   └── {ingest,recompute,audit,digest}/route.ts
│   │       └── (dev)/
│   │           └── dev-signin/route.ts
│   │
│   ├── components/
│   │   ├── ui/                           # PRIMITIVES ONLY — no feature/domain imports
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── combobox.tsx
│   │   │
│   │   ├── features/
│   │   │   ├── role-card.tsx             # ← MOVED from ui/  (§3.3)
│   │   │   ├── review-drawer.tsx
│   │   │   ├── report-score.tsx
│   │   │   ├── track-role.tsx
│   │   │   ├── application-board.tsx
│   │   │   ├── profile-form.tsx
│   │   │   ├── role-input.tsx
│   │   │   ├── location-input.tsx
│   │   │   ├── skills-field.tsx
│   │   │   ├── resume-bench.tsx
│   │   │   ├── audit-strip.tsx           # now takes data as a PROP  (§3.2)
│   │   │   ├── auth-fragment-notice.tsx
│   │   │   ├── analytics-provider.tsx
│   │   │   ├── shortlist-viewed.tsx
│   │   │   └── breakdown-engaged.tsx
│   │   │
│   │   └── layouts/                      # NEW — chrome, not features
│   │       ├── app-shell.tsx
│   │       ├── onboarding-shell.tsx
│   │       └── doc-page.tsx
│   │
│   ├── lib/
│   │   ├── services/                     # NEW — the missing layer. See §4.3.
│   │   │   ├── audit.ts                  # getLatestAudit()      ← kills 3 duplicates
│   │   │   ├── shortlist.ts              # getShortlist()        ← unpacks today/page
│   │   │   ├── profile.ts                # getProfile/upsertProfile
│   │   │   ├── applications.ts           # tracker reads/writes
│   │   │   └── scoring.ts                # evaluate-user + score-candidate
│   │   │
│   │   ├── supabase/                     # THE ONLY place a client is constructed
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   └── service.ts
│   │   │
│   │   ├── parse/{constants,extract,llm,pdf,docx}.ts
│   │   ├── taxonomy/{roles,locations}.ts
│   │   ├── tailor.ts
│   │   ├── analytics.ts
│   │   ├── onboarding-store.ts
│   │   ├── use-draft.ts
│   │   ├── cron-route.ts
│   │   ├── day.ts
│   │   └── utils.ts
│   │
│   ├── gates/                            # PURE — publishable as-is
│   │   ├── types.ts
│   │   ├── evaluate.ts                   # absorbs engineering.ts + finance.ts docs
│   │   ├── extract.ts
│   │   ├── title.ts
│   │   └── reasons.ts
│   │                                     # engineering.ts, finance.ts  ← DELETED (§2.2)
│   │
│   └── match/{score,function-gap}.ts
│
├── ingest/                               # unchanged — separate runtime, correctly outside src/
│   ├── run.ts, audit.ts, digest.ts, recompute.ts
│   ├── providers/{index,types}.ts
│   └── {classify,dedupe,paging,pool}.ts
│
├── scripts/                              # unchanged
├── supabase/migrations/                  # unchanged
├── registry/                             # unchanged
├── docs/                                 # unchanged
│
└── ✂️  saaf-ai/  and  saaf-ai.zip        ← DELETED (§2.1)
```

### 4.3 `lib/services/` — the layer you asked for, and what it is actually for

You asked for `lib/services`. It is the right call, and here is the concrete reason rather than the general one.

Right now the answer to *"how do I read the latest audit row?"* is written three times in three layers (§2.3), and the answer to *"how do I build a candidate's shortlist?"* exists only inside a 606-line page (§3.4). A service layer is one file per **question the product asks the database**, and both problems collapse into it.

The rule that keeps it honest:

> **`app/` and `components/` never call `supabase.from()`. Only `lib/services/` does.**

That single rule is mechanically enforceable with the ESLint pattern you already use for `lib/supabase/service`, and it delivers four things at once:

| Benefit | How |
|---|---|
| Kills §2.3 | `getLatestAudit()` — one definition, three callers. |
| Kills §3.2 | `AuditStrip` receives a prop; no component touches a database. |
| Kills §3.4 | `getShortlist(userId)` is testable; the page just renders. |
| Enforces §3.1 | With `@supabase/supabase-js` blocked in `app/`, no route can hand-roll an admin client. |

**Learning Note — service layer:** a thin module whose only job is to answer one data question ("give me this user's shortlist") and hand back plain objects. Pages ask it for data and render; they never write queries. It is the difference between *"the shortlist logic lives in the shortlist page"* and *"the shortlist logic lives in one file that the page, a test, and a future mobile app can all call."*

### 4.4 Server actions stay at `app/actions/` — deliberately

You listed `app/api/(core)`. I'd push back on consolidating there. In the App Router, Server Actions and Route Handlers are different mechanisms with different security properties:

| | Server Action | Route Handler |
|---|---|---|
| Invocation | Called as a function from a component; Next generates the endpoint | A public HTTP URL |
| Attack surface | No hand-written URL to guess or fuzz | Anyone can `curl` it |
| Current use | All 11 candidate mutations | Only crons + one public JSON + one dev route |

Moving mutations to route handlers would turn 11 function calls into 11 public URLs, each needing its own auth check written by hand — replacing a structural guarantee with a procedural one, which is exactly the §3.1 failure. Keep them at `app/actions/`, consolidated 11 files → 7 by domain.

`api/` keeps its three groups — `(public)`, `(cron)`, `(dev)` — so the auth model of any handler is visible from its path. That is the useful half of your `(core)` idea.

### 4.5 Where an employer side would attach

If a second side is genuinely on the roadmap, it does **not** need today's routes renamed. Everything above stays put, and you add:

```
src/app/
├── (app)/          # candidate — today's routes, untouched
└── (employer)/     # NEW: post/, pipeline/, candidates/
```

The prerequisites are database work, not folder work, and each is a real decision:

1. An employer/recruiter identity table + a `role` discriminator on the account.
2. A **second RLS policy set**. Every current policy assumes `auth.uid()` is a candidate; an employer reading candidate data needs its own explicitly-scoped policies. This is where a dual-sided product leaks if rushed.
3. A consent model — `docs/PROJECT-STATE.md` already parks "B2B discoverability" pending exactly this.
4. `proxy.ts` gains side-aware routing.

Until (1)–(3) exist, adding `(employer)/` creates a folder with nothing legal to put in it.

### 4.6 Sequencing

Ordered by value-per-unit-of-risk. Each step is independently shippable.

| # | Change | Risk | Why now |
|---|---|---|---|
| 1 | Delete `saaf-ai/` + `saaf-ai.zip`; drop both exclusion rules | None — already excluded from build | Removes the largest source of duplication in one commit |
| 2 | Delete `gates/engineering.ts` + `gates/finance.ts`, fold their doc comments into `evaluate.ts` | None — zero inbound imports | Keeps `gates/` genuinely publishable |
| 3 | Move `ui/role-card.tsx` → `features/role-card.tsx` | Very low — one import path | Makes `components/ui/` an extractable design system |
| 4 | Add `lib/services/audit.ts`; rewire all 3 call sites; `AuditStrip` takes a prop | Low — public data, well covered by the page rendering | Fixes §2.3 and §3.2 together |
| 5 | Extend the ESLint rule to block `@supabase/supabase-js` in `src/app/**` and `src/components/**` | Low — will flag `dev-signin`, which is the point | Restores the structural guarantee from §3.1 |
| 6 | Extract `lib/services/shortlist.ts` from `today/page.tsx` | Medium — core surface, currently untested | Do it **with tests**, not before |
| 7 | Consolidate 11 actions → 7; add `(auth)`, `(dev)`, `api/(public|cron|dev)` groups | Low, but wide diff | Cosmetic; do it last, when nothing else is in flight |
| 8 | Normalise the `src/`↔`ingest/` import paths (§2.5) | Low | Best done alongside 7 |

Steps 1–3 are pure deletion and one file move. If you only do those, the repo stops feeling fragmented and nothing can break.

---

## Appendix — how the findings were verified

| Claim | Method |
|---|---|
| Zero dead imports | `npx eslint .` → exit 0 |
| Orphaned modules | Full reverse-reference scan of every `from '...'` across `src/`, `ingest/`, `scripts/` |
| Direct DB calls | `grep -rn "\.from(" src/` — 34 call sites, each read and classified by layer |
| Service-role reachability | `grep -rn "supabase/service\|SERVICE_ROLE" src/` — 6 hits, each traced |
| RLS coverage | `grep "create policy\|enable row level" supabase/migrations/*.sql` — 9 tables, 7 policies |
| `saaf-ai/` tracked | `git ls-files saaf-ai \| wc -l` → 25 |
| Auth on every action | `grep -rn "auth.getUser" src/` — 18 hits vs 11 actions + 6 pages + proxy |
