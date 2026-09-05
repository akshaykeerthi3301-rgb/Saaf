# Parity — JobMatchAI, and what Saaf would have to build

*Written 2026-09-05. Target set by the founder: **a JobMatchAI equivalent for the
Indian market — mechanics and functions ditto, our own updated front end.***

Sources probed live on 2026-09-05: [jobmatchai.in](https://www.jobmatchai.in/)
and its [pricing page](https://www.jobmatchai.in/pricing). Feature names below
are theirs, verbatim, so the comparison stays checkable.

---

## The structural fact that shapes everything below

**The two products do not overlap.** They are opposite halves of the same job
search.

| | JobMatchAI | Saaf today |
|---|---|---|
| **Where the work happens** | On the candidate's **own documents** — résumé, LinkedIn profile, a job description they paste | On **supply** — a curated registry of company ATS boards, ingested daily |
| **What it needs to function** | A résumé and a JD the candidate brings | 20 boards, 6 ATS adapters, an India filter, a daily cron |
| **What it never does** | Source or rank jobs. There is no index; the candidate arrives holding the posting | Write a document. Generation and the fabrication guard are P2, cut from the landing page on 2026-09-03 (HANDOFF D1) |

So *parity* is not a matter of catching up on a few features. **JobMatchAI has
none of Saaf's supply side, and Saaf has none of JobMatchAI's document side.**
Building the target means adding a second, largely independent product to the
one that exists — and that is a scope statement, not an objection.

The upside of that same fact: nothing in their feature set competes with the
ingest, the registry or the ranking engine. Almost all of it is additive.

---

## Feature-by-feature

Cost column is theirs. Gap column is what Saaf would have to build.

### Free in their product

| Their feature | What it does | Saaf today | Gap |
|---|---|---|---|
| **Career Profile** | Permanent career memory — skills, experience, target roles, salary goals; powers every other feature | **Shipped.** `profiles` + parse-then-confirm onboarding; skills and domain read by Gemini since Stage C | **Salary goals only.** Everything else exists |
| **Should I Apply?** | Analyses a pasted JD against the saved profile, returns apply/skip with a breakdown | **Half-shipped, inverted.** `src/match/score.ts` scores six components with the sentence each was read from — but only against roles *in the index*, never a pasted JD | **Medium.** The scorer exists; it needs a paste-a-JD entry point and a single-role view |
| **Application Tracker** | Kanban board — status, notes, follow-up dates | **Shipped 2026-09-05.** `/applications` — five-stage pipeline, notes, follow-up dates, add-by-hand for jobs found anywhere, and "Track this" on every ranked role | **Closed** |
| **ATS Resume Checker** | Simulates enterprise ATS scoring | **Nothing** | **Medium.** Deterministic and testable, which suits this codebase |
| **Company-Specific ATS** | Matches a résumé against Workday / Taleo / Greenhouse behaviour | **Nothing.** Saaf reads six ATSs for *supply*, which is different knowledge but the same domain | **Medium** |
| **JD Match Score** | Keyword match + gap analysis | **Shipped in substance** — score with per-component notes | **Small.** Needs the pasted-JD path above |
| **Resume Guides by Company** | ATS guides for Google, Amazon, TCS, Infosys, 20+ | **Nothing** | **Content, not code.** Cheapest thing on this page and the most SEO-productive |

### Paid in their product (credits)

| Their feature | Cost | Saaf today | Gap |
|---|---|---|---|
| **Arsenal Generator** — cover letter, LinkedIn message, recruiter email from résumé + JD | 1 credit | **Nothing.** Document generation is P2 | **Large, and the one with a rule attached** — see collisions |
| **AI Resume Rewrite** | 1 credit | Nothing | **Large.** Same rule |
| **AI Resume Builder** | 1 credit | Nothing | **Large.** Same rule |
| **LinkedIn Deep Audit** — headline, about, bullets | 1 credit | Nothing | **Medium.** Operates on text the candidate pastes — **not** LinkedIn sourcing, so the locked exclusion does not bite. See collisions |
| **AI Interview Prep** — behavioural + technical questions per company/role | 1 credit | Nothing | **Medium** |
| **AI Mock Interview** — interactive AI recruiter | 2 credits | Nothing | **Large.** The most expensive per session, by a distance |
| **Skill Gap Analysis** — profile vs JD | 1 credit | Partially — the skills component of the score | **Small** |
| **Salary Negotiation AI** — scripts, counter-offer emails | 1 credit | Nothing. Saaf can't even show salary: no board in the registry publishes it | **Medium** |
| **Career Copilot** — goals, AI reality check, roadmap, weekly accountability emails | paid | Nothing. The daily digest (`ingest/digest.ts`) is the only email that ships | **Large** |

### What Saaf has that they don't

Worth stating, because parity is being measured in one direction only: the
board registry and its discovery script, six ATS adapters, daily India-filtered
ingest, a ranked shortlist over roles the candidate never had to find, the
public index audit, and the score breakdown that shows the sentence every
component was read from. **None of it has an equivalent on their side.**

---

## The three collisions

Only one is a real blocker. Naming all three so none is discovered late.

**1 · Money. This is the blocker.**
Their model is credits: free tier of 5, then one-time packs (displayed as ₹1.49
/ ₹2.99 / ₹5.99 — those figures look like USD rendered with a rupee sign, so
treat them as indicative), all expiring in 30 days. Saaf's locked position is
**₹0 forever, no paid tier**, and it is not merely a preference: **Vercel Hobby
is non-commercial only, and even advertising a paid tier breaks its terms.**
Every feature in the paid table above is an LLM call per use. Gemini's free tier
is roughly 1,500 requests/day — enough for a few hundred users doing a handful
of operations each, and not enough for mock interviews at scale.
**Mechanics parity is achievable at ₹0. Business-model parity is not.** Pick
mechanics; the ₹0 is a differentiator against them, not a handicap.

**2 · Generated documents meet the fabrication guard.**
Their Resume Rewrite, Builder and "Anti-AI Humanization Filter" are the exact
surface `PROJECT-STATE.md` locked a rule against: generated documents may only
reorder, trim and re-word facts the candidate already confirmed, and the guard
**blocks** rather than warns. Parity on the *feature* is fine. Parity on the
*behaviour* is not — a rewrite that invents a metric to strengthen a bullet is
precisely what the guard exists to stop. Build the features; keep the guard.

**3 · LinkedIn Deep Audit — a false alarm, checked.**
The locked exclusion is on **sourcing** from LinkedIn and Naukri, because of
*hiQ v. LinkedIn* ($500k judgment, permanent injunction). An audit that improves
a headline the candidate pastes in reads nothing from LinkedIn and breaches
nothing. **This one is safe to build.**

---

## Recommended order

Cheapest and most compatible first; each row is independently shippable.

| # | Build | Why here |
|---|---|---|
| 1 | ~~**Application Tracker**~~ ✅ **Shipped 2026-09-05** (migration `0015`) | Their only free feature Saaf had no answer to, no AI cost, no locked-decision contact, and the natural home for a role the candidate has decided to act on — which is exactly where the shortlist dead-ended |
| 2 | **Paste-a-JD → Should I Apply / JD Match Score** | The scorer already exists and already shows its working. This is an entry point, not an engine, and it makes Saaf useful for a role found anywhere — not only one in our registry |
| 3 | **ATS Resume Checker + Company-Specific ATS** | Deterministic, testable, free to run, and adjacent to knowledge this codebase already holds about six ATSs |
| 4 | **Resume Guides by Company** | Content. No engineering. Best organic acquisition per hour on this page |
| 5 | **Arsenal Generator** (cover letter, recruiter email, LinkedIn message) | The first LLM-cost feature and the first to meet the fabrication guard. Do it once the guard is built and trusted |
| 6 | **Resume Rewrite / Builder** | Same rule, larger surface |
| 7 | **Skill Gap, Interview Prep, Salary Negotiation** | Straightforward LLM features; sequence by whether the cohort asks for them |
| 8 | **Mock Interview, Career Copilot** | Most expensive per session, least defensible at ₹0, and the ones most likely to be a portfolio liability if shipped thin |

**What this does not answer:** whether reaching parity is the right strategy.
Their product is résumé-side and has no supply; Saaf's differentiator is a legal
index nobody else has. Matching them feature-for-feature converts a product with
one thing no competitor holds into a product with many things several
competitors hold. That is the founder's call, and it is not being reopened here
— it is written down so the trade is explicit.
