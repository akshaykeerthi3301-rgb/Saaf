# Landing Page

*Drafted: September 2026. Generated from `docs/PRODUCT.md`, `productos/design/1-Product-Identity.md`, and `productos/design/2-Magic-Moment.md`, against `productos/design/BONUS-Web-Landing-Page-Best-Practice.md`.*

## Summary

A **#3 Product-Visual Hero** page in **11 sections**, promising the magic moment as its headline and repeating a single four-word CTA in all three placements. The hero visual is the side-by-side refusal — a portal's "Top Applicant" badge on a fifteen-year role, beside Saaf withholding that same role with the reason stated.

> **Product surface:** web only, hosted on a Vercel free subdomain. No mobile app is planned, so there are no App Store badges anywhere on this page and `studio-design-app-listing` does not apply. The Hobby plan's non-commercial terms remain binding — see *What it costs*.

> **Three sections substituted, not deleted.** The canonical structure calls for a customer logo bar, deep social proof with named case studies, and a three-tier pricing table. Saaf has zero users, zero customers, zero reviews, and exactly one price. The reference doc resolves the first two itself, in its own anti-pattern list: *"The 'Trusted By' Section With No Logos — the tagline without the proof. Either show the logos or remove the section."* Rather than delete them, each is replaced with **published self-audit** — first-party, verifiable, and impossible for a competitor to copy without publishing their own refusals.
>
> | Slot | Canonical | Saaf |
> |---|---|---|
> | 3 | Social Proof Bar (5–8 logos) | **Gate-audit strip** — live indexed / withheld / boards counts |
> | 7 | Deep Social Proof (case studies, star rating) | **The public gate audit** — refusal counts by reason, updated daily |
> | 8 | Pricing (3 tiers) | **What it costs** — one line, ₹0, and why it stays that way |

> **Trust cost worth naming:** a `saaf.vercel.app` URL is a real, if mild, credibility drag on a page asking a stranger to upload their résumé. It is addressed with the open-sourced gating code in the footer and a plain FAQ answer, not papered over.

## The Magic Moment we're promising

> When the candidate reads the withheld section of their first shortlist and recognises a disqualifier as true, software has told them no with a reason they know is correct.

**Hero promise:** "Nothing in your list is a job you can't get."
**Primary CTA:** "Show me what's withheld"
**Sticky CTA:** "Show me what's withheld"

---

## The page

### Header

- **Logo:** "Saaf" wordmark, left-aligned, plain text, no mark or symbol.
- **Nav:** How it works · Gate audit · FAQ · Log in
- **CTA (sticky):** "Show me what's withheld"
- **Reference:** Web Landing Page Tactics #1–2 (Stage 1 — The Header / Nav). Principle #4 (Sticky CTA Beats Hero CTA Alone).

### Hero

- **Goal:** State the one promise and prove it inside the same viewport, so the visitor sees the product refusing something before they scroll.
- **Headline:** "Nothing in your list is a job you can't get." *(10 words)*
- **Sub-headline:** "A free daily shortlist for Indian professionals in their first five years. We publish what we withheld, and why."
- **CTA:** "Show me what's withheld" *(4 words)*
- **Visual direction:** Split composition, no gradient, no glow. Left panel — a job portal's interface with a "Top Applicant" badge on a role whose stated requirement is fifteen years. Right panel — the same role inside Saaf, title struck through, reason beneath: *"Withheld — asks for 15 years; you have 2."* Flat fills, hairline rule between the panels, square corners throughout. This is the refusal screenshot named in `docs/PRODUCT.md` as the first earnable proof, placed where it does the most work.
- **Above-fold social proof:** No testimonial and no logo bar — neither exists, and inventing one would violate both the identity and the reference doc. In their place, the live arithmetic strip (section 3), which sits at the fold and is first-party verifiable.
- **Reference:** Tactic #3 (The 10-word Value-Prop Headline), Tactic #4 (The Specific Sub-Headline), Principle #2 (Show, Don't Describe), Principle #8 (Demonstrate the Product on the Page, Not in a Video).

### Gate-audit strip *(substituted for the Social Proof Bar)*

