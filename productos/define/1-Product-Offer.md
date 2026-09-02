# Product Offer Framework

_Drafted: September 2026 — built from a founder session with live category research and live API probing (see Evidence Sources below). Customer, Pain, Outcome, Mechanism and Guarantee are founder-confirmed. Proof is a pre-launch placeholder tagged for validation — re-run `studio-define-offer-review` once the first cohort completes._

_Product name is a placeholder pending the Design phase (`studio-design-identity-creator`). "Jobmatch" below is the working directory name, not a decided brand._

A worksheet for defining your offer across the six core elements. Fill in each section below for your product in 1-2 sentences max.

## Describe your product using your product offer

> "For Indian professionals 0–5 years into their career who apply to 30–50 roles a quarter and hear nothing back, to help them avoid burning their effort on roles they were structurally disqualified from — the ones a major portal called them a 'Top Applicant' for while the posting asked for fifteen years and they have two — and achieve a daily shortlist where nothing is a role they cannot get and the order is their honest odds. **Jobmatch** does this by pulling roles from a curated registry of Indian company ATS boards, normalising every profile and job description through ESCO/O\*NET, and applying each function's own real disqualifiers (an experience band, a credential, a channel scale, an institute tier) as hard gates in plain code before any model is involved — backed by a public gate audit that shows exactly what it refused to show and why, and de-risked by three commitments: nothing you're disqualified from, nothing invented in your documents, nothing shared about your search."

---

## 1. Customer

*Who exactly is this for?*

> Good: specific, searchable, high value
> Bad: vague, broad, fuzzy

**Your answer:**

**Who the engine serves:** any corporate role. Matching runs on skills, years of experience, qualification and location — normalised through the ESCO and O\*NET occupation taxonomies — not against a role whitelist. A product manager and a chartered accountant are scored by the same engine.

**Who we name and launch to:** Indian professionals 0–5 years into their career, across business and technical corporate functions, who keep live profiles on LinkedIn, Naukri and Instahyre, apply to 30–50 roles a quarter, and get near-zero callbacks — because they apply late, in volume, to roles they were never a fit for.

`[India-only for v1 — the ATS registry, the language, and the first users are all Indian. ESCO is EU-built and O*NET is US, but both function as vocabularies anywhere, so geographic expansion is a registry problem rather than an engine problem.]`

`[Engine scope and launch wedge are deliberately different fields. The engine is general because skills-and-experience matching genuinely is; the named customer is narrow because with zero marketing budget the first fifty users come from the founder's own network. Linear, Stripe and Jobright all shipped general engines behind narrow offers.]`

---

## 2. Pain

*What problem are they struggling with right now?*

> Good: specific, urgent, costly
> Bad: vague, mild, hypothetical

**Your answer:**

The signal they get is not missing — it is confidently wrong. India's major portals rank candidates against roles they are structurally disqualified from: a candidate with two years of experience presented as **"Top Applicant"** on a posting that requires fifteen. Because the match arrives with confidence attached, the candidate spends the forty minutes, tailors the résumé, applies — and is filtered at the first automated screen for a disqualifier that was printed in the job description all along. Repeat that across 30–50 applications a quarter and the result is months spent on roles that were never winnable, zero callbacks, and no way to tell whether the problem was the résumé, the fit, the timing or the market. On the other side of the same transaction, roughly 80% of applications for Indian roles arrive via LinkedIn and roughly 95% are irrelevant to the posting — so recruiters stop reading, and callbacks collapse even for the candidates who *were* a genuine fit.

**Reproducible in one screenshot**, which is the bar: a portal's "Top Applicant" badge on a role whose stated requirement the candidate does not meet. Verbatim from the category, Blind (Bangalore, 13+ years, 50+ applications across all three portals): *"not even one call."*

---

## 3. Outcome

*What concrete result will they get?*

> Good: specific, tangible, measurable
> Bad: vague, broad, fuzzy

**Your answer:**

Nothing in your list is a role you cannot get, and the order is your honest odds. Each function's real disqualifiers are treated as gates rather than weights — an experience band in engineering, a credential in finance or law, channel and budget scale in marketing, institute tier in consulting, location and work authorisation throughout — so a role you are disqualified from never surfaces, however well your skills score. Experience gaps of up to two years appear in a separately labelled **Stretch** tier, never mixed into the main list; **a credential you do not hold is never stretched, because it cannot be.** **No volume is promised**: some weeks are thin, and a short honest list beats a padded one. Every role carries a one-line reason — *"72% — GTM and stakeholder management match; the JD's 3-year floor is your one gap"* — so the ranking is auditable rather than asserted. Within 30 days a candidate can open any recommendation, read the source job description, and check the call themselves.

`[Precision commitment: ranking is on fit against stated requirements, which is the best available proxy for odds. We hold no hiring-outcome data and the product must never imply otherwise — overclaiming is what erodes trust in this category.]`

---

## 4. Mechanism

