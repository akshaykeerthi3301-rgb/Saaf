# Verification — the five success criteria

*Measured 2026-09-03 against the production build. Re-run before launch.*

Three criteria are verifiable today. Two need real users, and are marked
**pending cohort** rather than ticked — a criterion that needs people cannot be
satisfied by a developer clicking through it.

---

## 1. A new user reaches the shortlist in under 90 seconds ✅ on the technical portion

| Step | Measured |
|---|---|
| Five onboarding screens, server render | **577 ms** total |
| Gate evaluation, 522 roles | **1,138 ms** |
| Shortlist render | **673 ms** |
| **Technical total** | **≈2.4 s** |

That leaves **87.6 s of the 90-second budget for human input**, against the
63 s the onboarding flow estimated (5 + 15 + 8 + 30 + 5). Comfortable.

What is *not* measured here is a real person typing on a real phone over real
mobile data. The technical path cannot be the bottleneck; the human path still
needs observing once there are users. PostHog measures it: the funnel from
`onboarding_started` to `shortlist_viewed`.

## 2. ≥60% engage the withheld section, <5% file a report ⏳ pending cohort

**Instrumentation is ready and verified.** Six events fire —
`onboarding_started`, `resume_uploaded`, `profile_confirmed`,
`shortlist_viewed`, `withheld_section_engaged`, `refusal_reported` — and
`withheld_section_engaged` fires once per session on intersection.

The metric itself needs real users. It is deliberately two-sided: engagement
alone would look like success while the gate was quietly wrong, so the report
rate is the other half.

## 3. 100% eligibility rate ⏳ pending cohort

Every role shown is one the candidate judges themselves genuinely eligible for.
Only the candidate can answer this, so it is a first-cohort survey question, not
a measurement. The `refusal_reports` table is the standing early-warning signal
in the meantime.

## 4. The core loop completes on mobile Safari at 390px ✅

Verified at 375 px:

- `scrollWidth === innerWidth` — **no horizontal overflow**
- No fixed width above 390 px anywhere in the rendered markup
- The arithmetic line, including the withheld count, sits above the fold
- The withheld section is open on first paint, not behind a `<details>`
- The hero's side-by-side refusal stacks vertically

## 5. Seven consecutive clean ingest runs ⏳ needs elapsed time

The pipeline runs correctly — 21/21 boards, 964 roles, 25 s — but "seven
consecutive days without intervention" cannot be compressed. It starts when the
repo is pushed and the Actions secret is set (`HANDOFF` A3/A4).

---

## Also verified

**Accessibility (WCAG 2.1 AA).** No `aria-disabled` and no `<del>` tags on
withheld rows; every refusal is stated in text, so a screen-reader user learns a
role was withheld *and why* from the words rather than a strike-through they
cannot perceive. Correct heading order, all controls labelled, no empty buttons.

**Performance.** 135.7 KB gzipped blocks first paint against a 200 KB budget;
DOMContentLoaded at 80 ms. Sentry and PostHog are deferred to idle.

**Security.** `npm run audit:security` — 16 checks covering secrets,
service-role reachability, the open-source gate split, résumé handling, auth,
and third-party collection.

**Landing page reconciliation.** All 15 claims trace to shipped, tested code.
The document-generation promise is cut (Open Question Q1). Two features ship
*without* being claimed — the stretch tier and the under-served-function notice
— which is the safe direction.

---

## Commands

```
npm run audit:security   # 16 security checks
npm run verify:rls       # proves RLS denies, by seeding a row first
npm test                 # 48 tests, the gate engine and the parser
npm run gates:demo       # the engine against real postings
npm run ingest           # the full daily pipeline
```