- **Goal:** Deliver above-the-fold proof without borrowing anyone else's credibility.
- **Content:** Four figures in monospace, tabular, no tagline above them — "3,214 indexed today · 1,902 withheld · 47 boards · 100% of refusals published"
- **Visual direction:** Single row at the fold, hairline rule above and below, JetBrains Mono, no icons, no logos.
- **Reference:** Tactic #7 (The Logo Bar Below the Hero) — **substituted per the doc's own anti-pattern rule**, "either show the logos or remove the section." Also satisfies Principle #5 (Social Proof Above the Fold) with first-party evidence instead of borrowed.

### Problem

- **Goal:** Name the pain in the customer's own language before offering anything.
- **Headline:** "The match wasn't missing. It was wrong."
- **Body:** "A portal called you a Top Applicant for a role asking fifteen years. You have two. You spent the forty minutes anyway, and heard nothing — same as the last thirty applications. Eight months in, you still don't know whether it was the résumé, the fit, or the timing."
- **Visual direction:** A cited quote block, set as a document excerpt rather than a testimonial card — *"not even one call."* — attributed to a Blind thread, Bangalore, 13+ years, 50+ applications across all three portals. External evidence about the category, not a claim about Saaf.
- **Reference:** Tactic #9 (The Problem Statement).

### Solution / How It Works

- **Goal:** Show the mechanism in three steps so the refusal reads as engineering rather than opinion.
- **Step 1:** "We read your résumé once" + "Parsed to fill your profile, then deleted. You confirm every field before anything runs." + Visual: the confirm screen with its provenance notes.
- **Step 2:** "We remove what you can't get" + "Each function's real disqualifier — a credential, an experience band, a budget scale — applied as a hard filter, in plain code." + Visual: the typed-gate branch, five functions, five different gates.
- **Step 3:** "We show you both lists" + "What cleared, ranked with reasons. And what we withheld, with the reason for each." + Visual: the shortlist with the withheld section open.
- **Reference:** Tactic #10 (The Three-Step How-It-Works).

### Features as Benefits

- **Goal:** Convert four mechanism details into things the candidate gets.
- **Benefit 1:** "A credential can't be stretched" + "Finance gates on CA, CFA or CS. Marketing gates on budget scale. We check the one that applies to you, not years for everyone."
- **Benefit 2:** "Every score carries its reason" + "*72% — GTM and stakeholder management match; the three-year floor is your one gap.* No number arrives without its working."
- ~~**Benefit 3:** "Nothing invented in your documents"~~ — **CUT 2026-09-03 (Open Question Q1).** Document generation and the fabrication guard are P2, so the page must not promise them. Restore this benefit only when the feature ships. The page now runs three benefits, not four.
- **Benefit 4:** "Nobody can find you here" + "Your file is deleted after parsing. No employer is contacted. Delete your account in one click, no email required."
- **Reference:** Tactic #11 (Features as Benefits, Not Feature Lists). Avoids the *Feature List* anti-pattern.

### The public gate audit *(substituted for Deep Social Proof)*

- **Goal:** Replace borrowed credibility with published self-audit — the only proof available to a product with no users, and the more durable kind.
- **Headline:** "We publish what we refused."
- **Body:** "Today: 3,214 indexed · 1,902 withheld — 1,204 experience band · 431 credential · 198 location · 69 channel scale. Updated daily."
- **Supporting line:** "The gating code is open source. Read the exact rules that decide what you don't see."
- **Visual direction:** A table in nutrition-label form — reason on the left, count right-aligned in tabular monospace, hairline rules between rows. Deliberately unglamorous. No chart, no colour, no illustration.
- **Reference:** Tactics #12–13 (Deep Social Proof) — **substituted.** No competitor publishes this, and none can without contradicting their own conversion numbers.

### What it costs *(substituted for Pricing)*

- **Goal:** State the price plainly and close the "what's the catch" objection before the FAQ has to.
- **Headline:** "Free. Not free-for-now."
- **Body:** "No card, no ads, and no paid tier hiding behind a feature you already use. Saaf is a portfolio project built to real-product standards, and it stays at ₹0."
- **Visual direction:** One line of text, full measure, no tier cards, no toggle, no comparison table.
- **Reference:** Tactic #14 (Pricing on the Page) — **adapted to a single price.** Avoids the *Hidden Pricing* anti-pattern by disclosing fully. A tier table is not merely unnecessary here: advertising a paid product would breach the Vercel Hobby non-commercial terms this product is hosted under.

### FAQ

