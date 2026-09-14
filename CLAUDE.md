# CLAUDE.md

## ⚡ Start here: read `docs/PROJECT-STATE.md` first

This is **Saaf** — a free, ₹0, India-first job-matching product. Portfolio artifact built like a real product. No auto-apply. (The repo directory is still `jobmatch`; that's a path, not the brand.)

`docs/PROJECT-STATE.md` carries the locked decisions, the live-probed technical facts, and the current phase. Read it before proposing anything — several decisions in it were made deliberately and against the obvious default (no LinkedIn/Naukri sourcing; never gate users out; gates typed per function rather than years-only; the founder's personal job tracker is never publishable). Re-deriving or reversing them silently is the main failure mode for a fresh session here.

<!-- BEGIN PRODUCTOS -->
## This repo runs on ProductOS

- The product strategy system lives in `productos/` — checklists, templates, and skills. The strategy docs are the source of intent; don't guess at product decisions the docs already answer.
- **`productos/` is selectively gitignored.** ProductOS's own material (templates, checklists, BONUS docs, skills) is untracked — it's licensed, not public. The founder's filled-in work products in `productos/define/` and `productos/design/` **are** tracked. Adding a new work product there means adding a `!` line to `.gitignore`, or it silently won't be versioned.
- The programme plan is `docs/PLAN.md`, when present (adopted at setup by `studio-setup`) — consult it before starting any phase work.
- The canonical product documents live in `docs/` at the repo root (`PRODUCT.md`, `DESIGN.md`, `PRD.md`, `ROADMAP.md`, `LAUNCHES.md`, `SECURITY-AUDIT.md`, …). ProductOS skills write them; they may sit alongside the repo's own docs.
- Build-loop plan files are `docs/ROADMAP.md` and `docs/REFACTOR.md` — never `docs/PLAN.md` (the programme plan, no checkboxes) and never `productos/*-CHECKLIST.md`.
- Full system orientation: `productos/AGENTS.md`.
<!-- END PRODUCTOS -->

## ⚑ How every Saaf session ends

**Non-negotiable, and it applies to every session regardless of what was asked.**
Founder instruction, 2026-09-15. A session that does good work and leaves no
trace of where things stand costs the next session the time it takes to
rediscover it — which is what `docs/HANDOFF.md` has already had to be corrected
for twice.

Before your final message, do these three things **in the repository**, not only
in the reply:

1. **Tick the boxes.** `docs/ROADMAP.md` is the tracked surface — its own header
   says the agent MUST mark tasks `- [x]` as they are finished. Update the
   `**Status:**` count in the same edit. If the work was not on the roadmap, add
   the task, then tick it. Work that is not in the roadmap did not happen as far
   as the next session can tell.
2. **Record the *why* in `docs/PROJECT-STATE.md`** when a decision, a
   measurement, or a reversal came out of the work. Numbers with the date they
   were measured. A correction goes in struck through, never deleted — the
   mistake is usually worth more than the sentence was.
3. **Update `docs/HANDOFF.md`** if anything now needs the founder: a migration to
   apply, a deploy to run, an account only they hold. Say what is *live*, not
   what is *written* — committing is not shipping, and that distinction has been
   got wrong here before.

Then close the reply itself with two short sections, in this order:

- **Progress** — what moved, with the roadmap count (`Phase 8 — n/13`) and the
  measured numbers behind any claim.
- **Next steps** — what comes next, and **separately, what only the founder can
  do.** Those two lists are different and merging them is how the founder-only
  items get deferred through five phases, which has already happened.

⚠️ **State what was verified and how.** "Tests pass" is not "it works in the
browser", and "committed" is not "deployed". If something is unverified, say
`unverified`. This repository has been given confident wrong answers by grepping
served HTML three times; the standing rule is to open the page.


<!-- BEGIN ARCHITECTURE -->
## Architecture invariants

Five rules. Breaking one is a defect, not a style preference. Each says how it is
enforced — where enforcement is partial, that is stated rather than implied, so a
fresh session can trust the rule instead of discovering it is aspirational.

Full reasoning, with the defects that motivated each: `docs/ARCHITECTURE-AUDIT.md`.

**Counts below were measured on 2026-09-08** (24 legacy query sites, 11 server
actions, 8 of 11 re-authenticating, 0 `any` types). They will drift. If one
disagrees with the codebase, the codebase is right — re-measure and correct this
file rather than working around it. The *rules* do not drift; only the numbers.

### 1. Application code lives in `src/`, imported with `@/*`

`tsconfig.json` maps `@/*` → `./src/*`. Use it. There is no `app/`, `lib/` or
`components/` at the repo root, and nothing should be added there.

⚠️ **`src/` is not the whole repo.** These are deliberately outside it and are
normal places to work:

| Path | What it is |
|---|---|
| `ingest/` | The daily pipeline. Separate runtime — runs under the service role, not in a request. |
| `scripts/` | One-off and scheduled CLI tools (`npm run registry:*`, `verify:rls`, seeds). |
| `supabase/migrations/` | Schema. Applied by hand in the Supabase SQL editor. |
| `registry/` | The curated board registry (`boards.json` tracked; `candidates.json` is not). |

The four `src/app/api/cron/*` routes import `ingest/` through five levels of
`../`. That is ugly and known; do not "fix" it by moving `ingest/` into `src/` —
it runs under the service role and must stay outside the web app's import graph.

### 2. Server Actions in `src/app/actions/`. Route handlers are the exception

**Mutations are Server Actions.** All 11 live in `src/app/actions/`. Do not move
them to route handlers: an action is invoked as a function and Next generates the
endpoint, so there is no hand-written public URL to guess or fuzz. Converting 11
actions to routes means 11 public URLs each needing its own hand-written auth
check — trading a structural guarantee for a procedural one.

**`src/app/api/` is reserved for requests that arrive without a session**, which
today is exactly three kinds:

| Group | Route | Guard |
|---|---|---|
| Cron | `api/cron/{ingest,recompute,audit,digest}` | `CRON_SECRET` bearer, via `lib/cron-route.ts` |
| Public read | `api/audit/today` | None by design — it is the landing page's proof |
| Dev tool | `api/dev-signin` | 404s unless `NODE_ENV !== 'production'` |

There are **no webhooks in this repo yet**. When one lands it belongs here, and
its signature must be verified before the payload is trusted.

**Every action that touches user data re-authenticates itself** — 8 of the 11
call `supabase.auth.getUser()` rather than trusting the page that called them.
Keep that: an exported function is its own entry point, reachable without the
page that renders it ever running. `src/app/actions/bench.ts` repeats its own
`NODE_ENV` check for the same reason.

The three without a `getUser()` call, and why:

| Action | Why it is exempt |
|---|---|
| `sign-out.ts` | Calls `signOut()`; there is nothing to authorise. |
| `role-catalogue.ts` | Reads `roles` only, whose RLS policy is `authenticated read roles` — an unauthenticated caller gets zero rows from the database, not from a check here. |
| `parse-resume.ts` | Touches no table. Parses bytes in memory and returns fields. |

⚠️ `parse-resume.ts` is the one worth watching. It reads no data, but it is an
unauthenticated entry point that does **LLM work**, so it is a cost surface
rather than a data surface. Today only `src/proxy.ts` gates it, via the
`/start/:path*` matcher — and proxy is UX, not security. If résumé parsing ever
gets expensive or rate-limited, that is the gap to close first.

### 3. No `supabase.from()` in `src/components/` or `src/app/`

All database access routes through `src/lib/services/`. A component must render
without a database; a page asks a named question and renders the answer.

Enforced by `no-restricted-syntax` in `eslint.config.mjs`:

| Scope | Severity | Violations |
|---|---|---|
| `src/components/**` | **error** | **0 — clean, keep it that way** |
| `src/app/**` | **warn** | **24 legacy sites across 14 files** |

⚠️ **The 24 are known, authorised, and mid-migration.** Every one predates the
rule, calls `getUser()` first, and runs under RLS — none is a security defect.
They warn rather than error so `npm run lint` stays green while they are absorbed
into `src/lib/services/`. **Do not add a 25th, and do not bulk-migrate them
unasked.** Order (cheapest first): `auth/callback` + `instant-signin` → the
single-profile reads → `applications` → `today/page.tsx` **last, with tests** —
it is the core surface and has none of its own. When the count reaches 0, raise
`src/app/**` to `error` and collapse the two ESLint blocks into one.

`no-restricted-imports` additionally bans `@supabase/supabase-js` and
`@/lib/supabase/service` in `src/app/` and `src/components/`. `@supabase/ssr` is
allowed — `src/proxy.ts` and the auth routes need `createServerClient`.
Privileged operations get a **named function** in `src/lib/services/`, never an
exported admin client: re-exporting one through an unguarded path launders the
privilege instead of removing it.

### 4. Single-sided. Do not create `app/(employer)/`

Saaf is a candidate copilot. Employers are **scraped data, not users** — the
`boards` table holds hiring boards, and no employer ever signs in. There is no
employer identity table and no employer RLS policy anywhere.

Creating `app/(employer)/` before the following exist produces a folder with
nothing lawful to put in it. All four are prerequisites, and (2) is where a
dual-sided product leaks if rushed:

1. An employer/recruiter identity table plus an account-type discriminator.
2. **A second RLS policy set.** Every current policy assumes `auth.uid()` is a
   candidate. An employer reading candidate data needs its own explicitly scoped
   policies — inheriting the candidate ones exposes profiles.
3. A consent model. `docs/PROJECT-STATE.md` parks "B2B discoverability" pending
   exactly this, and the third product guarantee is that nothing about a
   candidate's search is shared.
4. Side-aware routing in `src/proxy.ts`.

Equally: **do not rename the existing routes to `app/(candidate)/`.** Every route
is already the candidate side; the group would wrap the whole app to distinguish
it from something that does not exist.

### 5. No `any`. Zod at the boundary, strict types out of `src/lib/types/`

`tsconfig.json` is `strict: true`. **There are currently zero `any` types in
`src/` or `ingest/`** — that is the baseline to hold. Where a Supabase response
genuinely cannot be inferred, the codebase uses a named row type plus a single
`as unknown as RowType` at the query, not `any` and not a cast per field.

**Zod validates every untrusted input.** In practice that is 7 of the 11 server
actions — the four without a schema (`sign-out`, `delete-account`,
`restart-onboarding`, `role-catalogue`) take no caller-supplied data. Do not add
ceremonial schemas to those; do not omit one from anything that takes input.

**`src/lib/types/` does not exist yet.** Create it for the first genuinely
cross-cutting type and put shared interfaces there. Two carve-outs that are
correct and must not be swept into it:

- **`src/gates/types.ts` stays put.** `src/gates/` is the open-source half of the
  moat and an ESLint rule keeps it free of registry, ingest and database imports
  so publishing it is a directory move. Relocating its types to `src/lib/` would
  re-couple it to the app and defeat that.
- **Module-owned types stay with their module.** `AuditSnapshot` belongs in
  `lib/services/audit.ts`; `ScoreBreakdown` in `match/score.ts`. `src/lib/types/`
  is for types crossing module boundaries, not a dumping ground that turns every
  import into a two-file read.

(`src/types/` is a different thing — ambient `.d.ts` shims for untyped packages.
Leave it alone.)
<!-- END ARCHITECTURE -->

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Design Fidelity

**The design system is law. Reference `docs/DESIGN.md` for every frontend change.**

Before writing or changing any UI code:
- Read the relevant sections of `docs/DESIGN.md` — token YAML and component specs.
- Every color, font, size, spacing, and radius comes from a token. Never hardcode visual values.
- Reuse existing components before creating new ones. New components are built from the tokens.
- If a design need isn't covered by `docs/DESIGN.md`, flag the gap and ask - don't invent styling.

## 6. Secure by Default

**Insecure code that works is not done. These are not optional.**

- Never hardcode or commit secrets — environment variables only, and never behind a public prefix (`NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*` ship to every browser).
- Authorization lives server-side: check *ownership* of the resource, not just that someone is logged in. Client-side checks are UX, not security.
- Every database table gets access rules from day one — RLS policies scoped to the user in Supabase, auth-required rules in Firebase. A table without rules is public.
- Parameterized queries only — never build SQL from user input.
- Verify webhook signatures (Stripe, Clerk, GitHub) before trusting the payload.
- `service_role` and `sk_live_` keys never reach the client. The anon key / `pk_live_` are public by design — that's fine *because* the rules above hold.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes, and no hardcoded style values appear in any diff.

ALL YOUR EXPLANATIONS SHOULD BE ORIENTED IN SUCH A WAY CONSIDERING I AM A NON TECHNICAL PERSON. A BEGINNER PRODUCT MANAGER AND AN ENTREPRENEUR.
