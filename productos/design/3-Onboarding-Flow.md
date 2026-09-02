# Onboarding Flow

*Drafted: September 2026. Generated from `docs/PRODUCT.md`, `productos/design/1-Product-Identity.md`, and `productos/design/2-Magic-Moment.md`, against `productos/design/onboarding/BONUS-Mobile-Onboarding-Best-Practice.md`.*

## Summary

A **Switcher Funnel** (Decision Tree pattern #4) in **7 screens**, reaching the magic moment at **Screen 6** in an estimated **63 seconds** — 30% inside the 90-second target. The flow opens by naming the portals the candidate is leaving, takes one input, and spends everything else getting to a refusal the candidate recognises as true.

> **Two deliberate departures from the reference doc, both load-bearing.**
>
> **1. The reference is monetisation-spined; this product has no monetisation.** Its meta-rule is *"The Onboarding **Is** the Paywall."* Stage 4 is entirely paywall tactics, and the stated rationale for its central prescription — a 15–25 question quiz — is that *"the user has not invested enough sunk cost to push past the paywall."* Saaf is ₹0 forever with no paid tier. Remove the paywall and the argument for a long quiz collapses with it. Stage 4 and the monetisation principles are **discarded, not adapted**; Stages 1–3 are used.
>
> **2. The decision tree's stop-at-first-yes rule lands on #2 Goal-First Quiz** — a job switch is a long-term goal. Overridden deliberately. #2 prescribes 20–40 screens and a hard paywall, contradicting both the ₹0 model and the 90-second target. **#4 Switcher Funnel** fits what the customer research actually says: Rohan is on Naukri, LinkedIn, Instahyre and Cutshort *right now*, and his deal-killing objection is *"Naukri already says it matches me. Why would yours be any different?"* This flow's magic moment is the answer to that sentence.

## The magic moment we're engineering toward

> When the candidate reads the withheld section of their first shortlist and recognises a disqualifier as true — *"asks for a chartered accountant; your profile doesn't carry one"* — software has told them **no**, with a reason they know is correct.

**Position:** Screen 6 of 7.
**Time-to-aha target:** Under 90 seconds from confirming the profile. Estimated actual: ~63 seconds from Screen 1.
**Success metric:** ≥60% of new profiles engage the withheld section during session 1, and fewer than 5% file a "this shouldn't be here" report against it.

---

## The flow

### Screen 1 — Where are you applying now?

- **Goal:** Open with a question that names the incumbent the user is leaving, establishing the comparison this product wins on.
- **User action:** Multi-select one to four options, tap Continue. ~5 seconds.
- **Copy:**
  - Headline: "Where are you applying now?"
  - Sub: "So we know what you're comparing us against."
  - Options: "Naukri" · "LinkedIn" · "Instahyre" · "Cutshort" · "Referrals only"
  - CTA: "Continue"
- **Wireframe:** Progress bar at 10%. Headline top-aligned, five stacked square multi-select rows, primary CTA pinned to the bottom. No logo, no splash.
- **Drop-off risk:** Reads as data collection with no benefit stated. Mitigated by the sub-line naming the purpose in seven words.
- **Reference:** Mobile Onboarding Tactic #1 (Open With a Question, Not a Logo) + Decision Tree pattern #4 (Switcher Funnel).

### Screen 2 — Upload your résumé

- **Goal:** Collect the single input the entire product runs on, and make the deletion promise at the moment of the ask rather than in a policy page.
- **User action:** Tap to select a file. ~15 seconds.
- **Copy:**
  - Headline: "Upload your résumé"
  - Sub: "We read it once to fill in your profile, then delete the file. Only the fields you confirm are stored."
  - CTA: "Choose file"
  - Secondary: "Type it in instead"
- **Wireframe:** Progress 25%. Dashed upload box occupying the middle third, sub-line beneath it, primary CTA, ghost secondary below.
- **Drop-off risk:** **The highest-drop screen in the flow.** Handing a résumé to an unknown product is the largest ask here, and Meera — the most exposed of the five personas, whose own HR team would know instantly — plausibly stops at this screen. Mitigated by stating deletion *at* the ask, and by offering manual entry as a full alternative rather than a dead end.
- **Reference:** Mobile Onboarding Principle #7 (Permissions Have an Aha Moment Too). Avoids the *Email Wall* anti-pattern — no account is required to reach this point.

### Screen 3 — Reading your résumé

- **Goal:** Cover parse latency without manufacturing false authority.
- **User action:** Wait. ~8 seconds.
- **Copy:**
  - Headline: "Reading your résumé"
  - Status line 1: "Found 4 roles and 2 employers."
  - Status line 2: "Matching your skills to the ESCO occupation vocabulary."
  - Status line 3: "Your file is deleted. Only the parsed fields remain."
- **Wireframe:** Progress 40%. Headline, a hairline progress rule, three monospaced status lines appearing in sequence. No spinner, no shimmer.
- **Drop-off risk:** An eight-second wait with nothing visible reads as broken. Mitigated by status lines that report real work rather than filling time.
- **Reference:** Mobile Onboarding Tactic #7 (The "Analyzing Your Answers" Loading Screen) — **adapted, not followed.** The doc prescribes rotating testimonials and a user count. This product has zero users, and the identity forbids claims it cannot show its working for. Replaced with genuine parse telemetry, which does the same trust work honestly.

### Screen 4 — Confirm what we read

- **Goal:** Get every field confirmed by the candidate, because the gates are only as honest as the profile they run against.
- **User action:** Scan six pre-filled fields, correct any that are wrong, tap Continue. ~30 seconds.
- **Copy:**
  - Headline: "Confirm what we read from your résumé"
  - Sub: "Nothing runs until you've checked every field."
  - Field labels: "CURRENT TITLE" · "EMPLOYER" · "YEARS OF EXPERIENCE" · "FUNCTION" · "CITY" · "WORK AUTHORISATION"
  - Provenance note on each: "read from your résumé"
  - CTA: "Looks right"
- **Wireframe:** Progress 60%. Scrollable stack of six labelled inputs, each pre-filled and tagged with its provenance note, CTA pinned to the bottom.
- **Drop-off risk:** The longest screen in the flow and the only one demanding real reading. Mitigated by pre-fill — this is a scan, not a form, and no field is ever empty.
- **Reference:** Mobile Onboarding Tactic #5 (Multiple-Choice Only, Sparingly Sliders). Pre-filling converts typing into confirmation, which is the same latency saving by another route.

### Screen 5 — The gate that applies to you

- **Goal:** Ask the one function-typed question that determines this candidate's real disqualifier, and make the branch visible.
- **User action:** One tap. ~5 seconds.
- **Copy:**
  - Headline, branching on the function confirmed at Screen 4 — finance: "Which credential do you hold?" · engineering: "How many years have you worked?" · marketing: "Largest paid budget you've owned" · consulting: "Where did you study?" · HR: "Recruitment or generalist?"
  - Sub: "Finance gates on a credential, not on years. We check the one that actually applies to you."
  - Options (finance variant): "CA" · "CFA" · "CS" · "None of these"
  - CTA: "Continue"
- **Wireframe:** Progress 80%. Headline, four square options, explanation beneath, CTA.
- **Drop-off risk:** "None of these" can feel like self-elimination. Mitigated by the sub explaining that naming the gate is what prevents wasted applications — and by the locked decision that nobody is ever turned away.
- **Reference:** Mobile Onboarding Tactic #6 (Branch Visibly). The doc calls branching *"the illusion of intelligence."* Here it is not illusion — the typed requirement model is the actual engine, and this screen is the user's first sight of it.

### Screen 6 — Your first shortlist ★

- **Goal:** Deliver the recognised refusal.
- **User action:** Read. Scroll into the withheld section.
- **Copy:**
  - Headline: "3 roles cleared your experience band"
  - Arithmetic line: "3,200 indexed · 47 in your function · 3 cleared"
  - Cleared row: "Associate Product Manager · Razorpay · Bengaluru" — "72% — go-to-market and stakeholder management match; the job description's three-year floor is your one gap."
  - Stretch row: "STRETCH · 1 YEAR GAP" — "Growth Marketing Lead · slice · Bengaluru"
  - Withheld heading: "44 roles withheld today"
  - Withheld row: "Manager, Financial Planning · Meesho — Withheld: asks for a chartered accountant; your profile doesn't carry one. A credential can't be stretched."
  - Withheld row: "Principal Engineer · Postman — Withheld: asks for 15 years; you have 2."
  - Per-row link: "This shouldn't be here"
- **Wireframe:** No progress bar — onboarding is over. Three cleared rows separated by hairlines, one tinted stretch row, then the withheld section **open by default** with struck-through titles and stated reasons.
- **Magic moment:** This is where the user hits the recognised refusal — software saying no, with a reason they know is correct.
- **Drop-off risk:** **The user never scrolls to the withheld section and the aha silently fails to fire.** Mitigated by putting the withheld count in the arithmetic line above the fold, and by keeping the section expanded rather than collapsed behind a control. Second risk, carried from `2-Magic-Moment.md`: a *wrong* refusal, which inverts the aha into the exact injury this product exists to fix — hence the per-row report link and the two-sided success metric.
- **Reference:** Mobile Onboarding Tactic #8 (The Personalized Plan Reveal) — **inverted.** The doc's reveal shows the user what they are about to unlock. This one shows them what was taken away, and that is the harder and more credible move.

### Screen 7 — Tomorrow's list

- **Goal:** Convert a single session into a habit, asked only after the value has already landed.
- **User action:** Allow or skip. One tap.
- **Copy:**
  - Headline: "Want tomorrow's list?"
  - Sub: "One email a day, only when something new clears your gates. Some days it'll be empty and we'll say so."
  - CTA: "Send me the daily list"
  - Secondary: "No, I'll check myself"
- **Wireframe:** A sheet over the shortlist. Headline, sub, primary CTA, ghost dismiss. The shortlist stays visible behind it.
- **Drop-off risk:** Permission fatigue. Mitigated by arriving after the aha rather than before it, and by promising empty days up front — a negative promise no competitor makes, and one that costs nothing to keep.
- **Reference:** Mobile Onboarding Principle #7 (Permissions Have an Aha Moment Too). Avoids the *Permission Walls on Screen 2* anti-pattern.

---

## Anti-patterns avoided

- **The Email Wall.** No account is required until after Screen 6. The user reaches the magic moment before they are asked to become a user.
- **Permission Walls on Screen 2.** The only permission ask sits at Screen 7, after the value has landed.
- **The Generic Loading Screen.** Screen 3 reports real parse telemetry instead of filling time with a spinner — and instead of the rotating testimonials the reference prescribes, which this product cannot honestly show.
- **The 3-Screen Feature Tour.** There is no tour. Every screen either takes an input or returns a result.
- **The paywall stack entirely** — hard paywall, trial framing, win-back discounts, the commitment question that primes a purchase. All discarded. There is nothing to sell, and importing the choreography of selling into a free product would read as a bait-and-switch.

## Success metric

**Primary, from `2-Magic-Moment.md`:** ≥60% of new profiles engage the withheld section during session 1, and fewer than 5% file a "this shouldn't be here" report against it. The metric is deliberately two-sided — engagement alone would look like success even while the gate was quietly wrong.

**Supporting funnel metrics worth instrumenting before any code ships:**

- **Screen-by-screen drop-off**, with particular attention to Screen 2. If résumé upload converts below 50%, the confidentiality promise is not landing and the copy — not the flow — is the problem.
- **Completion rate to Screen 6**, and the median wall-clock time to reach it. The design target is 63 seconds; anything above 90 means screens must merge.
- **Manual-entry rate** at Screen 2. A high rate is not a failure — it is a direct measurement of how much the résumé ask costs in trust.

## Wireframe

A clickable HTML wireframe is at `productos/design/onboarding-wireframe.html` — open it in any browser and click through to feel the flow. Screen names and copy match this document exactly; if they drift, this spec is stale.

## Sources

- Reference: [`BONUS-Mobile-Onboarding-Best-Practice.md`](onboarding/BONUS-Mobile-Onboarding-Best-Practice.md) — Decision Tree pattern #4 (Switcher Funnel), Stages 1–3, Tactics #1, #5, #6, #7, #8, Principle #7. Stage 4 discarded.
- Tone of voice: [`1-Product-Identity.md`](1-Product-Identity.md)
- Magic moment: [`2-Magic-Moment.md`](2-Magic-Moment.md)
- Product context: [`docs/PRODUCT.md`](../../docs/PRODUCT.md)
- Customer evidence: [`2-Customer-Persona.md`](../define/2-Customer-Persona.md) §9 (the objection that kills the deal) and [`2b-Persona-Set.md`](../define/2b-Persona-Set.md) (the function-typed gates behind Screen 5)
