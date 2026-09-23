# QA audit — Saaf end to end (2026-09-23)

What a customer would hit today, found by using the product rather than reading
it. Every finding carries the measurement or reproduction behind it and the file
it comes from. Fixes are scheduled in `docs/ROADMAP.md` Phase 11; this document
is the evidence those tasks point back to.

## Status

| Finding | State (2026-09-23) |
|---|---|
| QA-01 upload crash | **Fixed, verified on localhost, not deployed** — TASK-091 |
| QA-02 `/today` speed | **Fixed, verified on a local production build, not deployed** — TASK-093. Cold-cache case unverified |
| QA-12 error / not-found / loading screens | **Fixed, verified on localhost, not deployed** — TASK-092 |
| QA-06 500 cap shown as a total | **Fixed, verified on localhost, not deployed** — TASK-094 |
| QA-04, QA-05, QA-10, QA-17, QA-21 one fact, two names | **Fixed, verified on localhost, not deployed** — TASK-096 |
| QA-09 non-job pre-filled as target role | **Fixed, verified on localhost, not deployed** — TASK-097 |
| QA-07, QA-08 unmetered model calls | **Fixed, verified on localhost, not deployed** — TASK-095 |
| QA-25b pooled rate limits (found during TASK-095) | **Fixed, verified on localhost, not deployed** — TASK-095 |
| QA-26 intermittent rewrite failure, unlogged | Open — TASK-105 |
| QA-03 email sign-in | Open — founder-only (TASK-075) |
| Everything else | Open — ROADMAP Phase 11 |

## How it was tested

| Surface | Where | How |
|---|---|---|
| Public pages (`/`, `/audit`, `/tools/*`, `/signin`, `/privacy`, `/terms`) | **Production** — `saaf-ten.vercel.app` | curl for status/TTFB/size on every route; Lighthouse 12, mobile profile, 5 pages; browser walk |
| ATS checker, all five steps | Localhost (dev) + **production** for the size limit | Real uploads: a synthetic résumé, a public UW sample, a corrupt 2 MB PDF, a 4.7 MB file |
| Signed-in app (`/today`, `/applications`, `/resume`, `/copilot`, `/interview-prep`, `/profile`) | Localhost, **production build** (`next build && next start`) against the **live database**, signed in as the founder via `/api/dev-signin` | Timed server responses, walked every control, axe-core (WCAG 2.1 AA) on each page, 375 px phone emulation |
| Onboarding upload → reading → confirm | Localhost | Real upload of the UW sample; stopped before "Looks right" so the founder's profile was not overwritten |
| Database cost of `/today` | Live database, service role, read-only | Each query timed cold and warm |

**State restored:** two tracker rows and one score report created by testing were
removed; the onboarding draft was cleared from the browser. Nothing else was
written.

**Not tested — say so rather than imply it:** a brand-new account through
confirm and first shortlist (would overwrite the founder's profile — needs a
fixture account); the thin-segment empty state (HR); the browser extension on a
real ATS form; account deletion; Google sign-in on production; the Groq budget
under concurrent users; a real phone on a real network (emulated only).

## Severity

| | Meaning |
|---|---|
| **P0** | A core flow breaks, crashes, or is slow enough that a first-time user leaves |
| **P1** | The product says something untrue or contradictory, or an unmetered cost/abuse surface |
| **P2** | Friction, accessibility, polish |

## Findings

### P0