*What process or features deliver the outcome, and why does it work?*

> Good: unique, based on experience/knowledge/data, proven
> Bad: untested, unclear, undefined

**Your answer:**

Four layers, three of which run before any language model sees the job.

**1 · Supply — a curated ATS registry.** Rather than scraping portals, the product maintains its own registry of Indian company job-board tokens across Greenhouse, Lever, Ashby, Workable, Recruitee and SmartRecruiters — public, zero-auth JSON endpoints intended for consumption. Seeded at ~100 boards by hand, then extended by automated discovery. The registry is the asset: it compounds weekly and nobody else has it. Six boards yielded 66 addressable roles in a live probe; 300 boards is roughly 3,000, refreshed daily and legally clean.

**2 · Normalisation — ESCO / O\*NET.** Candidate profile and every job description resolve into one shared skills-and-occupation vocabulary. This is what lets a single engine serve every corporate function without hand-writing a taxonomy per role family. Profiles are built parse-then-confirm: a résumé is parsed to pre-fill, and the candidate confirms every field before the first match runs.

**3 · Gates before scores — deterministic, typed by function, and deliberately not AI.** Hard requirements are evaluated as filters in plain code rather than weighted features. Critically, **the *type* of hard requirement differs by function, and treating years of experience as the universal disqualifier is itself a bug.** Engineering gates on an experience band. Finance, law and company-secretarial roles gate on a **credential** — CA, CFA, CS, bar enrolment — which is genuinely binary. Marketing gates on **channel ownership and budget scale**, frequently not on years at all. Consulting and strategy roles often gate on **institute tier**, a requirement candidates fail invisibly and then blame themselves for. HR gates on a **recruitment-versus-generalist split** that job descriptions treat as non-transferable. The engine therefore carries a typed requirement model per function — extracted from the job description, evaluated against the confirmed profile — rather than one universal experience filter. A disqualifying role cannot surface however well its skills score, with one labelled exception: the ≤2-year Stretch tier, **which applies only where the gate is experience-typed.** This layer is what makes the "Top Applicant on a fifteen-year role" failure structurally impossible, and it is impossible precisely *because* it is rules rather than a model. An LLM asked to judge eligibility weighs rather than gates, which is how the bug is born.

`[Typed gating emerged from building the five-persona set in 2b-Persona-Set.md, not from the single engineering persona. A years-only gate would have failed Karthik (marketing) in both directions — showing him roles he cannot get and withholding roles he could.]`

**4 · Explanation — the only place a model is used.** The LLM never decides eligibility. It writes the one-line reason a role scored what it did, and on request drafts the tailored résumé and cover letter. Calls are routed across providers so a model deprecation is a config change, not a rebuild.

Runs daily with memory: the list is what is new since yesterday, not a reshuffle of the same roles.

`[Survival check: a one-prompt ChatGPT user cannot replicate this. They cannot maintain a 300-board registry, cannot run unattended daily, cannot hold profile state across time, and — critically — will reproduce the fifteen-year bug, because a model weighs where this product gates. The moat is deliberately the non-AI layers; the explanation layer is the only part the next foundation-model release could absorb.]`

---

## 5. Guarantee

*What bold promise reduces buyer risk?*

> Good: high value, bold, tied to the outcome
> Bad: low value, low commitment, detached from outcome

**Your answer:**

The product is free, so the risk being transferred is not money — it is the candidate's time, their credibility, and their confidentiality. Three commitments, each enforced in code rather than asserted in copy:

**Nothing you're disqualified from.** If a role reaches your main list that your profile disqualifies you from, that is a defect, not a judgement call. Every recommendation carries a one-tap *"this shouldn't be here"* report, and reports are triaged as bugs. The Stretch tier is the only place an experience gap appears, capped at two years, never mixed into the main list.

**Nothing invented in your documents.** Tailored résumés and cover letters are produced only by reordering, trimming and re-wording facts already in your confirmed profile. A fabrication guard diffs every generated document against that profile and **blocks** output when a claim appears that the profile does not support — the remedy is to add the fact to your profile, not to let the model assert it. The product will not put a skill, a number or an employer into your résumé that you did not give it.

**Nothing shared about your search.** Your uploaded file is deleted once parsed; only the profile you confirmed is stored. No employer is ever contacted, nothing is made public or sold, and no recruiter can find you here. Delete your account and everything goes with it — one click, no email required. Free, with no card, no ads, and no paid tier hiding behind a feature you already use.

`[Each commitment costs the seller something real, which is the test. The first creates a public defect surface. The second costs engineering and will sometimes refuse output a user wants. The third means deliberately not accumulating the résumé corpus that would otherwise be the most valuable asset here — and makes data minimisation under India's DPDP Act a marketable position rather than only a legal one.]`

---

## 6. Proof

*What evidence shows this actually works?*

> Good: testimonials, case studies, reviews, results
> Bad: no results, vague, impersonal

**Your answer:**

