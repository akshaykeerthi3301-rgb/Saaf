# Verification — the five success criteria

*Measured 2026-09-03 against the production build. Re-run before launch.*
*Reconciled 2026-09-05 for the Stage A pivot — see `PROJECT-STATE.md` § The pivot.*

Three criteria are verifiable today. Two need real users, and are marked
**pending cohort** rather than ticked — a criterion that needs people cannot be
satisfied by a developer clicking through it.

⚠️ **The pivot voided criterion 2 rather than delaying it.** It measured a
section the product no longer has. It is rewritten below as *unmeasurable, with
a named successor that is not yet instrumented* — not carried forward as if it
were still merely pending.

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

## 2. ~~≥60% engage the withheld section, <5% file a report~~ ❌ voided by the pivot

**This criterion no longer has a subject.** Nothing is withheld, so there is no
withheld section to engage with. `withheld_section_engaged` survives in the
`AnalyticsEvent` union in `src/lib/analytics.ts` but **nothing fires it** — the
component that did is orphaned. `shortlist_viewed` still fires, always with
`withheld: 0`.

**The successor, and it is not built yet.** The two-sidedness was the valuable
part: engagement alone would look like success while the gate was quietly
wrong, so a report rate was the other half. Under ranking the equivalent pair is
*do candidates open the score breakdown* — the working behind the number, which
is the whole claim — and *do they flag a badly-ranked role*. The report path
exists (`src/app/actions/report-refusal.ts`, kept deliberately) but is wired to
nothing, and there is no breakdown-opened event. **Neither half is instrumented.
Do not report this criterion as pending-cohort; it is pending code.**

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
