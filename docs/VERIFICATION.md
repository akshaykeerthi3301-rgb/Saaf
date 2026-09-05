# Verification — the five success criteria

*Measured 2026-09-03 against the production build. Re-run before launch.*
*Reconciled 2026-09-05 for the Stage A pivot — see `PROJECT-STATE.md` § The pivot.*

Three criteria are verifiable today. Two need real users, and are marked
**pending cohort** rather than ticked — a criterion that needs people cannot be
satisfied by a developer clicking through it.

⚠️ **The pivot voided criterion 2 rather than delaying it** — it measured a
section the product no longer has. It was restated and re-instrumented on
2026-09-05 against what the product now claims, and is pending cohort again.

---

## 1. A new user reaches the shortlist in under 90 seconds ✅ on the technical portion

| Step | Measured |
|---|---|
| Five onboarding screens, server render | **577 ms** total |
| Match scoring, 522 roles *(measured pre-pivot as gate evaluation)* | **1,138 ms** |
| Shortlist render | **673 ms** |
| **Technical total** | **≈2.4 s** |

That leaves **87.6 s of the 90-second budget for human input**, against the
63 s the onboarding flow estimated (5 + 15 + 8 + 30 + 5). Comfortable.

What is *not* measured here is a real person typing on a real phone over real
mobile data. The technical path cannot be the bottleneck; the human path still
needs observing once there are users. PostHog measures it: the funnel from
`onboarding_started` to `shortlist_viewed`.

## 2. ≥60% open a score breakdown, <5% report a score ⏳ pending cohort

*Restated 2026-09-05. It read "≥60% engage the withheld section, <5% file a
report" until the pivot removed the withheld section; the two-sidedness was the
valuable part and is what carried over. Engagement alone would look like success
while the scores were quietly wrong, so the report rate is still the other half.*

**Instrumentation built 2026-09-05.** Both halves now fire:

- `score_breakdown_opened` — once per session, the first time a candidate opens
  *"How this score is built"* on any card
  (`src/components/features/breakdown-engaged.tsx`). One capture-phase listener
  for the whole list, not a prop per card: making the card a client component
  would serialise every card's props into the payload twice, and the list is
  unbounded.
- `score_reported` — *"This score looks wrong"*, on every card
  (`src/components/features/report-score.tsx`), writing through the
  `reportRefusal` action that was kept when the withheld section was orphaned.
  It sits on **every** card, not only weak ones: a score that is too high is the
  more dangerous error, because a role the candidate cannot get presented as a
  strong fit is the injury this product exists to fix.

**Verified in a browser, not assumed** — opening the evidence disclosure does not
fire it, opening the score breakdown fires exactly once, and reopening does not
fire again. `toggle` neither bubbles nor reports its state synchronously, and
both were checked rather than taken on faith.

**Not yet verified signed-in.** `/api/dev-signin` was deleted once magic-link
sign-in worked, so the rendered shortlist could not be exercised locally. The
event wiring, the layout-neutrality of the wrapper and the action itself are
each checked; **the assembled page is not.** Confirm on the first signed-in
session after deploy.

The metric itself needs real users. `withheld_section_engaged` and
`refusal_reported` remain in the event union, fired by nothing, so historical
data stays readable.

## 3. 100% eligibility rate ⏳ pending cohort

Every role shown is one the candidate judges themselves genuinely eligible for.
Only the candidate can answer this, so it is a first-cohort survey question, not
a measurement. The `refusal_reports` table is the standing early-warning signal
in the meantime.

## 4. The core loop completes on mobile Safari at 390px ✅

Verified at 375 px:

- `scrollWidth === innerWidth` — **no horizontal overflow**
- No fixed width above 390 px anywhere in the rendered markup
- The arithmetic line sits above the fold *(it now reads indexed · matching ·
  strong fit — a narrowing, not a subtraction)*
- ~~The withheld section is open on first paint~~ — **no such section exists**
- The hero's side-by-side stacks vertically *(it now contrasts an opaque
  portal badge with an itemised score; re-verify at 375 px after the Stage C
  deploy)*

## 5. Seven consecutive clean ingest runs ⏳ needs elapsed time

The pipeline runs correctly — and faster since Stage B, which took the same 20
boards from 34 s to 7 s — but "seven consecutive days without intervention"
cannot be compressed. **The runner is Vercel Cron, not GitHub Actions** (Actions
are disabled on this account, `HTTP 422`), so the clock starts from the last
production deploy rather than from A3/A4.

---

## Also verified

**Accessibility (WCAG 2.1 AA).** Measured pre-pivot, and half of what it
measured is gone: there are no withheld rows and no strike-through to perceive.
What carries over is the principle and the structural findings — correct heading
order, all controls labelled, no empty buttons, and **every judgement stated in
text rather than in styling**, which now applies to the score breakdown.
**Re-run against the ranked shortlist before launch.**

**Performance.** 135.7 KB gzipped blocks first paint against a 200 KB budget;
DOMContentLoaded at 80 ms. Sentry and PostHog are deferred to idle.

**Security.** `npm run audit:security` — 16 checks covering secrets,
service-role reachability, the open-source gate split, résumé handling, auth,
and third-party collection.

**Landing page reconciliation.** Measured 2026-09-03 against the gating page:
all 15 claims traced to shipped code, and the document-generation promise was
cut (Open Question Q1). **Stage A rewrote the page** — the headline promise
*"nothing in your list is a job you can't get"* could not survive ranking — so
the claim-by-claim reconciliation is stale and needs re-running against the
current copy. The two features that shipped unclaimed no longer exist: the
stretch tier is moot and the under-served-function notice is gone.

---

## Commands

```
npm run audit:security   # 16 security checks
npm run verify:rls       # proves RLS denies, by seeding a row first
npm test                 # 130 tests, extraction, scoring and the parser
npm run gates:demo       # extraction against real postings — the only live
                         # caller of the old verdict path
npm run ingest           # the full daily pipeline
```
