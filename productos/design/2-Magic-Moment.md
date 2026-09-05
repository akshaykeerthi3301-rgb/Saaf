# Magic Moment

*Drafted: September 2026. Generated from `docs/PRODUCT.md` and `productos/design/1-Product-Identity.md`, with live research into 2026 activation benchmarks and comparable aha moments.*

> ⚠️ **VOID as of 2026-09-04 — read the amendment before this section.** The
> recommended moment below depends on a withheld section the product no longer
> has. Full reasoning under *Amendment* further down; `docs/PROJECT-STATE.md`
> § The pivot governs.

---

## The recommended magic moment

> When the candidate reads the withheld section of their first shortlist and recognises a disqualifier as true — *"asks for a chartered accountant; your profile doesn't carry one"* — software has told them **no**, with a reason they know is correct. That is the moment they realise this is worth keeping.

**Where it sits:** First session, immediately after profile confirmation.
**Time-to-aha target:** Under 90 seconds from confirming the profile.
**Success metric:** ≥60% of new profiles engage the withheld section during session 1, and fewer than 5% file a "this shouldn't be here" report against it.

## Why this is the primary

It is the only candidate where the aha *is* the mechanism. The gate's sole visible output is a refusal, so there is nothing else this product could reveal that would carry the same meaning — a good match is what every competitor claims, and a correct refusal is what none of them will show. It is also the fastest reachable candidate, which matters more than it sounds: D1 retention is decided in the first 90 seconds of the first session, and users who hit an achievement on day zero retain at 56.9% against 4.1% for those who never do.

The specification already exists in the customer research. `2-Customer-Persona.md` §9 names the objection that kills the deal — *"Naukri already says it matches me. Why would yours be any different?"* — and prescribes the answer: **do not claim it, demonstrate it.** Show a role the portals recommended them for, withheld here, with the reason stated. This magic moment is that prescription, engineered into the first session.

**This is a committed hypothesis, not a proven truth.** No user has seen this product. It is the first bet, to be tested against the metric above and replaced by Candidate 3 if it fails.

---

## ⚠️ Amendment — 2026-09-04: the primary magic moment is void

**Candidate 1 cannot happen any more.** Stage A replaced gating with ranking
(`docs/PROJECT-STATE.md` § The pivot): nothing is withheld, there is no withheld
section, and no refusal for a candidate to recognise as true. This document's own
argument for Candidate 1 was that *"the aha **is** the mechanism — the gate's sole
visible output is a refusal."* The mechanism changed, so the aha went with it.

**What follows from that, and what does not:**

- **Candidate 2 does not inherit the slot.** Its own two structural blockers are
  untouched — it asks for a résumé before the confidentiality guarantee is made,
  and the portal comparison needs LinkedIn or Naukri data that a locked decision
  excludes.
- **Candidate 3 is unaffected and still worth keeping.** The honest arithmetic
  changed shape — from a subtraction to a narrowing (*indexed · matching your
  search · a strong fit*) — but "the product did not inflate the list, and the
  shortfall is our coverage" survived the pivot exactly.
- **The nearest live successor is the itemised score**: a candidate opens the
  working behind a number and finds a component they know is true — including the
  gap that cost them points, stated rather than hidden. It is reachable in the
  same first session and the same 90 seconds, it is what the landing page already
  contrasts against an opaque portal badge, and it keeps the property that made
  Candidate 1 strong: the value is *verifiability*, not the answer.
- **It is not yet instrumented, and not yet decided.** There is no
  `breakdown_opened` event, `withheld_section_engaged` fires from nothing, and the
  §Success metric below measures a section that no longer exists. Naming the
  successor is a founder decision — see `docs/VERIFICATION.md` § 2.

*The candidates below are preserved as written. Read them as the record of a
decision that has been overtaken, not as current instructions.*

---

## Three candidates considered

### Candidate 1: The recognised refusal — **PRIMARY**

