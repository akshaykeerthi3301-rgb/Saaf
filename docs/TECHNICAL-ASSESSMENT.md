# Saaf — Technical Assessment

**Date:** 2026-09-08 · **Scope:** `src/`, `docs/`, plus `ingest/`, `scripts/`, `supabase/` where they cross the boundary
**Method:** measured against the live codebase and the live database. Every count reproducible by the command in the appendix.
**Status of the deployment audited:** live at `https://saaf-ten.vercel.app`, all 11 commits pushed.

---

## 0. Four corrections to the brief

This assessment answers what was asked. Four premises in the request are false against the code, and each is load-bearing.

| # | Brief states | Reality |
|---|---|---|
| **0.1** | `src/lib/services/` is "the immutable database gateway" | It is **3 modules, and not yet a gateway**. 24 queries bypass it. Nothing is immutable — it is an ordinary module directory. |
| **0.2** | "all pages in `src/app/` … strictly avoid direct `supabase.from()`" | **`src/components/` yes (0). `src/app/` no — 24 calls across 14 files.** |
| **0.3** | `llm.ts` is "Groq **fallback to** Gemini 2.0 Flash to deterministic parser" | It is **not a fallback chain.** One provider is selected by key presence; if it fails, control drops straight to deterministic. Gemini is never tried when Groq is configured. |
| **0.4** | "Cookie AI diagnostic copilot **and WebRTC preview studio**" | `/copilot` ships. **WebRTC does not exist** — zero occurrences of `MediaRecorder`, `getUserMedia` or `RTCPeerConnection` in `src/`. Interview Prep is a locked nav item reading "Not built yet". |

---

## 1. Scale

| | |
|---|---|
| Source files (`src/`, excl. tests) | 103 |
| Lines (`src/`, excl. tests) | 12,193 |
| Test files | 19 · **327 tests passing** |
| Routes | 18 pages · 7 route handlers |
| Server Actions | 13 |
| Migrations | 20 · **all applied** (spot-checked live) |
| Index | 21,813 India roles · 1,396 boards |

Gates: `lint` exit 0 · `typecheck` exit 0 · `build` ✓ 27 routes · `verify:rls` ✓ · `verify:onboarding` ✓

---

## 2. Architecture & data boundaries

### 2.1 `src/lib/services/` — a gateway under construction, not in place

Three modules, 277 lines total:

| Module | Exports | Owns |
|---|---|---|
| `audit.ts` | `getLatestAudit()`, `AuditSnapshot` | The public `audit_daily` read. Replaced 3 hand-built clients that had drifted to 3 different column lists. |
| `auth.ts` | `createDevSessionTokens()` | Privileged auth ops. Exports an **operation, never a client** — re-exporting an admin client through an unguarded path launders the privilege rather than removing it. |
| `cookie.ts` | `getCookieContext()` | Profile + role, the one read every Cookie surface needs. |

**Verdict: the pattern is correct and the coverage is ~11%.** Three questions are centralised; 24 remain inline.

### 2.2 The boundary is machine-enforced, at two severities

`eslint.config.mjs`, `no-restricted-syntax` on `.from()` calls:

| Scope | Severity | Violations |
|---|---|---|
| `src/components/**` | **error** | **0** ✅ |
| `src/app/**` | **warn** | **24** ⚠️ |

```
 5  src/app/actions/applications.ts        1  src/app/actions/bench.ts
 4  src/app/(app)/today/page.tsx           1  src/app/actions/confirm-profile.ts
 2  src/app/(app)/applications/page.tsx    1  src/app/actions/instant-signin.ts
 2  src/app/(app)/copilot/page.tsx         1  src/app/actions/report-refusal.ts
 2  src/app/actions/tailor.ts              1  src/app/actions/restart-onboarding.ts
 1  src/app/(app)/profile/page.tsx         1  src/app/actions/role-catalogue.ts
 1  src/app/(app)/resume/page.tsx          1  src/app/auth/callback/route.ts
```

**None is a security defect** — every one calls `getUser()` first and runs under RLS. They warn rather than error so `npm run lint` stays green while they are absorbed. The split is temporary by design: when the count reaches 0, raise `src/app/**` to `error` and collapse the two blocks.

⚠️ **A warning nobody escalates is a comment.** If this number is still 24 in a month, the honest move is to do the migration or drop the rule — not keep a permanent 24-warning baseline everyone scrolls past.

`no-restricted-imports` additionally bans `@supabase/supabase-js` and `@/lib/supabase/service` in `src/app/` and `src/components/`. `@supabase/ssr` stays allowed — `proxy.ts` and the auth routes need `createServerClient`. Verified by fixture that the rule fires on a reintroduced violation.

### 2.3 Three Supabase clients, one privileged

| Client | Key | Reach |
|---|---|---|
| `lib/supabase/browser.ts` | anon | 1 import site (`signin/page.tsx`) |
| `lib/supabase/server.ts` | anon + user cookies | 17 sites — the workhorse |
| `lib/supabase/service.ts` | **service role, bypasses RLS** | 3 sites, **all in `lib/`** |