**QA-01 · A résumé between 4.5 and 5 MB crashes the page on production.**
The UI and the server both allow 5 MB (`src/lib/parse/constants.ts:12`,
`ats-flow.tsx:612` "up to 5 MB", `next.config.ts` `bodySizeLimit: "8mb"`), but a
Vercel function rejects any request body over 4.5 MB before our code runs.
Reproduced on production: a 4.7 MB upload to `/tools/ats-checker` → `413
FUNCTION_PAYLOAD_TOO_LARGE` → uncaught `An unexpected response was received from
the server` → the whole page replaced by Next's default *"This page couldn't
load"*. curl confirms the boundary: 1.0 MB → 400 from our route, 4.8 MB → 413
from Vercel. The same constant gates onboarding upload (`/start/upload`, "PDF or
DOCX · 5 MB") and the résumé studio. Scanned résumés from phones routinely land
at 3–10 MB, so this is not an edge case. A corrupt 2 MB PDF, by contrast, is
handled well: *"We could not read that file…"*.

**QA-02 · `/today` takes 10–19 s on a cold visit and ships 0.7–6.3 MB of HTML.**
Measured on a local production build against the live database:

| View | Server time | HTML |
|---|---|---|
| `/today`, first request | **19.2 s** | 691 KB |
| `/today`, repeat | 2.1 s | 691 KB |
| `?tab=new` / `?sort=new` | 4.9 / 4.5 s | 707 / 758 KB |
| `?show=far` ("Show all 338") | 1.9 s | **6,327 KB** |
| Every other signed-in page | 0.33–0.75 s | 26–47 KB |

Root cause, measured query by query: `src/app/(app)/today/page.tsx:122` selects
all 500 `gate_results` with `roles(…, role_requirements(*))` — **1,045 KB of
JSON, 9,954 ms cold, 492 ms warm**. A candidate who opens Saaf once a day always
arrives cold. All 500 rows are then rendered server-side and each card (~8.2 KB,
including every requirement quote inside the closed *Insights* disclosure) is
sent twice: once as HTML, once in the RSC payload (344 KB of inline script on
the default view). The page also awaits five queries in sequence (lines
107–167) where four are independent. There is no `loading.tsx`, so the
navigation that triggers this shows nothing at all while it waits (see QA-12).
⚠️ `today/page.tsx` has no tests of its own (CLAUDE.md invariant 3) — write them
before restructuring it.

**QA-03 · Email sign-in reaches nobody.** Known, founder-only — TASK-075. The
sign-in page offers "Email → Continue"; Resend delivers only to the founder's
address until a domain is verified. Not re-tested on production to avoid mailing
a real address.

### P1

**QA-04 · The ATS checker contradicts itself between step 1 and step 4.** Same
résumé, same session: step 1 *"What a parser read out of your file — Current
title: Systems Engineer · Employer: Infosys"* (`ats-flow.tsx:736`); step 4 *"What
a parser could read: 41% — We could not find your phone, job title, employer,
and dates."* (`report-rail.tsx`). Two different parsers — the model-assisted
field reader and the deterministic ATS view — are both called "a parser". This
is the same defect family `src/lib/jd-match.ts:124` already fixed for
`/tools/paste-jd` ("an admission and a perfect score for the same field on the
same screen discredits both"); it has recurred on the ATS flow.

**QA-05 · One card, two counts.** Step 4 reads *"We hold 199 Backend Engineer
postings"* (`report-rail.tsx:150`) and, after *Count them*, *"8 scoring 50%+ of
the 150 Backend Engineer postings we indexed"* (`report-rail.tsx:135`). 150 is
`index-match.ts`'s scoring cap, not the index.

**QA-06 · The 500-role cap is presented as a total.** `MAX_ROLES_PER_CANDIDATE =
500` (`src/lib/score-candidate.ts:32`); the page says *"Showing 500 roles matched
to your baseline"* and the tab says *"All matches 500"* (`today/page.tsx:364`).
A candidate whose query matches more cannot tell. Against the locked decision
*"never a hidden role"*, disclosing the cap is a correctness fix; raising it is a
separate decision (and cheaper once QA-02 lands).

**QA-07 · "Review & Approve" calls the model with no rate limit and no cache.**
`src/app/actions/tailor.ts:24` has no `checkRateLimit` — seven other AI/scoring
actions do. The draft lives only in component state (`review-drawer.tsx:41`), so
every reload re-drafts. Measured 3.6 s per open. Groq's free tier is 8,000
tokens/minute shared site-wide: one user opening drawers in a loop starves every
other user's rewrite.

**QA-08 · Résumé parsing is an unauthenticated, unmetered model call.**
`src/app/actions/parse-resume.ts:40` has neither `getUser()` nor
`checkRateLimit`, and calls `readResumeWithModel`. Already named in CLAUDE.md as
"the gap to close first"; still open.

**QA-09 · Onboarding pre-fills a target role that is not a role.** The public UW
tech sample (a student; first "experience" is a hackathon) parsed to *Current
title: Hackfest · Employer: University of Washington*, and the target role
defaulted to **"Hackfest"** — `start/confirm/page.tsx:122` copies the current
title into the role whenever one exists. One click on *Looks right* yields a
near-empty shortlist. The model parse on this path is not covered by `npm run
bench` (the manifest has no entry for `uw-tech`).

**QA-10 · "Strong match" means two different things.** `/copilot` says *"3 are a
strong match"* counting score ≥ 75 (`copilot/page.tsx:115`); on `/today` the
card label *"Strong match"* is 60–74 and ≥ 75 is *"High-precision match"*
(`components/ui/fit-ring.tsx:38`). Measured on the founder's near bucket: 3
high-precision, 7 labelled "Strong match" — Copilot's "3 strong" contradicts
seven cards that say strong.

**QA-11 · "Newest" is newest-to-you, not newest posted.** `today/page.tsx:219`
sorts by `role_first_shown`. Since TASK-086 the card shows the posting date, so
a *"Posted over a year ago"* role can head the *Newest* list.

### P2

**QA-12 · No error, not-found or loading screens anywhere.** There is no
`error.tsx`, `global-error.tsx`, `not-found.tsx` or `loading.tsx` under
`src/app`. Consequences seen: QA-01's crash renders Next's unbranded default;
QA-02's 10–19 s wait renders nothing; `/does-not-exist` is Next's default 404.

**QA-13 · The review drawer is not a working dialog for keyboard users.** Escape
does not close it (tested with a real keypress); focus is neither moved in nor
trapped (`review-drawer.tsx:89`, hand-rolled `role="dialog"`). No dialog
primitive exists in `src/components/ui/`; `@base-ui/react` (already a dependency)
has one.

**QA-14 · "This score looks wrong" files instantly — no reason, no undo.**
`report-score.tsx:42` submits on first click. The action already accepts a
`note`; the UI never asks. (Testing filed one on the founder's account; it was
deleted.)

**QA-15 · Tracker friction.** *Remove* deletes with one click and no undo
(`application-board.tsx:129`), including notes. The *"N tracked"* count is
server-rendered (`applications/page.tsx:89`) and stays wrong after an add or
remove until reload (observed "1 tracked" beside an empty board). Clicking *Add*
with empty fields does nothing and says nothing.

**QA-16 · The tracker stores `javascript:` links.** `applications.ts:18` uses
`z.string().url()`, which accepts any scheme. React neutralises it at render
("React has blocked a javascript: URL"), so nothing executes today; restrict to
http(s) so no future non-React consumer inherits it.

**QA-17 · Internal enum names on the card.** *Insights* headings render
`EXPERIENCE_YEARS`, `TITLE_SENIORITY`, `LOCATION` verbatim
(`role-card.tsx:216`, `jd-match-form.tsx:358`).

**QA-18 · Phone layout.** At 375 px the *Insights* toggle overlaps the *Track*
button (measured: toggle right edge 130 px, button left edge 116 px) — a tap on
one can hit the other. 46 tap targets on `/today` are under 24 px tall (the
Sort/Show links, every *Insights* toggle) — below WCAG 2.2's 24 px minimum.

**QA-19 · Contrast and keyboard access (axe-core, WCAG 2.1 AA).** `/today`: 49
elements at 3.11:1 (e.g. tab counts, `today/page.tsx:299` `opacity-70`).
`/applications`, `/resume`: white on the accent green at **4.49:1** — every
primary green button misses 4.5:1 by 0.01 (`globals.css:99` `--accent`). The
tracker's horizontal scroller is not keyboard-reachable
(`application-board.tsx:176`). `/profile`, `/copilot`, `/interview-prep`,
`/start/confirm`: clean. Public pages (Lighthouse): contrast on the
eyebrow labels of `/audit`, `/tools/*`; the ATS checker's file input has no
associated label.

**QA-20 · Interview prep.** The role picker lists *"Customer Success Manager
81"* three times with no company to tell them apart. Skills read from product
names produce odd questions — *"How much have you worked with Server?"* from
"Alteryx Server".

**QA-21 · The public audit page speaks the gating-era language.** *"Title above
your band"*, *"Credential not held"* (`(marketing)/audit/page.tsx:7-9`) — second
person, on a page read by visitors with no profile, describing refusals the
product no longer makes (Stage A).

**QA-22 · Sign-in forgets where you were going.** `src/proxy.ts:47` redirects to
`/signin` without the requested path; `auth/callback/route.ts:25` always lands on
`/today` or `/start`. A bookmarked `/applications` becomes `/today`. (Carry a
`next` param; accept only same-origin relative paths.)

**QA-23 · Landing page weight.** Lighthouse mobile: `/` 84 (LCP 4.1 s, TBT 190
ms), `/tools/ats-checker` 86 (LCP 4.0 s), `/signin` 87; `/audit` 97,
`/tools/paste-jd` 98. ~460 KB compressed JS on a static marketing page;
Lighthouse estimates 243 KiB unused. Server is not the problem (TTFB 0.17–0.24
s on every public route). Which client components pull the weight is **TBD** —
needs a bundle analysis before any fix is claimed.

**QA-24 · No Content-Security-Policy.** `vercel.json` sets HSTS,
`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` —
all good — but no CSP.

**QA-25 · Profile input types.** Phone is `type="text"` (no numeric keypad on a
phone); LinkedIn URL is `type="text"` (no URL keyboard, no scheme check).

### Found after the pass

**QA-25b · Every rate limit shared one allowance per visitor.** All seven limited
actions (and `api/extension/score`) keyed on the same hashed IP in one in-memory
store, so their hits pooled. Upload + check + "Count them" is three calls; the
résumé rewrite's limit is three, so it refused its first attempt. Reproduced by
a failing test before the fix (TASK-095).

**QA-26 · A model failure leaves no trace.** "Rewrite everything" failed once on
the UW sample and worked on retry; the provider answered a probe normally. No
failure path in `llm.ts` or `resume-rewrite.ts` logs anything, so the cause is
unknowable after the fact (TASK-105).

## What worked, measured

Public routes answer in 0.17–0.50 s with correct status codes (auth pages 307 →
`/signin`, `/api/dev-signin` 404, unknown route 404). ATS checker: result in 1.0
s, *Count them* in ~1 s, corrupt file handled with a clear message. Onboarding
parse: 5 s from upload to confirm screen. Tracker status changes persist.
Profile validation bounds years to 0–50. Security headers present (see QA-24).
Every signed-in page except `/today` renders in under 0.8 s.

## Out of scope here, already tracked

TASK-075 (domain / email sign-in), TASK-076 (real candidates), TASK-087 (deploy
posted dates + backfill), the half-migrated extension (`docs/HANDOFF.md`), and
the open scoring judgment calls in ROADMAP Phase 9.
