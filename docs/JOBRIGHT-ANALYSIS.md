# Will finishing the roadmap make Saaf a ditto of Jobright.ai for India?

*Written 2026-09-05, against every product document in the repo and against
Jobright.ai probed live the same day (homepage text via fetch, homepage
rendered via screenshot — a logged-in dashboard was not accessible and is
called out below wherever that matters). Answers the question as put: **once
the roadmap is complete, is Saaf an Indian ditto of Jobright, with a better
front end?***

---

## The verdict

**No, on both halves — and not by an oversight the roadmap will close, but by
four decisions this project made on purpose and locked in `PROJECT-STATE.md`.**
Reversing any one of them would make Saaf more Jobright-shaped; reversing all
four is a different product, built by a different team, on a different
budget. The roadmap as it stands (Phase 7, `docs/ROADMAP.md`) targets
**JobMatchAI**, a much smaller India-based competitor — that scope was set
explicitly two turns ago and this document does not reopen it. It answers a
different question: even fully built, does the *combination* of the current
roadmap converge on Jobright? It does not, and the gap is named precisely
below so the choice to close it — or not — is the founder's, made with the
actual cost in view.

On the front end: **better on the one axis Saaf's design system was built to
win — trust through plainness and a transparent score — and not better, nor
attempting to be, on production polish, marketing sophistication, or breadth
of surface.** Those are different metrics, not points on the same scale, and
no task in the current roadmap touches the design system at all. See §3.

---

## 1. How this was checked

| Source | What it settles |
|---|---|
| `jobright.ai` homepage, fetched live 2026-09-05 | Feature list, scale claims, pricing signal |
| `jobright.ai` homepage, screenshotted live 2026-09-05 | Visual design language (§3) |
| `docs/PRODUCT.md` — Summary, Mechanism, Why, Business model, Proof, and its own 2026-09-04 amendment | What Saaf claims to be, and what the pivot already broke in that claim |
| `docs/PRD.md` § 13 Out of Scope | What is permanently excluded vs. merely deferred |
| `docs/PROJECT-STATE.md` — Locked decisions table, § The pivot | What cannot be undone without a deliberate reversal |
| `docs/ROADMAP.md` Phase 6–7 | What is actually scheduled to be built |
| `docs/PARITY.md` | The JobMatchAI-specific comparison this analysis sits beside, not on top of |
| `docs/DESIGN.md` / `DESIGN.html` | The shipped design system, for §3 |

**Not verified:** Jobright's signed-in dashboard, its actual match-score
breakdown UI, its mobile app, and its employer-side product. The nav bar
carries an "Employers" tab and an "AI Agent" tab, both unopened. Claims below
about those surfaces are marked *(stated, not observed)*.

---

## 2. Nine structural axes

Ordered by how hard each is to close. A "Locked" verdict means
`PROJECT-STATE.md` names the decision explicitly; "Unscoped" means no document
in the repo — not the roadmap, not `PARITY.md`, not the PRD — mentions it at
all, which is a different and in some ways more honest gap than a locked one.