`[Pre-launch — no code has been written as of September 2026. No proof exists yet, and none is claimed here.]`

The proof this product can earn, in the order it arrives:

**The refusal screenshot** *(earnable the day the gate works)* — side by side: a major portal presenting a two-year candidate as "Top Applicant" for a role requiring fifteen, and the same profile in this product with that role withheld and the reason stated. Verifiable by anyone in thirty seconds, reproducible on demand, and it is the entire thesis in one image.

**A public gate audit** *(at launch)* — a live page reporting roles ingested, roles gated out, and the reason distribution: how many for experience, how many for qualification, how many for location. Radical transparency about what the product refuses to show. No competitor publishes this.

**The open-sourced gate.** The gating logic is published; the registry stays private. A skeptical reader — candidate or hiring manager — can read the exact code that makes the fifteen-year failure impossible.

**Registry size** *(compounds weekly)* — the number of Indian company job boards indexed, published and dated.

**First cohort** *(target: 60 days post-launch)* — 25–50 candidates from the named wedge, reporting the percentage of shown roles they judged themselves eligible for (target: 100%), applications sent, and callbacks, plus 3–5 named testimonials. `[re-run studio-define-offer-review once this cohort completes]`

---

## Evidence Sources

Research and live API probes performed during this session (September 2026):

**Category / competitors**
- [Jobright AI Review 2026](https://favtutor.com/jobright-ai-review/) and [Jobright pricing](https://zplatform.ai/ai-reviews/jobright-ai/) — $39.99/mo Turbo, raised 33% from $29.99; strongest match scoring in category; US-only supply
- [Best AI Job Search Tools in 2026](https://remotehunt.app/blog/best-ai-job-search-tools-2026) — Teal free/$29/mo (tracker + résumé builder, no matching engine); Simplify free/$39.99 with unlimited free autofill and 4.9★ from 3,800 ratings; Huntr as tracker; auto-apply tools ($99–249) as the category's reputational failure mode

**Verbatim pain**
- [Blind — "LinkedIn feels dead in India, where are people actually getting callbacks"](https://www.teamblind.com/post/linkedin-feels-dead-in-india-where-are-people-actually-getting-callbacks-from-zmnna7j5)
- [Blind — "50 days zero interview calls, is the job market broken"](https://www.teamblind.com/post/50-days-zero-interview-calls-is-the-job-market-broken-yeygiq1s) — 13+ years, Bangalore, 50+ applications across LinkedIn/Naukri/Instahyre, "not even one call"; hiring-side estimate that ~80% of Indian applications arrive via LinkedIn and ~95% are irrelevant
- ⛔ **PRIVATE evidence source — figures held locally, never published.** The founder's own job-search tracker is the origin of the hard-gate and precision thesis. The underlying dates and counts are **personal data** and are deliberately kept out of version control — they live in `productos/define/PRIVATE-evidence.local.md`, which is untracked. They must never appear in a landing page, launch post, case study, or any public artifact. Downstream skills reading this file: the evidence exists and shaped the design; do not go looking for the numbers and do not surface them.

**Supply — probed live 2026-09-02, zero auth, HTTP 200**
- `boards-api.greenhouse.io/v1/boards/{token}/jobs` — Razorpay 23, Postman 66, slice 26, Groww 5
- `api.lever.co/v0/postings/{token}?mode=json` — Meesho 46
- `api.ashbyhq.com/posting-api/job-board/{token}` — Sarvam 62, Atlan 5
- Totals across six boards: 233 roles → 137 in India (59%) → 90 India and not senior-titled (39%) → **66 India, junior, non-engineering (28%)**
- Note: ATS boards are global. Roles filtered out sat in San Francisco, London, New York, Pristina, Skopje. The supply is rich in Product, GTM, Ops, Finance, Marketing and BD titles but carries almost no "Founder's Office" or "Chief of Staff" postings — those live on LinkedIn, which cannot be used.

**Taxonomies**
- [ESCO API](https://ec.europa.eu/esco/api) — probed live, HTTP 200, no auth; open data across 24 EU languages
- [O\*NET Database](https://www.onetcenter.org/database.html) — CC BY 4.0, commercial use permitted with attribution; bulk download and free-key web services both available

**Legal / compliance constraints**
- [hiQ Labs v. LinkedIn](https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn) — scraping public data is not a CFAA violation, but hiQ lost on breach of contract and settled with a $500,000 judgment and permanent injunction. LinkedIn and Naukri are therefore excluded from the supply chain entirely.
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) and [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) — non-commercial personal use only; advertising the sale of a product counts as commercial. Viable while the product is genuinely free; monetisation requires Pro.
- India's DPDP Act applies to résumé data — consent at upload, stated retention, deletion path. Addressed by deleting the source file after parsing.

**Recommended next step:** live with this draft for 2–3 days, then run `studio-define-customer-persona`, and book 3–5 short conversations with people matching the Customer line to validate the Pain and the Stretch-tier assumption before committing engineering time.