Service-role reach is `lib/delete-user.ts`, `lib/instant-signin.ts`, `lib/evaluate-user.ts`, plus `lib/services/auth.ts`. Nothing in `src/app/` imports it.

### 2.4 The LLM contract — corrected

```
activeProvider():
  GROQ_API_KEY   present → 'groq'    (openai/gpt-oss-20b)
  GEMINI_API_KEY present → 'gemini'  (gemini-2.0-flash)
  neither                → null
```

```
readResumeWithModel(text):
  no provider / empty text        → null
  stripContactDetails() → slice(MAX_CHARS 24,000)
  single call, AbortSignal.timeout(12,000ms)
  any failure (bad response, timeout, malformed JSON) → null, silently
```

**It is provider SELECTION, not a fallback chain.** If `GROQ_API_KEY` is set and Groq times out, the function returns `null` — it does **not** try Gemini. Every caller then keeps its deterministic result.

That is a defensible design (a model outage is not a failed upload) but it is not what the brief describes, and the difference matters operationally: **a Groq outage silently degrades every résumé read to regex-only, with a Gemini key sitting unused.**

Two properties worth keeping:
- **Contact details are stripped inside `readResumeWithModel`**, before any text leaves the server — so every caller inherits it, including the public paste-JD tool.
- **The 24,000-char cap is inside the same function**, so no caller can exceed it.

---

## 3. Candidate workflows

### 3.1 Onboarding — 5 steps, parse-then-confirm

| # | Route | Does |
|---|---|---|
| 1 | `/start` | Entry. Fires `onboarding_started`. |
| 2 | `/start/upload` | PDF/DOCX → `parseResume` action. **File parsed in memory, never written to storage, never logged.** |
| 3 | `/start/reading` | Parse-in-progress. Draft read via `useDraft`. |
| 4 | `/start/confirm` | Every field shown pre-filled and marked "read from your résumé". |
| 5 | `/start/matching` | `confirmProfile` → `evaluateUser` → shortlist. |

**Nothing is written to the database before step 5.** Steps 2–4 hold the draft in `sessionStorage` (`lib/onboarding-store.ts`), which keeps the upload screen's promise that only confirmed fields are stored.

**Verified end to end** — `npm run verify:onboarding` runs it on a throwaway user against the live database and deletes it:

```
✓ résumé PDF yields text — 544 chars
✓ parser reads usable fields — title=Systems Engineer city=Bengaluru skills=10
✓ profile saves with confirmed_at
✓ evaluateUser writes a shortlist — 273 scored roles
✓ scores span a real range — top 100, bottom 23
```

⚠️ **This verifier found a live production bug on its first run.** Groq returned `currentTitle` as `"Systems Engineer at Infosys Jun 2024 - Present"`; `normalise()` only length-capped at 80 chars so it passed; that string suggested `preferred_role`, which becomes a tsquery ANDing every word against posting titles; it matched nothing. **Every new candidate got an empty `/today`, silently.** Fixed by `cleanTitle()` at the model-output boundary. 0 → 273 roles.

### 3.2 `/today` — sorting, and the 50% question

**There is no 50% threshold in the codebase.** `grep` for score-based filtering across `src/` returns nothing. `/today` filters on exactly three axes:

| Control | Filter |
|---|---|
| `tab=new` | `role_first_shown` within 7 days |
| location | `locationRank(breakdown) <= 1` → near / far sections |
| `fit=clears` | `clears(row)` — bucket, not score |
| `sort=new` | ordering only |

Live measurement on the founder's feed: **24 of 40 visible scores were below 50%, lowest 33%.** Shown, bucketed, labelled — never hidden.

This is correct and deliberate. Stage A (2026-09-04) reversed gating; `docs/PROJECT-STATE.md` locks *"never gate users out"* and *"Nothing is hidden. The buckets are the honest disclosure."*

⚠️ **GAP: the True-Fit Benchmark Line is approved and not built.** The agreed design was a visible line marking where high-probability interviews begin — a *sorting* affordance, explicitly not a `WHERE score >= 50`. Today nothing marks it. Low scores are visible but the candidate has no signal for where the meaningful boundary sits.

Payload control worth noting: `CARDS_PER_BUCKET = 20`, sized from a measurement — rendering a full 229-role list produced **4.27 MB of HTML** and took 6.8s against 0.3s for the query.

### 3.3 `/applications` — 5-column Kanban

`saved → applied → interviewing → offer → closed`. Status moves through a `<select>`, not drag-and-drop: keyboard- and screen-reader-operable with no extra work, and the core loop is a candidate on a phone at 11pm.

**Verified live**: tracked a real role → `saved` → `offer` → hard reload → persisted (`Offer 1, Saved 0`) → removed → `0 tracked`.

🔴 **DEFECT — optimistic writes are fire-and-forget.** All three mutations:

```ts
const move = (id, status) => {
  patch(id, { status })                                       // local state
  startTransition(() => { void setApplicationStatus({ id, status }) })
}                                //  ^^^^ result discarded
```