- **Action:** The user reads the withheld section on their first shortlist and recognises a disqualifier as true.
- **Wow:** Software told them no, with a reason they know is correct — the first honest signal they have had in eight months of searching.
- **Where:** First session, immediately after profile confirmation.
- **Time-to-aha:** Under 90 seconds from confirming the profile.
- **Comparable evidence:** **Perplexity** — the aha is a *cited* answer, where verifiability rather than the answer itself is the value. **Granola** — no bot joins the meeting; the restraint is the product. **Superhuman** — Inbox Zero in the first session, where the aha is an absence rather than an addition.
- **Risk:** A wrong refusal is far more damaging than a wrong match. Withholding a role the candidate genuinely is eligible for reproduces the exact injury this product exists to fix, and does it with more authority than a portal ever had. Secondary risk: the user never scrolls to the withheld section, and the aha simply doesn't fire.
- **Metric:** ≥60% of new profiles engage the withheld section in session 1; <5% file a "this shouldn't be here" report.

### Candidate 2: The pre-signup portal contradiction

- **Action:** Before signing up, the user runs a résumé against a role a major portal recommended them for and sees it withheld here, with the reason.
- **Wow:** A direct contradiction of a portal they already distrust, before spending anything or handing over an account.
- **Where:** Pre-signup, on the landing page.
- **Time-to-aha:** Under 60 seconds from landing.
- **Comparable evidence:** **Lovable** — a working app generated from a prompt pre-signup, in roughly 60 seconds. **Perplexity** — a cited answer with no login required. **Jobright** — claims a match "in less than 1 min", which sets the category's speed expectation.
- **Risk:** Two structural blockers, not merely risks. It asks for a résumé *before* the confidentiality guarantee has been made, inverting the parse-then-confirm and data-minimisation posture. And demonstrating "what the portals recommended" requires LinkedIn or Naukri data, which is excluded by a locked decision (*hiQ v. LinkedIn*). Stripped of the comparison it degrades into a weaker Candidate 1, run before the résumé has been earned.
- **Metric:** 25% of landing-page visitors complete the check; 40% of completers create an account.

### Candidate 3: Surviving the thin day

- **Action:** The user returns on a day when the list is thin — nought to two roles — and reads the honest arithmetic instead of a padded list.
- **Wow:** The product did not inflate the list to look useful, and the shortfall is attributed to registry coverage rather than to them.
- **Where:** Day 3–7, on the first thin day.
- **Time-to-aha:** Within week 1.
- **Comparable evidence:** **Zerodha** — honesty and the refusal to advertise compounding into trust over time. **Duolingo** — the return itself is the activation signal. **Slack** — 2,000 messages per team as the habit threshold at which retention jumps to 93%.
- **Risk:** Far too late. It sits days past the 90-second window in which D1 retention is decided, and it depends on a thin day actually occurring in week one. It is also the only candidate whose success is outside the team's control.
- **Metric:** D7 return rate for users whose day-2 or day-3 list held ≤2 roles, against those with 3+. Within 10 points of each other means the honest empty state retains.

**Keep Candidate 3 regardless of the primary.** It is the only one of the three that tests Open Question 2 in `docs/PROJECT-STATE.md` — whether the honest empty state genuinely retains the poorly-served segments or merely disappoints them more politely. That question is currently unvalidated and this is a measurable way to answer it.

---

## Sources

- [Mobile App Engagement in 2026: Fixing the First Session](https://userpilot.com/blog/mobile-app-engagement/) — D1 retention averages 25–30% and is decided in the first 90 seconds of the first session.
- [The Aha Moment: How to Identify It With Data, Not Assumptions](https://userpilot.com/blog/aha-moment/) — users completing an achievement on day zero retain at 56.89%; those who have not by day 30 retain at 4.08%.
- [App Retention Benchmarks for 2026](https://enable3.io/blog/app-retention-benchmarks-2025) — apps activating users within 3 minutes see nearly 2x higher retention; aha within 5 minutes yields 40% higher 30-day retention than 15+ minutes.
- [How to Increase User Activation in SaaS (2026)](https://kompassify.com/blog/how-to-increase-user-activation) — a well-defined aha moment produces 30–40% activation that predicts retention; target under 20 minutes for self-serve.
- [Explainable recommendation: when design meets trust calibration](https://link.springer.com/article/10.1007/s11280-021-00916-0) — explanations can *mis*calibrate trust as easily as build it; black-box opacity weakens a user's ability to judge when to follow or reject system output. This is the research basis for the reason line attached to every score and every refusal, and for treating a wrong refusal as the primary risk.
- Category comparables and the Jobright speed claim were captured from live pages during the Design phase; see `productos/design/1-Product-Identity.md` Sources.
- Customer evidence: [`2-Customer-Persona.md`](../define/2-Customer-Persona.md) §9 (the objection that kills the deal, and the demonstration that beats it).