- **Q1:** "Naukri already says it matches me. Why is this different?" — A: "Because we'll show you the roles we refused, and why. Open your own profile and check the first one against the job description. It takes thirty seconds."
- **Q2:** "Can my employer find out I'm looking?" — A: "No. No employer is ever contacted, nothing here is public or sold, and no recruiter can search this. Delete your account in one click, no email required."
- **Q3:** "What happens to my résumé?" — A: "It's parsed once to fill your profile, then the file is deleted. Only the fields you confirm are stored."
- **Q4:** "Why isn't LinkedIn or Naukri in here?" — A: "Their terms don't allow it. We pull from company hiring boards directly — which is why some roles you see elsewhere won't appear here, and why we tell you how many we indexed."
- **Reference:** Tactic #15 (The FAQ Defuses Objections, Doesn't List Features). Q1 is the deal-killing objection from `2-Customer-Persona.md` §9, answered with a demonstration rather than a claim.

### Final CTA

- **Headline:** "See what we won't show you."
- **CTA:** "Show me what's withheld"
- **Low-friction alternative:** "Read the gating code"
- **Visual direction:** Full-measure band, ink on ground, single button, one text link beneath. No form, no email capture.
- **Reference:** Tactic #16 (The Final CTA). Principle #3 (One CTA Above the Fold, Same CTA Everywhere).

### Footer

- **Compliance badges:** **None.** SOC 2 and GDPR marks would be fabrication — neither is held. Displaying them is the *"Trusted By" With No Logos* anti-pattern wearing a different hat.
- **Links:** "Gating code on GitHub" · "Gate audit, updated daily" · "How we handle your data" · "Delete your account"
- **Data note:** One line on the DPDP posture — consent at upload, stated retention, deletion path, source file destroyed after parsing.
- **Reference:** Tactic #17 (The Footer as Trust Surface) — **adapted.** Badges not held are not displayed; the open-sourced gate and the live audit carry the trust load instead.

---

## Anti-patterns avoided

- **The "Trusted By" Section With No Logos.** No logo bar, no invented customers. Replaced with first-party audit figures that are true today.
- **The Stock Illustration Hero.** The hero is the product refusing a real role, not an abstract graphic. The identity forbids gradients, orbs and glassmorphism outright.
- **The Multi-CTA Hero.** One CTA — "Show me what's withheld" — identical in the header, the hero, and the final band.
- **The "Submit" Button.** Every button names the outcome in the first person.
- **The Hidden Pricing.** The price is ₹0 and it is stated in its own section, not buried.
- **The Feature List.** Four benefits, each phrased as something the candidate gets, none as a capability the product has.
- **The 30-Section Page.** Eleven sections, three of them a single line.

## Refresh cadence

Recommended next refresh: **45 days** from first publication. First A/B test: **the hero headline** — *"Nothing in your list is a job you can't get."* against a refusal-first variant such as *"We'll show you the jobs we refused, and why."* The second is more distinctive and less legible; that is exactly the trade worth measuring.

Refresh trigger: traffic-to-signup conversion below **3%** sustained for 14 days, or résumé-upload completion below **50%** (the Screen 2 drop-off risk named in `3-Onboarding-Flow.md`).

Instrument from day one: hero CTA click-through, sticky CTA engagement, scroll depth to the gate-audit section, and gate-audit-to-signup rate. That last one is the page's real hypothesis — that published refusals convert better than borrowed testimonials.

## Sources

- Reference: [`BONUS-Web-Landing-Page-Best-Practice.md`](BONUS-Web-Landing-Page-Best-Practice.md) — Decision Tree pattern #3 (Product-Visual Hero, via the fallback rule), Tactics #1–4, #7, #9–17, Principles #2–5, #8.
- Tone of voice: [`1-Product-Identity.md`](1-Product-Identity.md)
- Magic moment: [`2-Magic-Moment.md`](2-Magic-Moment.md)
- Onboarding: [`3-Onboarding-Flow.md`](3-Onboarding-Flow.md) — the page's promise must be deliverable by Screen 6.
- Product context: [`docs/PRODUCT.md`](../../docs/PRODUCT.md)
- Design tokens: [`docs/DESIGN.md`](../../docs/DESIGN.md)
- Customer evidence: [`2-Customer-Persona.md`](../define/2-Customer-Persona.md) §8–9 (the pain language and the deal-killing objection).