The actions return `{ ok: false, error }` rather than throwing, and `failed()` — unlike `done()` — **does not call `revalidatePath`**. So on failure: local state keeps the optimistic value, no error surfaces, no revalidation corrects it. The candidate sees a status that is not in the database until a hard reload.

The file's own comment claims "reconciled by the action's revalidate" — true on success, false on failure, which is the only case that matters.

**This is the exact defect `track-role.tsx` documents having fixed:** *"This used to set tracked=true and drop the result on the floor, so a failing write looked exactly like a successful one — which is how a broken conflict target went unnoticed through an entire release. An optimistic update that cannot be rolled back is not optimistic, it is a lie."* The sibling component was never given the same treatment.

**Fix:** await the result, roll back `rows` and surface the error on `!ok` — the pattern already written in `track-role.tsx` and `report-score.tsx`.

---

## 4. Features & gaps

### 4.1 Public tools — both live, both invisible

| Tool | Route | Status |
|---|---|---|
| **TASK-060** Paste-a-JD | `/tools/paste-jd` | ✅ live, verified in production at 84% with Groq reading the résumé |
| **TASK-061** ATS checker | `/tools/ats-checker` | ✅ live |

Both are public, unauthenticated, and reach **no database** — a test asserts `lib/jd-match.ts` never acquires a client. Rate limited at 10 per 10 min per caller, IP hashed to 16 hex chars so nothing outliving the request holds an address.

Design decision worth recording: **work mode is omitted from the paste-JD score.** `workModeFit()` awards full marks when no preference is set, and nobody sets one when pasting a JD — measured across four candidates, all four scored `work_mode 7/7`. A component returning the same value for everyone raises the floor rather than measuring anything.

⚠️ **GAP: nothing links to either tool.** They are reachable only by typing the URL. These are the only no-signup assets in the product and the natural beta-acquisition surface.

### 4.2 Cookie — engine built, surface locked

| Piece | Status |
|---|---|
| `/copilot` diagnostic | ✅ ships. Averages real score components across the shortlist. |
| `lib/interview-prep.ts` | ✅ built + 15 tests. 5 questions from real gaps, guard-enforced, deterministic. |
| `lib/services/cookie.ts` | ✅ the shared read. |
| **Interview Prep UI** | ❌ **not built.** Nav renders it locked with "Not built yet". |
| **WebRTC studio** | ❌ **does not exist.** No `MediaRecorder`/`getUserMedia`/`RTCPeerConnection` anywhere. |

**The WebRTC blocker is a decision, not code.** Local capture is trivial; evaluating delivery needs speech-to-text, and the options are the Web Speech API (Chrome/Android fine, **iOS Safari effectively unusable** for an India-first mobile product) or a paid STT service on a ₹0 product. `docs/ROADMAP.md` flags this task as *"most expensive per session… least defensible at ₹0."*

**Fabrication guard** (`groundingFailure`, 11 tests) blocks invented metrics, foreign employers, inflated tenure, unheld credentials. Wiring interview prep through it exposed two silent defects in the guard — it rejected every question (its company rule assumes one sentence; a question is two), and it deleted 3 of 5 questions (a gap question names something not on the profile *by definition*). **Neither was fixed by relaxing the shared guard**; masking is local and narrow, and a test asserts a real fabrication still fails through it.

### 4.3 Remaining gaps before public beta recruitment

| Sev | Gap | Note |
|---|---|---|
| 🔴 | **Kanban optimistic writes never roll back** | §3.3. A failed status move shows as success. |
| 🟠 | **Coverage is 33× uneven by function** | HR candidate: **15 roles**. Marketing 131. Consulting 219. Engineering 500 (capped). Not a matching defect — no cross-function contamination — but an empty screen for some functions. |
| 🟠 | **Tools unlinked** | §4.1 |
| 🟠 | **True-Fit Benchmark Line unbuilt** | §3.2 |
| 🟡 | 24 inline `.from()` | §2.2 |
| 🟡 | LLM is selection, not fallback | §2.4 — a Groq outage silently drops to regex with a Gemini key unused |
| 🟡 | Sentry unverified in production | 403s observed were localhost-only |
| 🟡 | `/today` has no tests of its own | 606 lines, core surface; `src/match/` has 3 test files, the page 0 |
| ✅ | **Migrations** | **None pending.** 0014/0015/0016/0018/0020 verified applied against the live DB. |

**Recruitment recommendation: engineers and consultants first.** 500 and 219 roles respectively. An HR candidate's 15-role feed reads as a broken product, and first impressions across a ten-person beta are most of the signal.

---

## Appendix — reproduce

| Claim | Command |
|---|---|
| `.from()` by layer | `npx eslint . -f json` → filter `no-restricted-syntax` |
| No 50% floor | `grep -rnE "\.gte\('score'\|score >= 50" src/` |
| No WebRTC | `grep -rln "MediaRecorder\|getUserMedia\|RTCPeerConnection" src/` |
| Onboarding end to end | `npm run verify:onboarding` |
| RLS incl. cross-user | `npm run verify:rls` |
| Coverage by function | see `docs/PROJECT-STATE.md` § Index coverage by function |