| # | Axis | Jobright (verified 2026-09-05) | Saaf, roadmap fully built | Verdict |
|---|---|---|---|---|
| 1 | **Index scale** | 8,000,000+ jobs, 400,000+ new/day, broad aggregation | 31 boards today (~700–1,100 live India roles); ~300 boards / ~3,000 roles is the stated ceiling in `PRODUCT.md` | **Locked, 1,000–3,000× apart.** `PROJECT-STATE.md`: "the registry is the moat" — this gap is the product's own thesis, not an unbuilt feature |
| 2 | **Sourcing method** | Broad aggregation *(stated, not observed — likely includes third-party boards at a breadth Saaf's model excludes)* | Six ATS providers' own zero-auth public APIs only. LinkedIn and Naukri excluded by name | **Locked.** `PROJECT-STATE.md`: *hiQ v. LinkedIn* — $500k judgment, permanent injunction. Non-negotiable per the doc's own language |
| 3 | **Auto-apply** | "Jobright Agent": one-click autofill across ATS forms, apply to "hundreds of jobs daily" — their headline mechanic | Explicitly and permanently excluded: `PRD.md` §13, *"Saaf is pre-application and never applies on the candidate's behalf"* | **Locked.** Not a missing feature — the opposite of a stated product identity |
| 4 | **Referral / alumni graph** ("Insider Connections", "TNT Network") | Alumni + hiring-manager matching, claims 4× interview lift via referral | **Absent from every document.** Not in `PRD.md` scope, not in `PARITY.md`, not in `ROADMAP.md` Phase 7 | **Unscoped**, not locked — nobody has decided against this, it has simply never been discussed. The one gap on this list that isn't a deliberate choice |
| 5 | **Matching mechanic** | AI-driven match score, marketed as "strongest in the market" *(breakdown UI not observed)* | Six weighted components (title 28 / seniority 25 / skills 20 / location 10 / credential 10 / work mode 7), every component shown with the sentence it was read from | **Converged, differentiated by transparency.** Both products now *score and rank* — see §4, this is the load-bearing finding |
| 6 | **Document generation** | AI Résumé Builder + tailoring, ~6 seconds, no published integrity guarantee | Planned (`ROADMAP.md` TASK-063/064), gated behind the **fabrication guard**: blocks any generated claim the confirmed profile doesn't support | **Surface parity reachable; mechanism intentionally stricter.** A trust feature, not a speed feature — Saaf's version will be slower and will sometimes refuse |
| 7 | **Ongoing AI copilot** ("Orion", 24/7) | An always-available conversational agent across the whole job search | Planned: a **one-shot** interview-question generator (TASK-065) and a **transactional** goals/accountability-email tool (TASK-066), sequenced last and flagged in `ROADMAP.md` as "reconsider scope before building" | **Not ditto even fully built.** Bounded tools, not a standing agent |
| 8 | **Pricing** | $39.99/mo tiered (raised 33% from $29.99 per `PRODUCT.md`'s own competitor research), 2,000,000+ registered users | ₹0 forever, no paid tier — `PROJECT-STATE.md` locked, tied to Vercel Hobby's non-commercial terms | **Locked, definitionally.** "Ditto" is impossible here without reversing the ₹0 decision and the hosting choice under it |
| 9 | **Platform / scope** | Web + an "Employers" tab *(stated, not observed — implies a two-sided product)* | Web only. Employer accounts, mobile apps, payments and teams all named "permanently out of scope by product decision" in `PRD.md` §13 | **Locked.** A two-sided marketplace is a different company, not a feature |

---

## 3. The front end, specifically

The question asked whether Saaf's front end will be *better*. It's answerable,
but only by naming the axis — "better" is not one number.

**What was actually looked at.** Jobright's homepage, live: a mint-green
gradient ground, an autoplaying product-tour video in a rounded browser-chrome
frame, an animated mascot logo, four trust badges (Product Hunt #1, "Featured
by OpenAI", a 4.8/5 Trustpilot rating, "2,000,000+ trusted users"), and
conversion-first copy — *"No More Solo Job Hunting. Do it with AI."* This is a
fully realised, professionally produced consumer-SaaS front end, and it
reads as one: the visual grammar (soft gradients, rounded corners, animation,
social proof) is the same grammar as most funded consumer products in this
category, because it's optimised for the same thing they're optimised for —
converting a cold visitor in the first five seconds.

**What Saaf's front end is built to do instead**, per `docs/DESIGN.md`'s own
description: *"a product whose core visual act is publishing the working
behind a number."* Monochrome (`#141414` ink on `#F0F0F0` paper), zero
shadows, one 2px radius reserved for form inputs only, hairline rules, Public
Sans — chosen, per the design doc, because it's *"the typeface of United
States civic notices"* — and JetBrains Mono for every figure. Error red is
reserved exclusively for system failures and is never used to colour a match
outcome, on the explicit theory that colouring an honest low score red would
"reframe an honest answer as a failure." Every score renders with its
component breakdown next to it, not as a bare percentage. WCAG 2.1 AA was
verified as a launch task (`ROADMAP.md` TASK-048).

**These are not competing answers to the same question.** Jobright's front
end is built to persuade; Saaf's is built to be checked. On *that* axis —
does the interface behave like a claim you can verify rather than a claim you
have to trust — Saaf's is more disciplined, and DESIGN.html says as much
directly: *"nothing here is trying to persuade you, which is exactly why you
believe it."* On production polish, motion design, marketing sophistication,
and breadth of surface (there is no Saaf equivalent of Jobright's
autoplaying hero video or its employer-side pages), Jobright's is more
developed — reasonably so, for a funded product with ~2M registered users
built by a team, compared to a solo ₹0 portfolio artifact.

**The finding that matters for "once the roadmap is finished":** none of it
changes either way. **No task in Phase 6 or Phase 7 touches `DESIGN.md` or
adds a design task.** The parity work adds screens (a tracker, a paste-a-JD
page, a résumé checker) built *from* the existing design system, not screens
that revise it. Whatever "better than Jobright's front end" means to you
today, it will mean exactly the same thing after Phase 7 ships — the roadmap
doesn't move this needle in either direction. If a sharper visual gap with
Jobright specifically is wanted, that is a new, unscoped design task, not a
side effect of anything currently planned.

---

## 4. The one finding that matters more than the feature checklist

`docs/PRODUCT.md` carries its own amendment, dated 2026-09-04, written when
Stage A replaced gating with ranking. It says, in its own words:

> *"The differentiation rested on gating where others weigh. Saaf now weighs
> too... The open question this leaves: why Saaf rather than Jobright, now
> that both rank? That is a positioning decision for the founder, not
> something a build session should answer by rewriting this page."*

This analysis is the first time that question has been answered rather than
just flagged. The answer, from everything above: **not the mechanism anymore
— the mechanism converged at Stage A.** What's left, and it is real, is:

- **The registry**, which compounds weekly and which Jobright cannot read
  (it is India-specific, ATS-direct, and privately held per the "open-source
  the gate, keep the registry private" locked decision).
- **The transparency of the number** — six named components with sentences,
  against a black-box score Jobright markets as "strongest in the market"
  without showing its work *(unverified against their actual dashboard, but
  nothing on their marketing surface claims this kind of breakdown)*.
- **The legal cleanliness of the supply chain** — no LinkedIn ToS exposure,
  which every scale competitor in this category structurally carries.
- **₹0**, which is either the whole point or an accident of scope depending
  on how the founder reads it — `PRODUCT.md`'s own Business model section
  calls it "a positioning decision, not deferred monetisation."

None of these is "we do what Jobright does but better." All four are "we do
something adjacent that Jobright structurally cannot." That is a coherent
strategy. It is a different strategy from "ditto, with a better front end,"
and the roadmap as scoped builds the first one.

---

## 5. A documentation gap this analysis found

`docs/PRD.md` §13 lists **"interview prep"** among features *"permanently out
of scope by product decision."* `docs/ROADMAP.md` Phase 7 — written one
session ago, from `docs/PARITY.md` — schedules **TASK-065: Interview Prep**
as an open task. Those two documents now disagree, and neither was written
with the other in view. Flagged here rather than silently fixed, since it's
exactly the kind of drift this session has spent most of its time reconciling
elsewhere — see the PRD §13 amendment applied alongside this document.

---

## 6. If "ditto" is actually the goal

Stated plainly, without a recommendation either way, so the choice is made
with the bill in view. Reaching Jobright-equivalence, not JobMatchAI-parity,
requires reversing — not building around — four rows from
`PROJECT-STATE.md`'s locked table:

1. **Drop the ₹0 lock**, and move off Vercel Hobby (its non-commercial terms
   are the reason ₹0 is enforced, not merely chosen).
2. **Build or license auto-apply**, reversing *"Saaf is pre-application and
   never applies on the candidate's behalf"* — the sentence the whole product
   is currently defined against.
3. **Widen sourcing past direct-ATS APIs**, which almost certainly means
   re-litigating the LinkedIn/Naukri exclusion this project adopted
   specifically because of *hiQ v. LinkedIn* — the single most-cited legal
   fact in `PROJECT-STATE.md`.
4. **Scope a referral/alumni graph feature** — the one gap on this list that
   isn't locked against, just never asked about, and the cheapest of the four
   to *decide on* even though it's the hardest to *source data for* without
   also touching #3.

Any one of these is a normal roadmap addition. All four together are a
different product than the one `PRODUCT.md` describes, built for a different
customer relationship (paid, high-touch, high-scale) than the one the five
personas were written around (free, precision-first, ₹0-anchored). That
tension is worth naming once, here, rather than discovering it after four
separate features are half-built.
