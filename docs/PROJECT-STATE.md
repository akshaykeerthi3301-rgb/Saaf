# Saaf — Project State

**Last updated:** 2026-09-07 · **Phase:** Post-MVP. Develop closed at 53/53 and deployed; twelve stages have landed since — see **[The pivot](#the-pivot--stages-a-b-c-2026-09-04--09-05)**, which reverses a decision the table below still lists as locked. Define 4 of 5 and Design 6 of 7 — both remaining steps are launches, still deferred, and **nothing has yet been shown to a real person.**

> **Resuming? Read [`docs/HANDOFF.md`](HANDOFF.md) first.** It lists the decisions only the founder can make (D1 resolved and D2 moot since it was written — D3, D4 and D5 are live), the actions needing their accounts, and the invariants a fresh session must not undo.
>
> ⚠️ **Saaf ranks; it does not gate.** Stage A reversed *gates, not weights* deliberately on 2026-09-04. Anything below written in the language of refusals, withheld rows or cleared bands is the older product and is marked as such. Do not "restore" gating on the strength of the half of this document that predates the pivot.

Read this first. It carries decisions and verified facts from the originating session so they don't get re-derived or accidentally reversed.

---

## What this is

**Saaf is a precision job-matching product and application co-pilot for India.**
Two halves, one candidate:

**The matching half** sources roles from company hiring boards, scores every one
against the candidate's confirmed profile and stated preferences, and sorts the
result into **buckets** rather than a single ranked list:

| Bucket | Meaning |
|---|---|
| **Matches you** | Profile, experience and location all line up. Assisted application available. |
| **Experience is out of range** | The work matches; the years don't. Shown, labelled, with the gap named. |
| **Location is out of range** | The work matches; the city doesn't. Shown, labelled. |
| **Worth a look** | Matches on the work, uncertain elsewhere — the posting didn't state enough to be sure. |

**Nothing is hidden.** The buckets are the honest disclosure: a candidate sees
every role we hold that matches their work, and sees *exactly why* we are not
confident about the ones we are not confident about. That is what replaced the
withheld list, and it is a better answer than either hiding roles or dumping
everything into one ranked column.

**The co-pilot half** helps the candidate act on what they chose. It fills
application forms on the employer's own site so a 40-minute application takes a
fraction of that, and it drafts a résumé curated to the specific posting — built
only from facts the candidate has confirmed, never invented.

**It does not apply on anyone's behalf. That is permanent, not a phase.** The
candidate reviews and submits every application themselves. This is the line the
product is defined by: we make applying faster and better-aimed, never automatic.

**Frame:** portfolio artifact first, built like a real product. ₹0 forever, no
ads, no paid tier.

Named **Saaf** on 2026-09-02 (Design Step 1) — from *saaf saaf batao*, "tell it
to me straight." The repo directory is still `jobmatch`; that is a path, not the
brand.

> **A note on "100% accuracy."** The product targets it and should be built for
> it, but it must never be *claimed* on a page. No matching system is perfectly
> accurate, this repo's own standing rule is that a promise the product cannot
> keep is a defect rather than marketing, and the brand is built on being
> checkable. The honest form of the same ambition is what the buckets already
> do: be certain where we are certain, and say so plainly where we are not.

## Origin

Forked from a session in `~/Desktop/projects/trading/derivatives-bot` (2026-09-01 → 09-02) that audited a personal nightly job-search automation and then designed this product out of what that audit found. Two published artifacts carry the analysis:

- **[Nightly Job Search Pipeline](https://claude.ai/code/artifact/e1137fae-9fb0-4b67-a8d1-5a348f88c57c)** — teardown of the personal bot's sourcing: which tools work, which job boards are reachable
- **[Can this be a product?](https://claude.ai/code/artifact/0e441e7c-f513-41d7-9391-6fff21eed9bf)** — efficiency test, competitor teardown, live-probed $0 stack feasibility, legal red lines

The personal automation in `derivatives-bot` **continues running unchanged**. It is a separate concern from this product.

---

## Parked — future plans, nothing built or designed now

*Set 2026-09-06. These are real intentions, deliberately not in the current
build. Nothing in the codebase, the schema, the roadmap or any screen should
anticipate them, because half-built optionality is the most expensive kind.*

| Parked | Why it is parked, not cancelled |
|---|---|
| **Employer access / B2B portal** | A later phase. **Do not build or design anything toward it** — no schema, no consent surface, no discoverability flag, no UI. When it returns, the opt-in consent model has to be designed first, because four of the five personas are employed and hiding their search. |
| **WhatsApp channel** | A later phase, and the right channel for India. **Do not build or design it now.** It also bills per conversation, so it needs a budget decision before any work starts. ⚠️ The landing page currently carries a "WhatsApp Nudges" card at the founder's request — that copy must go live or come off before the deploy hold lifts. |
| **The daily digest** *(parked 2026-09-08)* | Built and working — `ingest/digest.ts`, wired to a Vercel cron. Parked for THREE reasons, and the weakest one is the one usually given. **(1)** It cannot reach anyone: Resend delivers only to the founder's own address until a domain is verified, and the founder has chosen to stay on Google sign-in with no domain for now. **(2)** At fewer than ten beta users an automated daily email is the wrong tool — a founder's own message beats a cron job at that scale and tells you far more. **(3)** ⚠️ COVERAGE IS TOO UNEVEN TO PROMISE A DAILY ANYTHING. Measured 2026-09-08 against the live index: an HR candidate matches **15 roles total**, marketing 131, consulting 219, engineering 500 (capped). A daily digest would tell an HR candidate "nothing new matched today" almost every day — honest, and indistinguishable from a dead product. **Not parked because volume is thin overall** — 21,813 roles is plenty, and the digest was deliberately built to send on empty days, which is its stated differentiator. Reversal conditions, all three: a verified domain, more users than can be messaged by hand, and a week of post-scale-up data showing the real per-candidate discovery rate. That last one may say **weekly** rather than daily — the board rotation is ~8 days, so the calendar is the wrong cadence to copy. |
| **The co-pilot — tailored résumés, cover letters, interview prep** *(parked 2026-09-06; **un-parked by founder direction 2026-09-23 — Stage AD**)* | ~~On hold until the matching itself is trusted.~~ **Built 2026-09-23 on `jobright-parity` (Stage AD); the reasoning below is kept because the order it argues for was overruled, not refuted.** On hold until the matching itself is trusted. The order is deliberate and worth keeping: a co-pilot that writes beautifully about a badly-chosen role makes the wrong application faster, which is the category failure this product exists to avoid. **Nothing to build or design here yet.** The provider is wired and fast enough for it (Groq, ~1.4s on a résumé), so this is a sequencing decision rather than a capability gap. Reconsider once scores are demonstrably right. ⚠️ The landing page's "Review & Approve" card is part of this and carries the same go-live-or-come-off condition. |

---

## Locked decisions — do not re-litigate

| Decision | Detail |
|---|---|
| **No LinkedIn or Naukri** | ToS breach. *hiQ v. LinkedIn* settled with a $500k judgment + permanent injunction. Removes ~84% of the personal bot's lead flow. Non-negotiable for a public product. |
| **Supply = ATS public APIs** | Greenhouse, Lever, Ashby, Workable, Recruitee, SmartRecruiters. Curated registry: ~100 boards seeded by hand, then automated discovery. **The registry is the moat.** |
| **Pre-application, not post** | The product answers *"which of these deserves my next 40 minutes?"* It does not attempt to explain post-application silence — that needs recruiter data nobody has. |
| **Buckets, not a single list — and never a hidden role** *(settled 2026-09-06, supersedes both earlier positions)* | The original design **gated** (roles removed). Stage A reversed that to **rank everything in one column**. Both were wrong at the edges: gating hid roles the candidate should judge for themselves, and one flat list buried the distinction between "this fits" and "this fits except the years." The product now sorts into buckets — matches you / experience out of range / location out of range / worth a look. Nothing is removed, and the uncertainty is *stated* rather than averaged into a number. Typed reading survives and feeds the bucket assignment. |
| ~~**Stretch tier ≤2 years, experience-typed only**~~ **· MOOT** | A stretch tier only means something against a refusal. With nothing refused, an experience gap is a score component carrying its own line of working. |
| **Never applies on the candidate's behalf** | Permanent, not a phase. Saaf fills forms and drafts documents; the candidate reviews and submits. Auto-apply is the category's reputational failure mode and a large part of why recruiters stopped reading. Assisted application is in scope; automatic application never is. |
| **No volume promise** | Precision over quantity. A short honest list beats a padded one. |
| **Never turn users away** | No signup gating, even for poorly-served segments. Instead the **honest empty state** — *"650 indexed today · 47 matching your search · 3 a strong fit"* (a narrowing since the pivot; it read as a subtraction ending in "3 cleared your experience band" before). Thinness is attributed to registry coverage, never to the candidate. **This decision survived the pivot untouched** and is the one thing both products share. |
| **Parse-then-confirm onboarding** | Résumé parsed to pre-fill; candidate confirms every field before the first match runs. Source file **deleted after parsing** (DPDP posture + confidentiality guarantee). |
| **Fabrication guard blocks, not warns** | Generated documents may only reorder/trim/re-word confirmed profile facts. Blocked output's remedy is "add it to your profile," never "let the model assert it." |
| **Open-source the gate, keep the registry private** | Gate code is portfolio proof; the registry is the moat. |
| **₹0, no paid tier** | Beta at ₹0. Vercel Hobby is non-commercial only — *advertising* a paid product counts as commercial, so even announcing a tier breaks it. |
| **⛔ Founder's personal job tracker is NOT publishable** | It informed the design (origin of the precision thesis) but is personal data. Must never appear in a landing page, launch post, case study or any public artifact. Flagged in `1-Product-Offer.md` Evidence Sources. |
| **Name is Saaf** | Decided 2026-09-02. `jobmatch` was killed: Job Match Pro (`jobmatchpro.in`) is an Indian product in the identical wedge. Also killed — Winnow (Winnow Career Concierge sells an "Interview Probability Score"), Yogya (Yogya.ai, Bengaluru), Sirf (active Indian e-commerce app). ⚠️ Registrar/handle availability for Saaf is **unverified** — search presence only. |
| **Design system is monochrome, flat, square-cornered** | Anchored on live computed styles from `zerodha.tech`: zero shadows, one radius, `#F0F0F0` paper ground. The named anti-reference is the maximalist résumé-tool look (196 shadows, 8 radii, 4 gradients, 2 banned fonts). Error red is for system errors only — **never** for a gate outcome. |

---

## The pivot — Stages A, B, C (2026-09-04 → 09-05)

Three stages landed after the MVP was declared complete. Each was committed with
its reasoning; this is the summary a fresh session needs, with the file that
proves each claim.

### Stage A — ranking replaces gating · `ef47a45`

The product became a precision-matching product for India. Every role scoped to the
candidate's preferred role is scored, ranked and shown.

- **`src/match/score.ts` is the substance.** Six weighted components summing to
  100 — **title 28 · seniority 25 · skills 20 · location 10 · credential 10 ·
  work mode 7**. Each carries the sentence it was read from; all of them persist
  to `gate_results.score_breakdown`, so a number can never again hide the fact
  that it means nothing.
- **It replaced a scorer that was genuinely broken:** `scoreFor()` computed
  `70 + (requirement count × 4) − gap`, took the profile as `_p` and never read
  it. Two candidates got identical numbers on the same role, and the value really
  measured how wordy the posting was.
- **The gate engine was not deleted.** `src/gates/extract.ts` still does the
  reading, and `experienceFloor()` is shared into the scorer rather than
  duplicated. The verdict path in `src/gates/evaluate.ts` now has exactly one
  live caller — `scripts/evaluate-fixture.ts`, the demo. **No app code calls it.**
- **Verified against live data:** across 56 roles matching "Product Manager", 51
  score differently for a 2-year and a 10-year candidate (averages 73 and 92).
  Plain "Product Manager" scores 91 for the junior candidate; "Staff Product
  Manager" sinks to 62 on an 8-year floor rather than disappearing.
- **Copy followed in the same commit, because otherwise it becomes false.** The
  landing page's *"nothing in your list is a job you can't get"* cannot survive
  ranking and is gone; `/audit` publishes how many roles *state* each requirement
  kind instead of a refusal distribution; the digest leads on best-scoring new
  roles rather than "cleared your gates".
- **Both published audit figures were also simply wrong**, independent of the
  pivot, and are fixed at source in `ingest/audit.ts`: `roles_indexed` was the raw
  count of postings fetched worldwide *before* the India and corporate filters
  (933 published against 650 real — a 43% overstatement on the one number the
  brand rests on), and `roles_withheld` summed withheld rows across every user,
  describing the userbase rather than the index.

### Stage B — the ingest ceiling, and a blind 15% of the index · `e3f5ff4`

- **The board ceiling is gone.** The run was strictly sequential with a courtesy
  sleep — ~1.7s per board, ~34s at 20 boards, hard ceiling near 30 because Vercel
  Hobby kills a function at 60s. Board fetching is almost entirely network wait,
  so a bounded pool at **concurrency 6** does it with no new infrastructure and no
  spend: **measured 34s → 7s across the same 20 boards.** Boards run
  least-recently-ingested first and the run stops *starting* new boards after 38s
  (`INGEST_BUDGET_MS`), so outgrowing the budget degrades into rotation —
  whatever is skipped today goes first tomorrow — instead of a hard timeout.
- **SmartRecruiters returned an empty description for 100% of its 91 roles** — 15%
  of the whole index, ranked on title alone with no experience floor and nothing
  to read. Its list endpoint carries no job body, and the adapter's own comment
  claimed a detail fetch that nothing ever performed: a plan mistaken for a
  shipped behaviour, the same shape as the Workable location bug below. Adapters
  now declare `detailUrl`/`parseDetail` and the run fills descriptions for kept
  roles only. Verified live against Swiggy: 0/4 → 4/4 with descriptions, and
  requirements that had been invisible now extract.
- **`toText()` decoded named HTML entities but not numeric ones**, so `&#xa0;`
  survived into stored text and split words the extractor reads.
- **Two things measurement said NOT to build.** Fraud/ghost detection: scanning
  all 650 live descriptions for India job-scam patterns returned 4 hits, all
  false positives — company ATS boards do not carry scam listings, which is an
  open-aggregator problem. Cross-source dedupe: the 26 duplicate title+company
  groups are the same title in different cities with different apply URLs — five
  real jobs, not one. Both become real only when a second source lands.

### Stage C — a model reads the résumé · `fe59cec`

- **`src/lib/parse/llm.ts` reads skills and domain with Gemini Flash.** The
  deterministic parser reaches five fields from fixed patterns and cannot reach
  skills across arbitrary résumé layouts — and the score needs them, because the
  skills component had shipped weighted at zero since Stage A.
- **Three properties keep this consistent with "a model never decides
  eligibility":** it *reads, never decides* (output is candidate facts; scoring
  stays deterministic code); *every field lands on the confirm screen* before
  anything is stored, which is what contains a hallucinated skill; and it is
  *strictly additive* — no API key, a timeout, malformed JSON or any error at all
  returns null and the regex parser's result stands unchanged.
- **Scoring normalises over the components that apply**, not over a fixed 100.
  Without that, a candidate with no skills on file would lose 20 points to a
  component that never had a chance to score and sit 20 below an identical
  candidate who had uploaded a résumé.
- **The working set is bounded at 500 roles per candidate**, freshest first
  (`MAX_ROLES_PER_CANDIDATE`), because `evaluate-user` now pulls descriptions for
  skill matching and a broad preferred role already matches 228 of 650.
- **The privacy page was rewritten in the same commit, not after it.** It had said
  the résumé is "never sent to a third party"; that is now false. It names the
  third party, what is stripped first (email, phone, profile links), that Google
  does not train on API content, and that "Type it in instead" avoids it entirely.
  The upload screen says the same *before* the file is chosen.

### Stage D — instrument the claim, and grow the supply (2026-09-05)

- **`score_breakdown_opened` and `score_reported`** restore success criterion 2,
  which the pivot had left measuring a section that no longer exists. One
  capture-phase listener for the whole list, not a prop per card — making
  `RoleCard` a client component would serialise every source quote into the
  payload twice, and the list is unbounded.
- **Two DOM facts, checked in a browser rather than assumed.** `toggle` does not
  bubble (a bubble-phase listener saw 0 of 4 events; capture saw all of them),
  and `toggle` is queued asynchronously and **coalesces**, so the handler reads
  the state at fire time, not toggle time.
- **The function gap is stated, not closed.** `src/match/function-gap.ts` reads
  the candidate's own preferred-role text — onboarding no longer asks the
  function — and `/today` names what their function actually turns on and says
  we don't read it. The patterns are narrow on purpose: bare "growth" and bare
  "strategy" are excluded, because a false positive tells a candidate their
  score is missing something when it is not.
- **`rolesWithheld` is gone from `/api/audit/today`.** It had been a permanent
  zero published under a name that still asserted the old product.
- **Registry: 20 → 31 boards.** The candidate list in `discover-boards.ts` went
  from ~110 slugs to 219; 30 came back live, 11 of them new (`stage`, `zeta`,
  `epifi`, `ixigo`, `refyne`, `shipsy`, `entropik`, `kenko`, `pocketfm`,
  `interviewbit`, `thoughtworks`). `druva` returned no India roles this run and
  is retained rather than deleted — `boards.last_error` and auto-deactivation
  are what handle rot.
- **Measured at 31 boards: the fetch phase takes 14.4s against the 38s budget**,
  and two 12s timeouts account for most of it. A slow board costs a pool slot,
  not the run. The ceiling is far away.

### Stage E — one design system, and a shortlist that fits down a phone line (2026-09-07)

**The design port finished.** Five screens still ran on the retired monochrome
system while four had moved to the shadcn/Tailwind export, so the onboarding
flow visibly changed style halfway through. `/start`, `/start/upload`,
`/start/reading`, `/start/confirm`, `/start/gate`, `/signin`, `/profile`,
`/audit`, `/privacy` and `/terms` all moved across, and **the old system was
deleted rather than left dormant**: the `--color-*` / `--type-*` / `--space-*`
token block, the `.measure` and `.rule` unlayered globals, four CSS modules,
`row.tsx`, `arithmetic.tsx`, `progress.tsx`, `withheld-section.tsx` and
`docs/DESIGN.html`. `grep` for a legacy token now returns nothing.

- **Three shells now carry every screen** — `AppShell` (signed-in),
  `OnboardingShell` (the five-step split screen), `DocPage` (privacy, terms,
  audit). The onboarding shell holds `STEPS`, which is the single source of
  truth for the flow's length and pacing; the screens no longer each carry a
  hard-coded percentage.
- **`docs/DESIGN.md` was rewritten.** It still documented the deleted system
  while `CLAUDE.md` calls it law, which is the most expensive kind of stale doc
  — a fresh session reading it would have built against tokens that no longer
  exist. It now documents the shipped system and carries a table of what
  survived the change, because most of the rules that matter (show the working,
  never a score without its reason, red for system errors only, no invented
  numbers) were never about the visuals.

**`/today` stopped shipping 4MB.** The page rendered all 229 scored roles at
once. Measured on the founder's real list:

| | Before | After |
|---|---|---|
| HTML shipped | 3.77 MB | **0.89 MB** |
| Cards rendered | 229 | 54 (20 a bucket) |
| Server render, production build | 1.24 s | **0.71 s** |
| DOM nodes | 17,748 | 4,180 |

- **The database was never the problem.** The query took 338 ms, the two small
  follow-up queries and the bucketing 172 ms; everything else was React
  rendering the cards and serialising them. Roughly two-thirds of the shipped
  bytes were the RSC hydration payload repeating the same tree.
- **The 7 seconds observed was mostly the dev server.** A production build
  renders the full 229-card page in 1.24 s. The payload, however, is real in
  both — 3.77 MB is about six seconds of download on an ordinary Indian 4G
  connection before anything appears.
- **Nothing is hidden, and that was the constraint.** Each bucket still states
  its full count above the cards; below them a plain link reads
  *"Showing 20 of 165 — show all 165"* and `?show=<bucket>` renders it whole,
  server-side, with no client JavaScript. `CARDS_PER_BUCKET` is a limit on what
  a candidate downloads to find out, not on what they may see. This is the live
  half of **D2** in `HANDOFF.md`, answered without capping the list.

**Groq Zero Data Retention is on**, per the founder, so `/privacy` no longer
says troubleshooting logs are kept for up to 30 days — it says the account has
ZDR switched on and names what that stops.

**Then the text came out of it.** The port had carried the export's copy across
faithfully, and the export writes an eyebrow, a headline and a subtitle for
every screen. Measured in visible words — collapsed disclosures excluded:

| | Before | After |
|---|---|---|
| `/today` | ~1,800 | **545** |
| `/today`, per role card | 32 words, 9 text rows | **12 words, 4 rows** |
| `/today` rail | ~90 | **17** |
| `/` (landing) | 613 | **395** |
| `/start/upload` | 154 | **55** |
| `/profile` | 153 | **86** |
| `/start/confirm` | 114 | **54** |
| `/start` | 60 | **21** |

The rule applied, and it is now in `docs/DESIGN.md`: **a repeated control becomes
an icon with a `title` and an `aria-label`; an explanation true of every row
moves to the rail; a sentence restating the heading above it goes.** So *Track
this* and *This score looks wrong* are a bookmark and a flag, the *Salary not
stated* chip is stated once instead of 54 times, and the two score disclosures
became one.

**What was not cut, and the reason it wasn't:**

- **The reason line** on every card, at full length. A score without its reason
  is the failure the product exists to correct.
- **The score components and their source quotes.** They moved into one
  disclosure instead of two; not a word of the working was removed.
- **The deletion promise on the upload screen** — shortened, still beside the
  ask rather than behind a link, still naming that a third party sees stripped
  text.
- **The named coverage gap** and the honest empty state. The empty state now
  only renders when the list is actually thin (under 10), which is the case it
  was written for; it had been answering a worry nobody has on a 229-role day.
- **`/privacy` and `/terms`.** These are documents, and cutting a disclosure to
  save a line is removing the disclosure. One paragraph went, because it
  restated the preceding one almost verbatim.

### Stage F — taxonomies for role and location (2026-09-07)

Both of the fields that decide a candidate's shortlist were free text, and both
were failing quietly.

**Location was a defect, not a preference.** `locationFit` tested whether the
posting's location string contained the candidate's city, verbatim. The live
index spells one city two ways:

| Spelling in `roles.city` | Postings |
|---|---|
| Bengaluru (+ lowercase, `-VTP`) | 197 |
| Bangalore (+ `Hybrid in Bangalore`) | 84 |

A candidate who wrote "Bengaluru" scored those 84 roles **3/10 with the note "In
another city."** Wrong, and unarguable from their side, because the note never
named the city it had found. `src/lib/taxonomy/locations.ts` carries 53 Indian
cities with their aliases — every rename since 1995, which is Bangalore,
Bombay, Calcutta, Madras, Gurgaon, Cochin, Trivandrum, Baroda, Mysore,
Pondicherry, Allahabad and the rest — and matching goes through it.

Measured against the live index after the change:

| Candidate | Exact matches before → after | Cluster matches gained |
|---|---|---|
| Bengaluru | 197 → **281** | 0 |
| Delhi | 16 → 16 | **+129** |
| Gurugram | 4 → 4 | **+141** |
| Mumbai | 55 → 54 | +1 |

**Clusters are the one judgement call.** Delhi/Noida/Gurugram/Ghaziabad is a
single daily-commute labour market, and so is Mumbai/Navi Mumbai/Thane. A role
across that line now scores 85% of the location component rather than 30%, and
the note names the city it actually found — *"In Noida, inside Delhi NCR."* For
a Delhi candidate that is 129 roles moving out of the *location out of range*
bucket. Set `LOCATION_CLUSTER_RATIO` in `src/match/score.ts` to `0.3` to switch
it off.

Mumbai's 55 → 54 is not a loss. It is one Navi Mumbai posting that had been
claiming to be "In Mumbai"; matching now prefers the most specific city name, so
it reports Navi Mumbai and takes the cluster tier. Two bugs were found by the
tests written for this and fixed before commit: shortest-name-first reported the
wrong city, and single-winner matching lost a posting that genuinely names two
cities (`"bengaluru, mumbai"`).

**Role is a starting point, not a gate.** `preferred_role` becomes a
`websearch_to_tsquery` that ANDs every word against a posting's title, so the
wording decides whether a shortlist exists at all: "Product Manager" returns 56,
"manager" returns 229 — 35% of the index — and "Founder's Office" returns none.
`src/lib/taxonomy/roles.ts` gives 11 domains and 79 roles, and
`role-catalogue.ts` shows **every one with its live count, from the query the
matcher runs**. Typing something outside the list still works; never turning a
candidate away is locked.

A domain's own figure is a **distinct** count, not the sum of its roles. Summing
double-counted every posting matching two entries and printed *Product: 118* for
a domain that really holds 49. That was caught before commit and is the reason
each domain runs its own `OR` query.

⚠️ **The taxonomy is not a competitor's.** the category leader's categories are not
published — they sit behind the app's login and no public page enumerates them,
so there was nothing to copy. The list is built from the saaf-ai export's own
eight onboarding domains, the most common title phrases across the 652 live
Indian postings, and standard occupational groupings for the coverage those
miss.

No migration. `profiles.city` and `profiles.preferred_role` stay text columns
holding the canonical value.

### Stage G — under the bar is never a top choice (2026-09-07)

Raised by the founder, and both halves were real.

**The relaxation was silent.** Postings state experience two ways — `2+ years`
and `1 - 5 years` — and the scorer takes the floor from either. A candidate
under that floor by up to two years still scored 50–70% of the experience
component, which cleared every bucket threshold, so **a 1.5-year candidate saw a
"2+ years" role at the top of their list and a candidate with no experience saw
a "1 - 5 years" role there.** The relaxation is worth keeping; applying it
without saying so is the rounding-off the buckets exist to prevent.

There is now a fifth bucket, **"Good match, short on experience"**, between
*Matches you* and *Experience is out of range*. Below the stated bar by any
amount goes there — half a year under a `2+ years` posting is still under it.
Beyond the two-year relaxation (`STRETCH_YEARS`) it stays *out of range*.

Measured on the founder's own list, bucketing the identical breakdowns both
ways: **13 roles moved `matches → experience_short`, and nothing else moved.**

**The card had to stop disagreeing with the heading.** `RoleCard`'s band read
the score alone, so those 13 roles announced STRONG MATCH two lines under a
heading saying they were not. The band is keyed by bucket now.

⚠️ **A ratio could not carry this, and that is worth remembering.**
`seniorityFit` awards 50% of the component both for *you are two years short*
and for *this posting mentions a bar we could not read* — a fact about the
candidate and an admission about us, sharing a number. Bucketing off the ratio
would have labelled the second as the first. `ScoreBreakdown` now carries
explicit `experience` and `location` standings, both optional so breakdowns
stored before them still parse; `bucketFor` falls back to the old ratio rules
for those rows, and `ingest/recompute.ts` empties that path daily.

**Location orders, it does not label.** Cluster matching was right but ranking
was not: the cluster tier costs 1.5 points out of 100, so a strong Noida role
outranked a decent Delhi one and a candidate who asked for Delhi got Noida at
the top. `/today` now sorts each bucket by `locationRank()` before score, so
every exact-city and remote role sits above every commute-cluster one. The note
lost its ", inside Delhi NCR" — once ordering does the work the label was
decoration.

**Known gap, not fixed here.** `extractExperienceYears` captures a range's upper
bound in its regex and then discards it, so `1 - 5 years` and `1+ years` are
stored identically as a floor of 1. That is invisible for the under-the-bar case
this stage fixes, and it is exactly what a proper over-qualification rule would
need. Adding it means a `max_years` column, so it needs a migration and the
founder.

### Stage H — the developer bench (2026-09-07)

`/dev/bench` takes several résumés at once, parses each with the real parser,
scores each with the real pipeline, and shows the buckets and the top 40 roles
with every score component and the sentence it was read from. Every parsed field
is editable, so the same résumé can be re-run at two years and at six, or asking
for "Product Manager" instead of "manager", without re-uploading.

**It writes nothing.** No profile, no `gate_results`, no `role_first_shown`. A
run cannot disturb the shortlist of the account you are signed into, which is
what makes it usable on the founder's own live account.

**It runs the real pipeline, not a lookalike.** The scoping-and-scoring half of
`evaluateUser` moved to `src/lib/score-candidate.ts`; `evaluateUser` now calls it
and persists the rows, the bench calls it and displays them. That mattered more
than the usual argument for sharing code — a bench that scores through its own
copy of the query can only ever tell you about the copy. The refactor was
verified behaviour-preserving by snapshotting `gate_results`, recomputing, and
diffing: **481 rows, 0 changed.**

**Three things keep it out of production**, and all three were checked against a
real production build rather than assumed:

| Guard | Verified |
|---|---|
| The page calls `notFound()` when `NODE_ENV === 'production'` | signed-in request to `/dev/bench` returns **404** |
| The nav entry is spliced out of `NAV` at build time | `dev/bench` and `FlaskConical` appear in **no** client bundle |
| The server action repeats the check — an action is its own entry point, reachable without the page ever rendering | guard present in `bench.ts` |

It reads through the **request** client, not the service client, so its queries
stay under RLS and it cannot see more than a signed-in user can.

Note the coupling: the bench needs `/api/dev-signin` to get a local session, and
`docs/HANDOFF.md` still lists that route for deletion once magic-link sign-in is
confirmed. Deleting it removes local access to the bench too.

### Stage I — the experience ceiling, and over-qualification (2026-09-07)

`extractExperienceYears` had always matched the top of a range — it is group 2
of its own regex — and then dropped it. So `1 - 5 years` and `1+ years` were
stored identically as a floor of 1, and over-qualification could not be read at
all. Migration **0018** adds `role_requirements.max_years`.

**Measured on the live index: 355 roles state an experience floor confidently,
and 212 of those also state a ceiling.** Sixty per cent of that information was
being thrown away at extraction.

- **A trailing plus cancels the ceiling.** `6-8+ years` names two numbers and
  means eight *or more*; reading 8 as an upper bound would invent a limit the
  posting explicitly disclaims. Group 3 of the regex catches it.
- **The `held > required + 8` guess is deleted.** That was the old
  over-qualification rule, and it scored a twenty-year candidate down against a
  `5+ years` posting — an upper bound nobody had written. Where a posting states
  no ceiling we now assert none, which is the honest reading of "or more".
- **Symmetric tolerance, asymmetric consequence.** The same `STRETCH_YEARS`
  applies above the ceiling as below the floor. But over the ceiling never
  becomes *out of range*: under the floor an employer may reject you, whereas
  over it the only question is whether you want the role. So there is a sixth
  bucket, **"Good match, more experience than asked for"**, and no far-over
  equivalent.

⚠️ **This is the first migration in a while that a session cannot apply.** There
is no direct database URL in `.env.local` — only the PostgREST endpoint and the
keys, and PostgREST does not do DDL. So the code had to be correct on both sides
of the migration, and is:

| Surface | Before 0018 | After |
|---|---|---|
| Reads (`/today`, `score-candidate`) | `role_requirements(*)` rather than a column list — naming `max_years` would fail the query outright and take the shortlist down | picks the column up automatically |
| Ingest write | one probe per run; the field is omitted and the run warns | writes the ceiling |
| Scoring | absent `max_years` reads as "no ceiling stated", which is what a `5+ years` posting means anyway | scores over-qualification |

Verified live with the column still absent: `/today` renders all 229 roles and
five buckets, and no role is scored over-qualified — correct, because no
ceilings are stored yet.

**Applied and ingested 2026-09-07.** 31/31 boards in 18s, index 652 → 742 roles,
all four profiles recomputed. **266 of 518 experience requirements now carry a
ceiling.** No live profile shows the new bucket, and that is the right answer —
all four are 2–2.3 years against a senior-skewed index, so none of them *is*
over-qualified. Scored against the real index at other experience levels:

| Candidate | matches | short | **over** | out of range |
|---|---|---|---|---|
| 2y | 17 | 13 | **0** | 95 |
| 8y | 57 | 7 | **7** | 5 |
| 15y | 50 | 0 | **20** | 0 |
| 25y | 49 | 0 | **21** | 0 |

Reading, verbatim from a card: *"Asks for 8–12 years; you have 15 — 3 over."*

**A defect surfaced in that same run.** `sendDigests` logged `digest sent` for a
mail Resend had rejected with a 403 — the SDK **returns** its errors rather than
throwing them, so the `try/catch` never fired. The daily cron has therefore been
reporting successful digests while delivering nothing. Fixed in the same commit:
the returned `error` is checked, and the log names the recipient either way. The
underlying 403 is **D4** — Resend delivers only to the account owner until a
domain is verified, and the one verified profile is a different address from the
Resend account's, so no digest has ever reached it.

### Stage J — the score learns to say no (2026-09-07)

Three defects reported off a real résumé, and they were one problem wearing
three hats: **the score is a weighted average, and an average cannot express a
disqualifier.** Four components are at or near full marks for any in-city role
requiring no credential from a candidate with no work-mode preference —
title 28, location 10, work mode 7, credential 10. **That is 55 points before
anything is known about whether the person can do the job.**

| Reported | Was | Now |
|---|---|---|
| Internship shown to a 2-year professional | **79** | **45** |
| Role asking 4 years, candidate has 2 | **76** | **53** |
| "2 years of product management", candidate has 2 years of HR | **80**, *Matches you* | **55**, *short on experience* |

**1 · Entry-level titles are read as a ceiling.** `extractTitleSeniority` read a
title as a floor only — "Staff" means 8+ years — so "Product Management Intern"
produced no requirement at all and scored 28/28 on title against a "Product
Manager" search. `intern`, `trainee`, `apprentice`, `fresher`, `graduate
programme` and `junior` now imply a maximum. **`assistant` and `associate`
deliberately do not**: they are ordinary mid-level titles in Indian corporates,
and the BANDS table already makes that same judgement in the other direction.

A title-derived ceiling gets **no ±STRETCH_YEARS tolerance**, unlike a stated
band. "1 - 5 years" is a number an employer wrote and two either side is
rounding; "Intern" is a categorical statement about the kind of engagement, and
two years of full-time work is not an internship rounded up.

**2 · The total is capped by the worst structural mismatch** — 65 short, 50 far
short, 65 over. Reweighting could not have fixed this: even at a seniority
weight of 40, sixty points still come from elsewhere.

⚠️ **Scaled into the band, not clipped at it.** `Math.min(average, cap)` was the
first attempt and it flattened the bucket — every role averaging above the cap
came out at exactly the cap, so ordering inside it went to chance. Scaling is
monotonic. The cap appears as its own line in the working, because a number held
down silently is the unexplained score this product exists to replace.

**Nothing is hidden.** The role keeps its bucket, its place and its full
working. The locked "ranks, does not gate" holds.

**3 · Years asked for in a named function.** "2 years of product management
experience" and "2 years of experience" are different requirements, and we read
them identically: a candidate with two years in HR met both. The qualifier is
now extracted into `role_requirements.value_text` and resolved against a domain
vocabulary; the candidate's side is their **confirmed current title** — their
background — never their preferred role, which is the thing they are trying to
move into.

**Silent unless both sides resolve.** "Experience in a fast-paced environment"
names no function, and a title we cannot place names none either; in both cases
the candidate keeps every year they have. A wrong penalty here would tell a
career changer they are unqualified on our guess rather than on the posting's
words — and guessing function from a résumé is precisely what misrouted
candidates before Stage A.

⚠️ **The first pattern set missed the reported role.** It required the word
"experience", and the posting read *"Exp should be in between 2 - 4 years, out
of which minimum 2 years **in** product management."* A bare `years in X` pattern
was added. The lesson is the one this repo keeps relearning: a rule verified
only against invented examples is not verified.

The same role, same two years, different background:

| Current title | Score | Bucket |
|---|---|---|
| Associate Product Manager | **100** | Matches you |
| HR Business Partner | **55** | Good match, short on experience |

*"Asks for 2 years of Product experience; your 2 years are in HR & People."*

**Salary is still not modelled and cannot be**, because no employer in the index
publishes one. **Re-measured properly 2026-09-15 including structured ATS fields —
2.2% of 3,509 India roles. The conclusion holds; see Stage T for the numbers.** What the founder wanted from it — an internship not reading as a
90 — is a level problem, and level is now read from the title in both
directions. Pay banding stays parked until there is a real source for it.

### Stage K — walking the product as a user (2026-09-07)

The founder asked to try the real thing end to end. Landing page, sign-in,
shortlist, opening a score's working, tracking a role, the tracker. It all
works. Two defects came out of it that no test would have caught, because both
are about what the product *says* rather than what it computes.

**1 · The landing page published arithmetic the scorer has never produced.**
The comparison card — the page's single piece of proof, next to a portal
showing "★ TOP APPLICANT, no number, no reason" — read:

> Staff Engineer · **62** · Role match 35/35 · Experience 2/30 · Location 15/15 · Work mode 10/10

Not one of those denominators exists. The weights are title 28, seniority 25,
location 10, work mode 7, credential 10. And since Stage J the total is
impossible too: a candidate six years under the bar is `far_short` and capped at
50, so 62 cannot happen. **On the one page whose whole argument is that our
arithmetic can be checked.**

Replaced with the real output of `scoreRole()` for that exact candidate —
**35**, with the cap named — and pinned by a test in `score.test.ts` that fails
if `WEIGHTS` or the caps move. Copy that quotes the engine now has to agree with
the engine.

**2 · Every card gave the same reason.** All 246 read *"You asked for remote."*
`summarise()` picks the weakest component, and the founder's work-mode
preference is remote against an index where — measured — **0 of 246** roles are.
So a 7-point component was the largest miss on nearly every card and became the
explanation for every score.

The line is true and stays; it was the only thing wrong with those roles. What
was missing is the fact that makes it actionable, and it belongs on the page
once rather than on 246 cards. The rail now reads: *"You asked for remote. 0 of
246 match that — the rest lose those points on every card."* Shown only when the
preference is actually biting (a quarter of the list or less).

**Not fixed, and the founder's call.** `profiles.preferred_role` on the live
account is **"manager"** — one word, matching 246 of 742 roles, and stemming
makes it a *perfect* 28/28 title match against "Vulnerability Management
Engineer" and "Associate Compliance Manager" alike. The taxonomy picker and the
live counts in `RoleInput` exist precisely to stop this, and they were built
after this profile was confirmed. One edit on `/profile` fixes the account; what
is unfixed is that a single common word can still score 28/28 on title.

### Stage L — the deploy hold lifts (2026-09-07)

Deployed to production so a real person could try it on their own device. Two
things had to be true first, and neither was.

**1 · Three claims came off the landing page.** True-Fit Scoring needs the
trajectory and industry components, which are unbuilt; Review & Approve is the
parked co-pilot; WhatsApp Nudges is parked and needs a budget. They were kept on
the explicit condition that deployment was on hold and nothing was public
(TASK-053), and that condition just expired. Everything left on the page — the
comparison, the audit strip, How it works, What you get, pricing, the FAQ —
describes shipped behaviour.

⚠️ `CTA` still reads **"Upload Résumé & Get True-Fit Match"**. Not a false claim
— the product does produce a scored match — but "True-Fit" is now an orphaned
term with nothing on the page defining it. Founder's call.

**2 · The privacy page was about to name the wrong company.** `GROQ_API_KEY` was
never in the Vercel production environment, and the page read
`activeProvider() ?? 'gemini'` — so with no key configured it published *"we send
the extracted text to Google's Gemini API"*, directly above a paragraph about
**Groq's** retention terms. Two false statements at once, on the page whose whole
job is being checkable, and it would have gone out to the first real user.

The fallback is deleted. With no provider configured the page now says plainly
that nothing is sent anywhere; the Groq retention paragraph renders only when
Groq is actually the provider. The key was then added to the Production
environment only, so the honest version is also the accurate one — and skills
are read again, which the 20-point skills component needs.

**Also shipped for this:** sign-out. There was none. The only `signOut()` in the
codebase sat inside `deleteAccount()`, so the sole way out of a session was to
destroy the account — discovered while trying to hand the product to a second
person on a machine already signed in as the founder.

**It is live at https://saaf-akshay-keerthi.vercel.app.** Verified against the
deployed site: the three claims are gone, the comparison card prints the real
`scoreRole()` output (35, capped at 50, reason named), `/privacy` names Groq,
`/api/dev-signin` 404s and `/dev/bench` never reaches a signed-out visitor.

**Two things the deploy itself taught us.**

⚠️ **A `.vercelignore` turns off the `.gitignore` fallback.** Vercel uses
`.gitignore` only while `.vercelignore` does not exist. Adding one to stop
shipping the licensed ProductOS material — and a second full checkout of the
repo that had appeared under `.claude/worktrees/` — silently removed the rule
keeping `.env.local` out. The env lines in that file are load-bearing and are
commented as such.

⚠️ **HANDOFF A5 is real and now has a repeatable answer.** `vercel --prod` from
the repo hung for 14 minutes with the deployment stuck at `UNKNOWN` and a 0 ms
build. Deploying from a copy staged without `.git` reached "Building" in three
seconds. Until the noreply address is added to the Vercel account, that is the
procedure — never move the repo's own `.git` aside to do it.

**And a live defect it exposed.** `ingest/audit.ts` stamped its row with
`new Date().toISOString().slice(0, 10)` — the UTC date — while the cron fires at
21:30 UTC, which is 03:00 IST. Every run an Indian reader would call this
morning was stamped yesterday, and `/api/audit/today` compared it against a UTC
"today" and called its own freshest data **stale for 21.5 hours out of every
24**. It was on the public landing page inside ten minutes of going live.
`istDay()` in `src/lib/day.ts` now serves the audit writer, the audit route, the
landing strip and both follow-up-due comparisons in the tracker.

### Stage M — the registry stops being typed by hand (2026-09-07)

The index held **742 India roles from 31 companies**. The stated ambition was
tens of thousands. The gap had two causes and only one of them was fixable.

**Cause one is structural and stays.** The aggregators that advertise millions
of jobs are fed by LinkedIn, Indeed and ZipRecruiter, which are exactly the
sources locked off on ToS grounds. That volume is not available to this product
and never will be. Nothing in this stage touches that lock.

**Cause two was self-inflicted.** `scripts/discover-boards.ts` probes **219
hand-typed company slugs**. The sourcing method was never the bottleneck — the
same public ATS APIs this repo already had adapters for serve over a million
postings across twenty thousand companies. The bottleneck was that a human had
to think of each company's name.

Common Crawl's URL index knows who they are. `scripts/harvest-common-crawl.ts`
reads it — the index, not the boards; no employer's server is touched — and
regexes company slugs out of the ATS host patterns. Five crawl snapshots
produced **27,888 candidates**. `scripts/qualify-boards.ts` then calls each
company's own public ATS API, through the same `ADAPTERS` the daily ingest uses,
and keeps a board only if it returns a live India role.

**This is also the Big-4 / big-tech answer.** A Workday board is addressed by two
unguessable strings, host and site. `discover-workday.ts` brute-forced an 8 × 12
grid per tenant and found 2 of 31 candidates. The harvest returns the real pairs,
and with them Hitachi, Novartis, DXC, Guidewire, Trane, Pernod Ricard and
Columbia Sportswear — none of which slug-guessing could ever have reached.

**⚠️ THREE DEFECTS HAD TO BE FIXED BEFORE ANY OF IT LANDED**, because each one
destroys data the moment the registry outgrows a single run. Growing first would
have turned all three from latent into active, silently.

| | The defect | What growth would have done |
|---|---|---|
| **F1** | The prune deleted every role unseen for 30 days, globally | Rotation *is* boards going unvisited for 30 days. The prune would have deleted the index it was rotating through |
| **F2** | A paging adapter that stopped short upserted a partial list as complete | One Workday timeout deletes ~97% of that company's roles |
| **F10** | `syncRegistry()` wrote `active: true` for every board every run | Every board the ingest had retired came back, forever |

The prune is now scoped to boards **actually ingested in this run**; `fetchAll`
returns `{ roles, complete }` and an incomplete board is neither pruned nor
deactivated; `active` is written only for rows that did not already exist.
Verified live: a run in which all 31 boards were skipped for time pruned **zero**
roles, and a board returning HTTP 404 recorded its error and kept a role that was
60 days stale — both of which the old code would have deleted.

**India detection was the other precondition.** `resolveInIndia` was twenty
hardcoded substrings, and it was wrong in both directions. It missed Kochi,
Indore, Coimbatore, Chandigarh, Bhubaneswar, Ludhiana and every state but seven —
while `'india'` was tested with `String.includes`, so **"Indianapolis, Indiana"
was an Indian posting.** It now delegates to `src/lib/taxonomy/locations.ts`, the
54-city, 40-state taxonomy Stage F had already built and the ingest had never
used. That alone took the existing 31 boards from 742 roles to 792, with no
regressions across all 71 location strings in the live index.

It had to come first because qualification accepts or rejects a whole company on
this function: a weak filter would have discarded good employers permanently.

**Four other ceilings went with them.** SmartRecruiters' listing was pinned at
`limit=100` with no offset, so postings 101+ were invisible — Swiggy gained 23
roles the moment it paged (**F9**). The four pipeline stages shared one 60-second
Vercel function, so the last of them silently did not happen on a slow night;
they are now four cron paths with a budget each (**F4/F5**). The shortlist
selected its 500 roles by recency, which hides the best match once more than 500
match — it now ranks by `ts_rank_cd` in the database first (**F3**, migration
0020). `roles.description` is capped at 6,000 characters, the 95th percentile of
the live distribution, because it is the column that decides when the 500 MB free
tier runs out (**F8**).

**Two bugs were found by reviewing this work rather than by planning it.**
`WD_MAX_PAGES` was a module-level constant, so the qualifier setting it to 1 ran
*after* the import had already read the default — ES module evaluation order —
and the sweep was paging every Workday tenant in full while looking like it was
doing one request. And `recompute.ts` and `digest.ts` both selected profiles
unbounded: past a thousand confirmed users, user 1,001 onward would never be
rescored or emailed again, with no error anywhere. Both are fixed; the first was
caught by a test written for the completeness contract.

**Lever is deliberately absent from the harvest.** `jobs.lever.co` now publishes
a robots.txt carrying Content-Signal directives and Common Crawl has stopped
indexing it. Older snapshots still hold Lever URLs and could be mined; they were
not. Reading an archived copy to get around a current refusal is the same act
with an extra step, and it sits badly beside this repo's own LinkedIn/Naukri
lock. The ten Lever boards stay hand-curated, and Lever's public postings API —
which the company publishes and the ingest calls — is unaffected.

**One Vercel project, and it was not cosmetic.** The founder reported the site
living on two domains. `saaf-i9` turned out to be a two-day-old deployment of the
`saaf-ai` v0 export under the Saaf name, in `iad1` rather than `bom1`, with no
`/signin` and no `/start` — and it answered `/today`, `/applications` and
`/profile` with **HTTP 200 to anonymous visitors**, rendering a real shortlist to
the open internet. It was deleted. The surviving app enforces auth server-side on
every route, above RLS.

### Stage N — the application co-pilot, as a framework (2026-09-07)

Review & Approve is built, and **what it deliberately does not do is the
product decision.** Recorded here because it looks like an unfinished feature
and is not one.

**The shape, as the founder set it.** The drawer suggests a *few* curated résumé
pointers as a comparison, and Apply then redirects to the employer's own site.
That is the whole loop. It is deliberately thin: curating a résumé per job is
where this product is expected to charge, so the free tier shows enough to prove
the mechanism works and stops there. A future session that finds three bullets
and concludes the generator is broken, or "improves" it into a full résumé
rewrite, is removing the thing the business runs on.

**What is already load-bearing under it.** `src/lib/tailor.ts` generates and then
*filters*: an invented metric, a company that is neither the candidate's nor the
posting's, a tenure above the profile, or a credential not held gets the line
dropped, and what was dropped is shown with its reason. The badge in the drawer
is that filter, not a caption. When the paid tier lands and the volume of
generated material goes up, the filter is what keeps it defensible — so it
should get stricter as the feature grows, never looser.

**Saaf still never submits.** "Approve & stage" files the role on the candidate's
board; Apply opens the employer's site. Assisted application is in scope,
automatic application never is (`docs/CONFLICTS.md` A14). A paid tier does not
change that line.

⚠️ **The comparison is one-sided today, and it is worth knowing why.** The drawer
shows what we would write, not a before-and-after against the candidate's own
bullets — because the résumé file is deleted after parsing and the original
bullets are never stored. A true side-by-side needs source material this product
deliberately does not keep. The options, none of them taken yet: compare against
the profile fields we do hold (weak), start storing résumé text (breaks the
deletion promise on the upload screen), or let the candidate paste their current
bullet in the drawer for a live comparison (no new storage, and the only one of
the three that costs nothing).

### Stage O — the ATS funnel becomes the front door (2026-09-08)

The checker stopped being a text box and became the product's first complete
loop: **upload → score → rewrite → preview → download**, public, with the wall
at the file rather than at the work. TASK-064.

**Why the upload matters more than it looks.** The old surface asked a stranger
to open their PDF, select all and paste. Most of them never do — and the paste
itself destroys the layout, which is the thing being measured. A two-column
résumé cannot be diagnosed from text somebody copied out of it. Paste survives
as the fallback for a file we cannot read, never as the entrance.

**The claim on the page was narrowed, not dropped.** It said "no AI is
involved" and that was true of everything on it until a rewrite existed. It now
says **no model decides your score** — true of the upload, the parse, the score
and every finding, with the one model step labelled where the candidate asks
for it. Leaving the old sentence up would have been the cheapest possible lie
on a page whose whole argument is that a number you cannot reproduce is
worthless.

**The guard had to be re-derived, not reused.** `groundingFailure()` refuses any
line stating a figure, because a profile holds skills and years rather than
achievements — so on a résumé it would delete every quantified bullet, which
are the best lines on the page. `src/lib/resume-rewrite.ts` asks the narrower
question the surface allows: **is every figure, and every word, in the
rewritten line already present in the line it came from?** What is grounded is
masked; what the model ADDED faces the shared guard untouched. Stronger than the
guard alone, and a refusal reverts to the candidate's own words rather than
losing the line.

⚠️ **Three defects were found by RUNNING it, and none would have been found by
reading it.** They are the argument for the live-verification habit:

1. **The rewrite scored 79 → 70** — worse, under a button marked "improve my
   score". `sectionsToText()` wrote role lines with an em dash, a shape our own
   checker flags and our own parser misreads. `roleLine()` is now shared by the
   scorer, the .docx and the preview so the three cannot drift, and a test
   asserts the round trip introduces no finding the input did not have.
2. **The guard handed the candidate their own words back as fabrications** —
   "API" and "European", both in the line being rewritten.
3. **`separator-header` was quoting the contact line**, so a finding headed "a
   role line built from separators" pointed at somebody's email address. Fixed,
   and `title-misread` added alongside it: a parser returning "Jul 2023 -
   Present" as a job title previously raised nothing, because `title-unreadable`
   requires an ABSENT title. A confident wrong answer was invisible.

**The template is designed, and restricted to constructs that parse** — founder
decision. Styling lives in CSS; the document is headings, text and bullets, one
column, no tables or text boxes. The `--paper-*` tokens are the only ones in the
system that deliberately do not invert in dark mode: it is a picture of a
printed page.

**Measured, live, with Groq against a real .docx:** 79 → 92, six lines
rewritten, and the model's one fabrication — "5 years" against a résumé saying
four — refused and shown to the candidate.

### Stage P — parity with the category leader, and the one thing past it (2026-09-09)

The checker became an instrument rather than a report, and the index was wired
to it for the first time.

**What was copied, deliberately.** The two-pane shape is theirs: a fixed rail
carrying the gauge and every failing check as a clickable row, beside a pane
that answers one check at a time. Ours was a single scrolling column where every
finding shouted equally. Our CONTENT was already better — every finding quotes
the candidate's own line, nothing is paywalled — and the interface was throwing
that away. One difference kept: their rail shows locked rows, which is what
makes their paywall convert. Ours has none, and says so at the bottom.

**Per-fix apply/skip/rewrite replaced the all-or-nothing rewrite**, and most
fixes need no model at all. `src/lib/resume-fix.ts` is a substitution table:
"Worked on migrating the ledger" → "Migrated the ledger" reuses the candidate's
own verb; "Responsible for" → "Owned" is a synonym; "Involved in" → "Contributed
to" is a DE-ESCALATION, never a promotion. Instant, free, identical every time,
and incapable of hallucinating — the competitor markets this exact class of
change as "AI rewrite suggestions". The model is now the escape hatch
(`rewriteBullet`, ~200 tokens for one line against 1,360 for a document).

⚠️ **Three findings are deliberately ASKS, not fixes.** A missing figure, a
missing link, a résumé that is too short cannot be repaired without inventing
something. Their product ships "AI rewrite suggestions" for quantifying impact,
which means a model proposing a number for somebody's achievement. A test
asserts our copy says "we will not invent one."

**The score re-computes in the browser**, using the identical `checkResume`
already in the bundle — measured 57 → 79 as four fixes were accepted, with no
round trip and no rate limit between a candidate and their own edit. That is not
the banned "second opinion on the client": the ban is on REIMPLEMENTING a check,
and the same function cannot disagree with itself.

**The market column is the first thing on the page they cannot copy.**
`scripts/build-role-keywords.ts` was already computing per-term document
frequency and throwing it away; it now keeps it, so the report says
"`engineering` is in 88% of the 199 postings, `cloud` in 67%" instead of listing
missing words flat. `jdVersusMarket()` splits a pasted posting into
market-standard and employer-specific vocabulary — the over-fitting warning
nobody without an index can give.

**And the index re-score, which is the strongest sentence this product can
say.** `src/lib/services/index-match.ts` runs the same `scoreAgainstIndex()`
`/today` runs, against a résumé pasted by somebody with no account: measured
46 → 60 postings at 50%+ after a rewrite added terms the candidate genuinely
holds. ⚠️ **Counts only, never roles** — it uses the service client because
`roles` is `authenticated read`, and a public endpoint that enumerated the index
would give away the moat one request at a time. The roles behind the number are
what signing in buys.

**Two defects found on the way.** The parser could not read numeric dates
(`07/2023`), so it left `07/` in the title and the checker reported a
`title-misread` **it had caused itself** — common on Indian résumés. And Groq's
free tier turned out to be 8,000 tokens per MINUTE shared across every
environment, which is ~3 rewrites a minute site-wide; see Stage O's note and
`src/lib/parse/llm.ts`.

### Stage Q — the checker was measuring the file, not the résumé (2026-09-12)

Six rebuilds of `src/lib/ats-check.ts` had added checks on top of a parser that
returned nothing, and nobody could tell, because there were no fixtures and no
benchmark.

**The measurement that ended the argument.** `resume.pdf` and `resume.docx` in
`src/lib/parse/__tests__/fixtures/` contain the IDENTICAL résumé. Run through
the checker as it stood: **34/100 as a PDF, 65/100 as a .docx.** A 31-point
swing caused only by the file container.

**The cause was one expression.** `pdf.ts` mapped every pdfjs text item to
`.str` and joined on a space — **one line per page** — discarding `transform`
(x/y), `width`, `height` and `fontName`, all of which pdfjs hands over free.
Downstream, everything starved:

- `parseSections` needs headings under 42 characters, so **every PDF returned
  zero experience, zero skills, zero education, zero section order**.
- **13 of 37 rules read `experience[].bullets`** and silently never fired, so a
  genuinely weak résumé was not penalised.
- `looksMultiColumn` needs six substantial lines and got one, so the file's own
  self-described *"highest-value check"* could never fire on a PDF.
- `single-blob` and `missing-sections` fired on effectively every PDF — the
  checker reporting, at −36, a defect the parser had created.

**`src/lib/parse/layout.ts` is the fix.** Lines are recovered by clustering text
items on shared baselines (tolerance = half the median glyph height); columns by
finding vertical whitespace corridors no text crosses; headings additionally by
point size. `pdfToText` keeps its exact signature and is now a flattening of
that structure, so no caller changed. **The two fixtures now score 65 and 65.**

**The score model changed shape, and had to.** It was `100 − Σ {high 18, medium
9, low 4}` — flat, saturating at zero after six findings, with the headline
number and the category bars computed separately and never reconciling. It is
now the two-part shape the category leader's own documentation describes:
`0.35 × parse-coverage + 0.65 × weighted content`.

⚠️ **`parseCoverage` is not new work — the number was already being computed and
thrown away.** `parseSections` has always returned `unplaced`, and `sections.ts`
has always said a surface above should report it. None did; it was validated in
transit by two Zod schemas and rendered nowhere.

⚠️ **The parse rate describes a TYPICAL ATS, not ours.** `layout.ts` rebuilds
columns and reads them in order, so our own recovery on a sidebar résumé is near
perfect. Reporting that as the parse rate would tell a candidate their two-column
CV is safe because our parser is good — the opposite of the truth, and the
opposite of what the tool is for. Where a structure is known to defeat ordinary
parsers the rate is reduced and the reason is named in `coverage.atsRisk`.

**`bench/` and `npm run bench` are the part that stops this recurring.** One
invented résumé in four layouts plus the original fixture pair, with two gates:
ACCURACY (did we recover the facts `bench/manifest.json` says are there) and
INVARIANCE (do layouts of one résumé score alike — tolerance 3 points, measured
at 31 before). `bench/corpus/real/` is gitignored: real résumés are third-party
personal data and this product deletes what it parses.

⚠️ **The weights are provisional and belong to the corpus, not to taste.**
`PARSE_WEIGHT`, `CATEGORY_WEIGHT` and `SEVERITY_CATEGORY_COST` are set by
judgement until 20–30 real Indian résumés land in `bench/corpus/real/`. The
bench prints a distribution line and labels it as not a basis for tuning while
only synthetic documents are loaded.

**Defects found and fixed on the way, each with a test that makes it
unrepeatable:**

| Defect | Why it mattered |
|---|---|
| `analyse: 'analyse'` in `MISSPELLINGS` | British spelling registered as a misspelling of ITSELF, rendering «"analyse" (should be "analyse")» and costing 18 points of the content category. **British spelling is standard in India** — the only market this serves. `misspellings.test.ts` now proves against a real en-GB dictionary that no key is a real word and every value is; the dictionary is a devDependency because `checkResume` is isomorphic and 576 KB would ship to every visitor. The list grew 41 → 98 under that guard. |
| `handled` in both `ACTION_VERBS` and `WEAK_OPENER` | One bullet counted as strong and weak simultaneously — two findings disagreeing on one screen. |
| Three copies of the date regex, one fixed | Numeric dates (`07/2023`, common on Indian résumés) were fixed in `sections.ts` only; `extract.ts` and `ats-check.ts` were byte-identical to each other and blind to half the dates they fed. Now one `src/lib/parse/dates.ts`, with `2021 to 2023`, `Jan. 2023` and `Ongoing` added. Every export is a factory — a shared `g`-flagged RegExp carries `lastIndex` and makes `.test()` alternate. |
| `jdVersusMarket` never called | The form has always offered "paste a job description"; nothing read it. Now `jd-missing-standard` splits what the posting asks for into **market-standard** terms (worth adding, with the % of real postings that use them) and **employer-specific** vocabulary (worth NOT over-fitting to). Telling those apart requires an index, which is the point. |
| `action-verb-coverage` categorised `tailoring` | It fires without a target role, but that whole category is dropped when no role is chosen — so its cost silently evaporated. Moved to `content`, where it is a property of the writing rather than of the target. |
| Skipped findings stayed clickable in the rail | Selecting one set an id the detail pane could not find; the pane fell back to a DIFFERENT check while `aria-current` stayed on the clicked row. |
| `ai:`-prefixed applied-edit keys | Could never match their reader, so a model-rewritten line never showed as applied. |

**Severity is now rendered as the finding's real marginal cost** — `−20`, `−1` —
rescored without it and differenced, so the reader can check it by applying the
fix and watching the gauge. ⚠️ A layout finding's cost includes the parse-rate
half it depresses; attributing only the content half printed `−7` beside a check
whose own copy says "blocks parsing". The old `✕` glyph used `text-destructive`,
which `DESIGN.md` reserves exclusively for system errors — *"a low score is a
correct answer, not a failure"* — so it has gone rather than been recoloured.

### What the real corpus found (2026-09-12, same day)

The corpus arrived the same day the rig did: nine variants of the founder's own
résumé, plus eleven public sample résumés from university career centres
(`npm run bench:samples`, fictional people, gitignored — third-party material,
and real strangers' CVs would be personal data this product has no business
holding). **26 documents. Every defect below was invisible to the synthetic
corpus and obvious within one run.**

⚠️ **Two of eleven public samples have NO TEXT LAYER AT ALL**, and the producer
is not a scanner — it is `Microsoft: Print To PDF`, which paints words as vector
shapes. ~12,000 drawing operations, zero text items. A résumé made that way
**reads as completely blank at every applicant tracking system in the market**
while looking perfect to its author. The existing copy called this "likely a
scan or an image", which describes the result and is useless as advice: nobody
who chose File → Print recognises themselves in the word "scan", so they resend
the same file. `pdfProducer()` now names it and the instruction is one sentence
— File → Save As, not File → Print. **This is probably the single most valuable
finding the tool can return, and it was unreachable without real documents.**

| Defect | Measured on | Cause |
|---|---|---|
| **"6 roles are both marked as ongoing"** | Founder's résumé | `overlapping-present` counted "– Present" across raw TEXT, so three side projects under a Projects heading were tallied as concurrent jobs. Now counted from parsed entries, with projects tagged `isProject`. |
| **"Your current job title did not come through"** | Founder's résumé | Two parsers answering one question. `parseSections` had "Private Banking Manager (M1)" at ICICI Bank while the report printed the older regex reader's blank — the checker contradicting its own extraction, at 4 points. |
| **Ten and eleven "degrees"** | Two public samples | Everything under an education heading became a qualification: coursework, minors, study-abroad notes, honours, a placement committee, a dance club. A line now opens an entry only if it names a qualification or carries a year. |
| **"SUMMARY OF QUALIFICATIONS" read as EDUCATION** | Two public samples | The keyword fallback matched `qualification` before it considered `summary`, so a summary's prose was parsed into degrees. Summary is now tested first. |
| **City reported as employer** | Public samples | "Razorpay" alone above "Jul 2023 – Present \| Bengaluru" parsed positionally as title "Razorpay", employer "Bengaluru". **Both parsers had it**, identically and invisibly — fixing `parseHeader` alone left it arriving by the other route. |
| **"A 2 years gap between Amazon and ICICI"** | Founder's résumé | Printed above a full-time MBA dated across exactly that window. Advice to explain something the reader had already explained, on the same page. Gaps overlapping education are suppressed. |
| **`unprofessional-email` on an ordinary address** | Founder's résumé | **A defect introduced the same day.** The check flagged any four consecutive digits, which fires on everyone whose name was already taken. It now tests for the absence of a name-like run, not the presence of digits. |

⚠️ **One fix had to be walked back, and the repo's own test caught it.** Preferring
the structured title outright silenced `title-unreadable` on the documents it
exists for: `parseHeader` assigns positionally, so a role line reading only
"Paytm" returns `{title: "Paytm", employer: null}` — a confident wrong answer,
which is the exact regression a comment in `ats-check.test.ts` was written after.
The structured read is now trusted only when the line produced BOTH halves.

**Net effect on the founder's own résumé: 85 → 94**, with four false findings
removed and the four that remain all genuine. Across the corpus, education
entries fell from as many as twelve to between one and four, and no document
regressed.

### The document, beside the findings (Phase 4.1)

The report used to describe lines the candidate had to picture from a
quotation; the résumé itself appeared only AFTER the whole-document rewrite.
It now renders under the finding, with the quoted line marked, and selecting a
different check scrolls to its line.

⚠️ **The highlight is an overlay and never reaches the file.** `ResumePreview`'s
own header promises it is a picture of what downloads, so the mark is drawn with
the app's accent rather than the paper palette, exists only while a finding is
selected, and `buildFullResumeDocx()` is untouched.

⚠️ **The "before you paste" column now stands down once a report exists**, and
the layout needed it to. Measured at 1280px with both sidebars up, the pane
holding the report and the document was **368px wide** — too narrow to read a
résumé in, which made showing one pointless. It is now 668px. Those promises are
also spent by then: every line in that column is about what happens *before* you
paste, and somebody reading their own findings has taken that step. Implemented
with CSS `:has()` rather than state, because `ToolPage` is a server component
and the step lives in the client one; a browser without `:has()` keeps the
narrower layout and nothing breaks.

**Matching is on text, not on line numbers**, because nothing in the pipeline
carries a line index from a check back to the rendered document. Short evidence
must match exactly and long evidence matches by containment — a single
threshold silently dropped every `skills-not-evidenced` finding, whose evidence
is one skill name.

⚠️ **Two things this surfaced.** `multi-column` had quietly LOST its quote when
detection moved to geometry: its evidence still came from the whitespace
heuristic, which no longer runs once a measured column count exists — so the
highest-severity check in the file was the one with nothing to show.
`columnSample()` now takes a line of real content from the narrower column,
which is both better evidence and findable in the document on screen.

And the empty-state copy claimed *"Each one quotes the line it came from"*,
which is true of roughly half. Some findings are about ABSENCE — `no-email`
cannot quote a line that is not there — so the sentence was corrected rather
than evidence being forced onto checks that have none.

### The half nobody else can build (Phase 5)

Three things this product holds that a résumé tool without an index structurally
cannot, all of them previously buried.

**The live-jobs count moved under the gauge.** It was the third card down,
beneath two panels explaining the score — so the single hardest thing here to
copy sat below the parts anyone can copy. Verified 2026-09-14: **85 live jobs at
50%+ of 150 Product Manager postings.**

⚠️ **It is still behind a click, deliberately.** This is the heaviest read on
any public unauthenticated surface in the product — up to 150 postings with
their requirements — so running it on every upload would turn a free tool into
an expensive one. What changed is that the OFFER is concrete beforehand: *"We
hold 199 Product Manager postings from company hiring boards"*, taken from
`role-keywords.json` at no cost. And with no role chosen it now PROMPTS for one
rather than rendering a greyed-out button, which was a dead end on the one
feature no competitor has.

**The market panel stands on its own.** It was reachable only when
`role-vocabulary` both fired AND happened to be the selected check — and that
rule fires only when more than half the role's vocabulary is missing, so a
candidate whose résumé was merely three-quarters right never saw it at all. It
is a property of the ROLE, not of any finding. Verified live: *engineering 81% ·
162 ads, platform 69% · 138 ads, strategy 65% · 130 ads* — measured document
frequencies, not a recommended-keywords list.

**The refusal is stated where the whole report can see it.** Three checks are
deliberately ASKS rather than fixes — a missing figure, a missing link, a résumé
too short — because none can be repaired without inventing something. The
category leader markets exactly that class of change as "AI rewrite suggestions"
for quantifying impact, which means a model proposing a number for somebody
else's achievement. That position lived inside one finding's card; it now closes
the rail. `resume-fix.test.ts` pins all three as asks and pins the wording, so
the day one quietly becomes an `edit` the suite says so.

**Migration `0024` adds `score_model`.** A v1 score and a v2 score are not the
same kind of number, and `0023` exists specifically to power a "was 57, now 84"
line. `npm run rescore:saved` recomputes every stored row from its `body` text —
possible only because 0023 denormalised that text, which it justified as "derived,
small" without knowing this is what it would buy.

### Stage R — the teardown, and the scorer it broke open (2026-09-14)

The whole product was driven end to end against the live index for the first
time — every screen, signed in, with a real résumé — and judged against the
claim to lead the Indian market. The published assessment is
[Can Saaf Be Number One?](https://claude.ai/code/artifact/4dcec4bf-b18d-4cd3-bd77-9b0788ffde19).
Its verdict, and the reasoning a fresh session needs:

**No, not as aimed — and the reason is not quality.** Three measured things.

⚠️ **45 OF THE 100 SCORING POINTS WERE CONSTANTS.** Measured across 504 real
roles: work mode paid out at **100%**, credential at **98%**, title at **99%**.
Three of six components never varied, which is why every score sat between 50
and 88 and why a role naming none of the candidate's skills was badged a
**strong match at 74%** on the live shortlist — the same unexplained badge the
landing page attacks portals for.

⚠️ **THE COVERAGE CLIFF IS STRUCTURAL AND DECIDES THE CLAIM.** Twelve real
Indian roles through the live scorer: Data Analyst 81 strong matches, Backend
Engineer 42 — against **HR Business Partner 3**, Content Writer 8, Customer
Success 7. Index composition, unchanged as the index grew: engineering 39.2%,
unclassified 44.3%, marketing 1.8%, HR 1.6%, with **sales and operations not
classified at all**. Company ATS boards are where tech and GCC employers post;
Indian sales, operations, BPO and HR hiring largely is not there. **The locked
decision that makes the supply legal is the same decision that caps the
addressable market at roughly the engineering slice.** That is a fair trade and
it is incompatible with "number one in India".

**Zero users after 130 commits.** Both scoring defects above are exactly what
one afternoon with five real candidates surfaces and no amount of solo building
does.

#### What was fixed (P0)

**`scripts/bench-match.ts` is the instrument, and its absence is why this
survived.** `ats-check.ts` got a bench on 2026-09-12; the MATCH scorer — the one
that actually decides the shortlist — had none. It prints score spread and the
average award per component. Anything above ~90% is a constant wearing a weight.

**Work mode and credential paid full marks for ABSENCE.** A candidate who set no
preference, against a posting naming no credential, collected 17 points for
having been asked nothing. `scoreRole` already normalised over applicable
components and `skillsFit` already returned null when there was nothing to
measure; these two did not follow the pattern. `src/lib/jd-match.ts` had worked
around it for its own surface with `omit` — the right conclusion in the wrong
place, since every caller had to remember and the main shortlist never did.

⚠️ **THAT REVERSED A DOCUMENTED DECISION.** `jd-match.ts` argued credential
should be KEPT: "no credential required" is a finding about the posting, read
from its text. True, and not enough — a component measures FIT, and there is no
question of fit where there is no requirement. The trade it makes is recorded in
the file: a posting requiring a credential the candidate HOLDS now scores
fractionally above one requiring none.

**The title component was scoring the retrieval query.** Roles reach the scorer
BECAUSE their title matched the preferred role, and the component then awarded
the heaviest weight in the model for matching the preferred role. What it never
asked is how much of the POSTING is your role — "Product Analyst" is every word
of "Business Execution Consultant - Product Support Analyst", and that posting
led the live shortlist at 88%. Precision supplies the missing half, weighted so
recall still dominates (Fβ, β=2): Indian postings carry team and grade in the
title, so a symmetric F1 would punish a correct match for its employer's naming
convention.

**A separate defect fell out of reading it:** a posting sharing NO words with
the preferred role scored half marks under the note "No preferred role set."
The zero-match case and the no-role-given case were the same branch.

| | Before | After |
|---|---|---|
| work mode | 100% average award | omitted — nothing to measure |
| credential | 98% | scored on 10 of 504 roles |
| title | 99% | 83% |
| Components above 90% | 3 of 6 | **0 of 5** |
| Role match on the live shortlist | 39 of 40 cards at a flat 28/28 | seven distinct values |
| "High-precision match" badges | 18 | 6 |
| The zero-skill role | 74% | 65% |

⚠️ **THE LANDING PAGE WAS ADVERTISING THE BUG.** Its worked example printed
"Work mode 7/7 · Credential 10/10" — seventeen points awarded for absence of
data, on the page whose argument is that our arithmetic can be checked. A test
existed carrying the comment *"If this test fails, the landing page is lying."*
It failed. Both are corrected.

#### What was fixed (P1)

**Employer names.** The index stores an ATS slug in title case: "Wf" on 202
roles, "Jll" on 320, "Aecom" on 352, "Ag" on 207. Corrections are GROUNDED, not
guessed — Workday tokens carry a host and a path, and the path names the company
the host abbreviates (`wf.wd1…/wellsfargojobs`, `ag.wd3…/Airbus`, which is
Airbus). Applied at display, never in ingest: the stored value is what the board
told us and is the evidence behind the name. A test asserts already-correct
names come through untouched.

**One city per city.** "Bengaluru" and "Bangalore" appeared as different places
on adjacent cards. `locationFit` already treated them as one for scoring. Only a
bare city field is canonicalised — "Hybrid in Bangalore" is the posting's own
sentence.

**One résumé, one answer.** `/resume` showed "Manager" at "icici bank" with 2
years while the ATS checker showed "Private Banking Manager (M1)" at "ICICI Bank
Bangalore" with 4 — same file, same session. Three readers existed
(`extractFields`, `parseSections`, the model) and each surface chose its own
precedence. **`src/lib/parse/facts.ts` now owns that precedence and both
surfaces call it.** The model no longer overrides a deterministic answer; it
fills what nothing else reached, and remains the only reader that gets skills
and domain.

**Coverage, named.** The thin-list message said "our coverage, not a verdict on
you" and stopped — right sentiment, nothing the reader can act on. It now lists
the functions we actually cover with live counts and offers the ATS checker.

#### What is NOT fixed, and should not be guessed at

- **Exact-title roles now rank BELOW a buried-title one** (53% vs 76%) because
  experience is doing the ranking. Whether title should outweigh experience is a
  weighting question that needs real candidates, not judgement.
- **HR Business Partner still sees 3 strong matches.** The scorer is honest now;
  the supply is still the supply.
- **The bucket thresholds were not touched.** A zero-skill role at 65% is still
  labelled STRONG MATCH. Changing where that line sits is a product decision.
- ~~**The remaining P2s**: three names for one product (Saaf / Saaf AI / Cookie /
  `jobmatch`), "100% Tailored" in the hero, and the unclassified 44% of the
  index — which needs sales and operations as functions.~~ **Done 2026-09-14 —
  see Stage S below.**

### Stage S — the P2s, and the coverage panel that was lying by omission (2026-09-14)

The three items Stage R parked. Two were copy; the third turned out to be a
user-facing defect rather than tidying.

**One name.** `Saaf AI` was the wordmark in nine places — the document title, the
landing header and footer, the sign-in screen, three shells and the OG card —
while `Saaf` was the name everywhere else. **"Name is Saaf" is in the locked
decisions table**, so this was drift, not a choice, and needed no deciding.

**`/copilot` lost its persona.** It spoke in the first person as "Cookie" ("I
scored 42 roles against your profile") — the only place in the product using that
name, and the fourth name for one product. The card now reads *"Your shortlist,
averaged"* and the sentence is *"Saaf scored 51 roles against your profile."* The
biscuit icon went with it. **Module names were deliberately not renamed**:
`lib/services/cookie.ts` and the interview-prep engine keep theirs, because
renaming internals buys a reader nothing and loses the history.

**"100% Tailored." was cut from the hero**, which now reads *"Precision Career
Copilot for India. Zero Spam."* It was a completeness figure nothing measures —
the same invented number as the "Profile Strength: 92%" dial `/copilot` refuses
to draw, on the one page whose argument is that our arithmetic can be checked.
Stage R found the landing page advertising a scoring bug the same way. **Second
instance of one habit, not two unrelated slips.** The sub-headline already
carried the real promise and is checkable.

⚠️ **THE UNCLASSIFIED 44% WAS NOT A TIDINESS PROBLEM.** `roles.function` has
exactly one reader — `coverageByFunction()`, which feeds the message a candidate
sees when their shortlist comes back thin — and `other` is invisible to it.
Confirmed in a browser on `/today`: *"we are strongest here: Engineering 9,096 ·
Consulting 1,916 · Finance 1,107 · Marketing 412 · HR 375."* A sales candidate
reads five functions, none of them theirs, while **1,390 live sales roles** sit
in the index unnamed. That panel exists to attribute a thin list to our coverage
rather than to the candidate; omitting a function inverts it into a false
statement about our coverage.

Four functions added — `sales`, `operations`, `support`, `design`. Migration
`0025` widens the CHECK constraint; `npm run reclassify:roles` backfills.

| Measured over all 23,184 India roles | |
|---|---|
| sales | 1,390 |
| operations | 640 |
| support | 314 |
| design | 309 |
| `other` | **44.2% → 32.8%** |

⚠️ **STAGE R'S FRAMING WAS ABOUT A QUARTER RIGHT, AND THE CORRECTION MATTERS
MORE THAN THE FIX.** It said the 44% "needs sales and operations as functions."
Sales and operations alone move it to 35.3%. The remainder is not a fifth missing
function — it is the long tail a 1,396-board index of GCC and pharma employers
actually contains: *Senior Statistical Programmer*, *Regulatory Affairs (CMC,
Biologics)*, *Specialist, Payroll*, *Senior Manager - PMO*, *Scrum Master*. Each
needs its own function to be named honestly and none is a market this product
claims to serve. **Do not chase 32.8% with a sixth pattern.**

**The new patterns are APPENDED, and that placement is the design.** First match
wins, so they can only claim titles all five existing patterns declined — not one
existing classification moves. `consulting` keeps "business development" and
"supply chain"; re-cutting that boundary is a decision about the personas, not a
coverage fix. Six tests assert exactly that.

**One guard, one measured reason.** The first run put "Senior Software
Development Manager - Global Operations Team" and "SOC Analyst — Security
Operations" in operations. Both were `other` before, so the change would have
replaced no answer with a wrong one. `ENGINEERING_SUBJECT` guards `operations`
only — the narrower three cannot make that mistake, and a guard on all four
would be a second place to look when a title classifies oddly.

**The backfill lives in TypeScript, not in the migration.** Four `update roles
set function = ...` statements with the regexes transcribed into Postgres ARE
syntax were written and then deleted: the same rules in a second dialect, covered
by no test, drifting the first time `classify.ts` changes. `reclassify-roles.ts`
calls `classifyFunction` itself. One definition of what a sales role is.

**What the dry run found and deliberately does not write.** 30 rows stored
`other` that the *current* classifier calls engineering or consulting — ingested
under an older version and never revisited, because the ingest classifies on
write and never re-reads. At least one is a defect: *"Hindi - AI Voice Data
Collection Project"* reaches engineering through the pattern's bare `\bai\b`.
Folding that into a migration about sales would import an unreviewed change under
another change's name. Reported by the script, left alone. **Open question.**

**Nothing scored differently.** Migration 0010 replaced function-bucket equality
with free-text `title_tsv` matching, so retrieval and scoring never read this
column. `npm run bench:match` before and after: identical, 0 components paying
out at 90%+. `npm run bench`: 26 documents, no delta. 521 tests, lint 0 errors,
RLS verified.

### Stage T — salary was measured properly, and the answer is still no (2026-09-15)

Build #2's first epic was salary-aware scoring. **It was cancelled by its own
measurement gate, half a day in.** The gate is the deliverable; the epic is not.

**The premise that started it was reasonable and wrong.** This file said at line
607 that *"salary is still not modelled and cannot be, because no employer in the
index publishes one."* That was measured against posting **text** — 12 of 799 on
2026-09-07 — and never against the **structured compensation fields the ATS APIs
return**. Three of six providers carry one and the pipeline has never asked:
Lever sends `salaryRange`/`salaryDescription` in a payload we already receive and
discard, Ashby returns `compensation` only behind `?includeCompensation=true`
which is never passed, Recruitee sends a `salary` object. `scripts/seed-fixture.ts:28`
explicitly sets `includeCompensation=false`, so somebody knew and turned it off.
`NormalisedRole` has six fields and no slot for it.

So the claim was unproven for half the index. `scripts/probe-salary-coverage.ts`
proves it. **Measured over 3,509 live India roles across six providers:**

| | share of India roles |
|---|---|
| tier 1 — a structured field with a real value | **1.1%** |
| tier 2 — a figure parseable from the description | **1.1%** |
| **any salary at all** | **2.2%** |

The gate said <5% → do not score. **Salary stays out of the scorer.** What ships
instead is the honest disclosure it already had, and tier-3 context from open
government data if it earns its place later.

⚠️ **THE FIRST VERSION OF THE PROBE REPORTED 27.4% AND WAS WRONG, IN THE HOUSE
STYLE.** It asked *"is there a compensation field?"* rather than *"is there a
value in it?"* — and Ashby and Recruitee both return the key on **every** posting
with nothing inside:

```
ashby      compensation = {compensationTierSummary: null, compensationTiers: []}
recruitee  salary       = {max: null, min: null, period: null, currency: null}
lever      salaryDescription = "<div><br></div>"
```

Both read as 100% coverage. That is the same defect as the 28-point constant and
the parser that returned one line per page: **a check that measures the shape of
a thing instead of the thing.** It would have greenlit a two-week epic with
nothing to read, and the component would then have become exactly the constant
`bench:match` exists to catch. The corrected probe measures a value, and the
comment above `meaningfulValue()` records why.

**The pockets are real but small, and worth knowing.** Recruitee is the best
provider at ~11% on the sampled boards (Lenskart publishes real figures), and
Signoz on Ashby publishes the best data in the whole index — `₹40L – ₹70L •
0.06% – 0.15%`, band plus equity. Greenhouse, the largest provider at 567 boards,
returned **zero** across 642 sampled India roles. A future session that finds one
employer publishing salary and concludes the index has it should re-run
`npm run probe:salary` before building anything.

~~⚠️ **`workday` (324 boards) was not probed.**~~ **Probed 2026-09-15 (TASK-070):
0 of 168 postings across 7 boards carry salary in either tier. 0.0%.** By the rule
of three that is a 95% upper bound near 1.8%, so Workday is comfortably under the
gate and **the question is now closed across all seven providers.**

Workday needed its own probe, and not because of the POST. Its listing rows carry
title, path and `locationsText` and nothing else — `description: ''` in the
adapter, filled later by `fillDescriptions()`. A listing-only probe would have
reported 0% for a quarter of the registry and the zero would have been an
artefact of where we looked rather than a fact about employers. The probe fetches
the **detail** payload per posting instead, capped at 25 per board, using only
`fetchAll` and `detailUrl` so nothing in the ingest had to be reshaped for a
measurement.

**Final measurement, all seven providers, 3,468 India roles: 2.2%** — 1.1%
structured, 1.1% in text. Greenhouse (567 boards, the largest provider) and
Workday (324 boards) both return **zero**. Recruitee is the only provider above
5%, at 8.5%.

**This also corrects `docs/COMPETITOR-ANALYSIS.local.md`**, which ranked closing
the salary gap as recommendation #2 on the strength of Naukri scoring salary as
one of its six parameters. Naukri can score it because candidates and recruiters
type it into Naukri. We read employer postings, and employers do not write it
down. **That gap is not closable from this supply, and the analysis was wrong to
imply it was.**

### Stage U — the interview-prep engine was never correct, only untested (2026-09-15)

Second epic in Build #2 cancelled by measurement, and the more uncomfortable of
the two. `docs/ROADMAP.md` called `src/lib/interview-prep.ts` *"the highest-value
unshipped asset in the repo"* — 312 lines, fully deterministic, unit-tested, five
grounded questions each carrying the posting sentence it came from, and reachable
from nothing. It was built, the page was written, the nav item was unlocked, and
it rendered correctly on the first try.

**Then it was pointed at 60 real postings.**

| | |
|---|---|
| skill-gap questions | **224 of 286** |
| every other kind combined | 62 |
| non-skill questions per role, average | **0.9** |
| roles yielding ≥2 non-skill questions | **6 of 60** |

And the skill-gap questions read, verbatim:

> How much have you worked with **Poland**?
> How much have you worked with **Denmark**?
> How much have you worked with **collaborate Teams**?

`extractSkillPhrases()` cannot tell a technology from a country, a company name
or a sentence fragment. It slices prose on commas inside any line containing the
word "experience", and a capital letter is the only signal it has that something
is a skill — which "Poland", "CRED" and "Determination" all carry.

⚠️ **THE HEADER COMMENT WAS TRUE AND INSUFFICIENT.** It reads *"Nothing is
generated, so nothing can be invented."* Both halves are correct. **Deterministic
nonsense is still nonsense**, and being unable to hallucinate is not the same as
being right. This product's whole argument is that a number you can check beats a
number you cannot — and it just spent a day discovering that a *checkable* claim
can still be wrong. The unit tests passed throughout, because they test the
assembly logic against fixtures somebody wrote, not against the index.

**Why it survived so long:** it was reachable from nothing. The nav item was
locked, so no session ever saw its output, so the crudeness the author explicitly
accepted — *"a false positive costs one question the candidate skips"* — was
never tested against the case that breaks it. That reasoning holds for one bad
question inside a good list. It does not hold when 78% of the list is bad.

**Kept from the attempt:** two real bugs, found only by rendering it. Soft traits
("curious", "learn", "wants to grow") and sentence fragments ("reduce risk.
fact", "000 global organizations") passed every filter; and `skillGaps()` joined
the role title to the description with a **space** rather than a newline, so the
title was sliced on its own commas and offered back as a gap — the posting
"Manager II, Software Engineering" listed **"Manager II"** as a skill the
candidate was missing. Six regression tests pin both, built from the strings the
live index actually produced.

**Reverted:** the page, the nav unlock, and the `listScoredRoles` service.
`/copilot` and `/resume` were added to the proxy matcher and that stays — they
are `(app)` pages that self-guard in the page body and were missing a session
refresh, which is an unrelated real fix.

**The blocker is TASK-080**, a skill vocabulary. `role-keywords.json` is not it.

### Stage V — an ignore pattern deployed a 404, twice, in two files (2026-09-15)

`/api/extension/score` shipped, passed every local test, typechecked, and
returned **404 in production**. Nothing failed. The route was simply not in the
upload.

**The cause is one rule implemented in two tools.** Both rsync's `--exclude` and
`.vercelignore` treat a pattern with no leading slash as matching a directory of
that name **at any depth**. Adding `extension` to keep the browser extension out
of the deploy therefore also removed `src/app/api/extension/`:

```
--exclude 'extension'   →  also deletes src/app/api/extension/
extension/              →  also excludes src/app/api/extension/
```

Both are now anchored — `--exclude '/extension'` and `/extension/` — along with
every other pattern in both files.

⚠️ **THE SAME FLAW WAS ALREADY LIVE AND HAD BEEN FOR A DAY.** `bench` was added
to both files on 2026-09-14 to stop the founder's real résumés being uploaded.
It worked, and it was also silently excluding **`src/app/dev/bench`** from every
deploy since. Invisible only because that page 404s in production by design, so
the symptom was indistinguishable from the intent.

**Why local checks could not catch it.** `npm test`, `npm run lint`,
`npm run typecheck` and the dev server all read the repository. The exclusion
happens between the repository and the upload, so every gate passes and the
artifact is still wrong. **A missing file deploys as a 404, not as an error** —
there is no failure anywhere in the chain to notice.

`docs/RUNBOOK.md` now carries three pre-deploy checks rather than one: the
existing secrets/corpus `find`, an existence test on a known route file, and a
`diff` of `src/` between the repo and the staged copy. The third is the general
one — it catches the next exclude that eats something nobody thought to test.

**Deployed `dpl_Bj8K4espy8x63hM2sRfdaEfn39nt`**, verified by calling the
endpoint on production: 200, total 55, four components, and the source quote
*"Minimum 3 years of experience with Python, Docker and AWS."* read back out of
the posting.

### Stage W — the Résumé Studio begins, and two of my own claims were wrong (2026-09-15)

The founder walked a competitor's résumé-tailoring flow and rejected ours
wholesale: *"not the least satisfied with our current UI, mechanism and anything
related to it. The idea remains the same."* Phase 9 in `docs/ROADMAP.md`.

**The finding that shapes the work: almost none of it is an AI problem.** Their
five-beat funnel — score, gap table, section picker, generation, before/after —
is four screens of arithmetic and one model call. We already own every engine.
A whole-document rewrite is **~1,360 tokens** (`resume-rewrite.ts:366`), not the
6,000–10,000 I first told the founder; at 8,000/minute shared that is ~5 rewrites
a minute, tight rather than fatal.

⚠️ **TWO CORRECTIONS TO MY OWN PLAN, BOTH FOUND BY MEASURING BEFORE BUILDING.**

1. The plan said the projected score "rises substantially" because `jdText` was
   missing from the after-check. **Measured: 0–1 point.** The bug was real — the
   finding disappeared entirely, so a candidate who pasted a posting had nothing
   answering *did the rewrite close the gap to this job* — but the magnitude was
   invented and is corrected in the plan file.
2. The plan also called the missing `layout` argument a bug. **It is not.** A
   rewrite replaces a two-column upload with a single-column document built from
   `ResumeSections`; charging it the old geometry would understate a real gain,
   and `ats-check.ts:1613-1625` already drops the same penalty when pricing that
   finding. A test now pins the asymmetry so a future session does not "fix" it
   into symmetry.

**The design collision, resolved by reading rather than assuming.** I told the
founder the design system is "monochrome, flat, square-cornered" and it is not —
**that was retired 2026-09-07** and `docs/DESIGN.md` has superseded it since.
⚠️ **`PROJECT-STATE.md:102` still asserts the retired system and is stale**; the
row should be corrected rather than worked around. What survives from it is the
part that matters here: the named anti-reference is a résumé tool measured at
196 shadowed elements, 8 radii, 4 gradients and 2 banned typefaces, positioned as
*"applies for you while you sleep."* The screenshots sit close to that profile.
**Take the flow; leave the rainbow gauge, the red alarm and the urgency banner.**

**Commit hygiene failure worth recording.** `fecfcc6`'s subject describes only
the score fix; an over-broad `git add -A` also swept in migration 0027, the
profile contact fields, the extension manifest changes and three scratch files
from `.tmp-key/`. The scratch files are removed and gitignored and the private
key was never committed, but the commit's message does not describe its
contents. `git add -A` after a long session is how that happens.

### Stage X — the gap table, and the row that had to be cut to ship it (2026-09-15)

TASK-083, the Résumé Studio's Stage 2: the posting beside the résumé, one row
per dimension, each opening into the sentence it was read from. Zero tokens —
everything is retrieval and arithmetic over text the candidate supplied, so the
screen works with the model switched off.

⚠️ **THE PLAN'S FOURTH ROW WAS CUT, AND THE MEASUREMENT THAT CUT IT IS THE
POINT OF THIS ENTRY.** The plan specified a "keywords" row built from
`jdVersusMarket().specific` — words a posting repeats that the role's vocabulary
does not carry. Pointed at five real live postings on 2026-09-15
(`npx tsx --env-file=.env.local scripts/verify-gap-table.ts`) it printed,
verbatim:

```
Their own words   ·Xylem  ·Availity  ·Guidehouse  ·WEKA  ·Weka  ·Precisely
                  ·What  ·All  ·None  ·Required  ·ideas.  ·channels.  ·e.g.
```

Six employer names, the same employer twice in two casings, and prose
fragments. **That is Stage U's "How much have you worked with Poland?" arriving
a second time through a different door**, and it would have shipped had the task
not gated on live postings rather than on a green suite.

It could not be filtered into shape, and the reason is structural rather than
effortful: what makes the skills row trustworthy is **dispersion measured across
employers**, and a single advert has no dispersion to measure. That is this
product's own stated position — *"a single ad is a sample of one"*. The row was
replaced with **Qualification**, read by `extractAll()` with a `sourceQuote`,
silent (`not stated`) on most engineering postings. Four rows, all retrieved,
all quotable.

⚠️ **THE VOCABULARY ITSELF CARRIES PROSE, AND TEN TERMS ARE NOW FILTERED.**
Putting `skills.json` on screen for the first time exposed junk that the build's
structural filters let through. Measured over **391 live descriptions**:

| Term | Postings | What it actually is |
|---|---|---|
| `science` | 98/391 | the back half of "Computer Science" |
| `familiarity` | 96 | "Familiarity with Kubernetes" |
| `computer` | 96 | the front half of the same |
| `certified` | 25 | "Certified Scrum Master" |
| `states` | 15 | "United States" |
| `san` | 14 | **"San Francisco" — a place fragment** |
| `statement` · `generative` · `workplaces` · `sr` | 11–14 each | prose |

They clear both structural filters honestly: a hundred employers write
"Familiarity with…" and capitalise it at the head of a bullet.

⚠️ **`capRatio` IS NOT THE DISCRIMINATOR, AND THAT WAS CHECKED RATHER THAN
ASSUMED.** Every junk term above sits at 0.62–0.70 and a 0.8 threshold looks
clean until you read what it removes: **`.NET` (0.62)**, `pandas`, `agile`,
`shell`, `server` — all real — while keeping `street`, `hat`, `zoom`, `eastern`.
The distribution does not separate prose from skills. A closed, measured list is
the honest tool, so the ten words went into `NOT_SKILLS` in
`scripts/build-skill-vocabulary.ts` **and** into a read-time filter in
`src/lib/taxonomy/skills.ts`. **The runtime filter exists only because
`skills.json` has not been rebuilt since** — a rebuild scans 13,919 descriptions
and moves every count in these docs. Delete the runtime set the day it is
rebuilt, not before.

**Two smaller defects, both found by the gate rather than by review:**

1. **Term matching used a word boundary that excluded `.`, `+` and `#`**, which
   looked more careful and was wrong — the vocabulary stores ".NET" under the
   key `net`, so a résumé saying ".NET" never matched. Letters and digits alone
   still block every case that matters (`ai` in `email`, `cd` in `cdn`, `java`
   in `javascript`). A test pins both directions.
2. **The same term printed in two rows with opposite advice.**
   `jdVersusMarket()` subtracts only the six generic terms in
   `role-keywords.json`; it has never seen the 1,134-term skill vocabulary, so
   Kubernetes appeared as both "fix this first" and "do not reshape your résumé
   around it". Moot once the row was cut, and the dedupe stays as the record.

**Measured after, 2026-09-15:** 5 live postings, **43 terms shown, 0 places and
0 company names** (checked against `CITIES` + `INDIAN_STATES` +
`registry/boards.json`, rebuilt independently in the verify script). A
**positive control** proves the ✓ path fires — 12/12 terms found when the résumé
is built from the posting's own terms — because "0 of your terms are present" is
exactly what a broken matcher prints and is indistinguishable from an honest
answer about a badly-matched candidate. That is the trap migration 0026's RLS
check fell into.

**`extractSkillPhrases()` moved** from `lib/interview-prep.ts` to
`lib/taxonomy/skills.ts`, unchanged, with a re-export so
`/api/extension/score` is untouched. A résumé surface importing from an
interview-question generator is the wrong dependency direction; one file now
opens `skills.json`.

**Gates:** `npm test` 613 (was 595, +18) · `npm run lint` 0 errors ·
`npm run typecheck` clean · `npm run verify:rls` all checks ·
**`npm run bench` DELTA none**, 26 documents. Walked in a browser end to end,
both the posting path and the no-posting empty state. **No migration.**

### Stage Y — the five-step flow, and three numbers that were nearly wrong (2026-09-15)

TASK-084. `ats-flow.tsx`'s `Step` goes from `input | report | preview` to
`input → score → gap → choose → apply → preview`, with `ui/stepper.tsx`
rendered once across the five. The founder's objection to the old UI was that
nothing told you where you were; there are now five named stages and a bar.

⚠️ **STAGE 1'S SENTENCE IS NOT THE ONE THE PLAN SPECIFIED, AND THE PLAN WAS
WRONG AGAIN.** It asked for *"68 — a parser reads 91% of your document, and what
it reads matches this role on 24 of 31 checks."* Measured before building:

| Category | Checks | About the role? |
|---|---|---|
| ATS essentials · Sections · Content · Red flags · Bias · Seniority | **37** | No — the document |
| **Job tailoring** | **3** | Yes |

Describing all 40 as role-matching would put a number on screen meaning
something other than what it says. The headline now states the two halves the
score is genuinely made of — `PARSE_WEIGHT = 0.35` of parse coverage, plus the
category assessment — and counts the role's three **separately and in smaller
type**: *"Only 3 of those checks are about Backend Engineer specifically, and
you pass 1."* That is the third plan claim in two tasks that measurement
corrected (see Stage X, and Stage W's two).

⚠️ **TWO OF MY OWN COPY CLAIMS WERE FALSE AND WERE CAUGHT BY OPENING THE PAGE,
NOT BY A TEST.** Both would have passed every gate:

1. Stage 3's skills card promised *"your score updates immediately"*. Clicked in
   a browser, the score stayed at **96** — correctly, because the checks count
   whether a term is PRESENT and the same eight words are present in either
   order. The card now says so outright: *"This will not change your score…
   it changes what a recruiter skimming the first line sees."*
2. The gap table's headline read *"Your résumé answers everything this posting
   states"* while **two of its four rows said "not stated"**. Softened to
   *"Nothing this posting clearly states goes unanswered"* whenever a row is
   unknown.

⚠️ **AND ONE THING THAT LOOKED LIKE A BUG AND WAS THE SYSTEM WORKING.** Against
an advert saying *"6+ years building distributed systems"* the Experience row
reported **does not say**. `extractAll()` will not read a bar from that phrasing
without the words "of experience" — verified by running both variants — and
refusing a low-confidence extraction is `src/gates/`'s documented policy, since
"a wrong refusal is worse than a wrong match". The table was right to stay
silent. The headline above it was wrong to sound certain, which is what got
fixed.

**The stepper's marks are 15/35/50/80/100, not even fifths.** `ui/stepper.tsx`
states in its own header that the percentages belong to the caller because a bar
jumping in even quarters "lies about how much is left". Reading a score and a
gap table is quick; stage 4's finding loop is where the time actually goes, so
the bar moves least across it.

**Stage 3 exists to make cost visible before it is spent.** Stages 1–4 are free;
stage 5 is the only model call on this path at ~1,360 tokens against a shared
8,000/minute ceiling. `reorderSkills()` is now exported and offered there under
a **no model** badge — a stable sort that adds nothing and removes nothing, so
it cannot fabricate and needs no grounding guard. Nothing is pre-ticked:
defaulting every section on would make a full-document rewrite the option chosen
by nobody. Verified in a browser — `Python, Django, Postgres, SQL, AWS, Docker,
React, Git` became `Python · AWS · Docker · Django · Postgres · SQL · React ·
Git`, eight in and eight out.

**Gates:** `npm test` 621 (was 613, +8) · `npm run lint` 0 errors ·
`npm run typecheck` clean · `npm run verify:rls` all checks ·
**`npm run bench` DELTA none**, 26 documents. All five stages walked in a
browser, with and without a target role. **No migration.**

### Stage Z — the scoped rewrite, and a saving that mostly is not there (2026-09-15)

TASK-085, the last of Phase 9. `rewriteResume()` takes a `scope` so stage 3's
selection decides what the model is asked to return, and `optimise-resume.ts`
passes it through.

⚠️ **THE PLAN'S PREMISE — "cost tracks what was selected" — IS MUCH WEAKER THAN
IT SOUNDS, AND THE MEASUREMENT IS THE POINT OF THIS ENTRY.** Measured
2026-09-15 on a short CV with a pasted posting:

| Scope | Model call | Prompt | Output | Total | Saving |
|---|---|---|---|---|---|
| summary + experience (old) | yes | 895 | 102 | 997 | — |
| experience only | yes | 895 | 85 | 980 | **2%** |
| summary only | yes | 895 | 18 | 913 | **8%** |
| **skills only** | **NO** | 0 | 0 | **0** | **100%** |

Without a posting the prompt drops to ~539 and summary-only reaches 13%. **The
prompt dominates and cannot shrink**: a summary summarises the experience, so
rewriting it without sight of the bullets produces a paragraph grounded in
nothing, which `rewriteFailure()` then rejects — spending the tokens for no
output. What the scope narrows is what the model must RETURN, and the schema is
narrowed with it so a provider is not obliged to generate bullets we discard.

**So the real win is the skills-only path making no call at all**, which is what
makes stage 3's printed promise ("no model") true rather than decorative. A test
asserts zero calls; `provider` comes back `null` and the result screen says *"No
model ran"* instead of naming a provider that never answered.

⚠️ **TWO DEFECTS THIS TASK EXPOSED RATHER THAN INTRODUCED, BOTH FOUND IN A
BROWSER:**

1. **A KEPT summary rewrite was recorded nowhere.** `changes.push` ran only when
   the guard REJECTED a summary, so an accepted one changed the document and
   appeared in no change list. Invisible while every rewrite also rewrote
   bullets — the list was never empty. Glaring the moment "summary only" became
   selectable: the candidate pressed the button, it worked, and the result
   screen showed them nothing.
2. **The rate limit charged the free path.** `checkRateLimit` was the first
   statement in the action, before the input was parsed — correct when every
   call was a whole-document rewrite. Three skills reorders returned *"try again
   in 7 minutes"* for work that reaches no provider. The allowance exists to
   protect an 8,000 tokens/minute ceiling; something consuming none of it has
   nothing to protect against. It is now charged only when a model will run,
   verified by reordering skills successfully while still inside a live lockout.

⚠️ **AND A THIRD, FOUND ONLY BY READING THE OUTPUT ON SCREEN.** Prompt rule 8
asks for "two or three sentences". Given a thin original — *"Backend engineer,
three years, payments."* — the model padded to two by saying the same thing
twice, verbatim:

> *"Backend engineer with five years of experience in payments. Backend
> engineer with five years of experience in payments."*

`rewriteFailure()` never looked for this, because it checks for **invented**
content and this is **repeated** content. A résumé carrying a duplicated line is
worse than the one it replaced. `dropRepeatedSentences()` now removes an exact
repeat before the guard runs — it only ever removes, so it cannot fabricate, and
the first occurrence wins so the model's chosen order survives. The
summary-only path made this visible; nothing says it could not already happen on
a whole-document rewrite.

**Not built, and said so rather than shipped worse:** the conversational refine
box. It is a chat loop against a 1,360-token budget with no upper bound on
turns, and it is the one mechanic in the competitor's screenshots with no
grounded equivalent here. Revisit when there is a paid tier.

**Gates:** `npm test` 633 (was 621, +12) · `npm run lint` 0 errors ·
`npm run typecheck` clean · `npm run verify:rls` all checks ·
**`npm run bench` DELTA none**, 26 documents. Walked in a browser: skills-only
(no model, no rate-limit charge), summary-only (model ran, every bullet
untouched). **No migration.**

### Stage AA — a parity prompt, measured against the repo; and "posted" was the last edit (2026-09-23)

**The prompt.** The founder brought a generic "Jobright.ai parity" master prompt
(Next.js init, zinc monochrome, pgvector matching, auto-apply extension, n8n
email sync, company insights, applicant counts). Checked against the repo rather
than acknowledged: stack, résumé parsing, split score, tailoring with the
fabrication guard, a form-filling extension and the tracker board all exist.
~~**Founder chose 2026-09-23: close the real gaps in Saaf, no rebuild.**~~ **Reversed the same evening — Stage AD.** Declined,
and why — so a later session handed the same prompt does not re-derive this:

| Declined | Why |
|---|---|
| Auto-apply / simulated submit | Locked decision: Saaf never applies on anyone's behalf. The extension fills; the candidate submits |
| Live applicant counts | Only LinkedIn/Naukri expose them, both banned (ToS). ATS APIs do not. `role-card.tsx` already dropped "Early applicant" for this reason |
| Zinc monochrome, flat, Geist | That is the system retired 2026-09-05 (`DESIGN.md` § What was retired). Dark rebrand is separately parked |
| n8n parsing users' Gmail to move tracker cards | Gmail read access is a Google *restricted* scope — needs a paid third-party security assessment (cost unverified) — plus a server for n8n. Breaks ₹0, and holds every user's inbox |
| pgvector similarity as the match score | Scoring is deterministic so every number states its reason; a cosine similarity cannot. Admissible later only as one component, and only if `bench:match` improves |
| Claude API for all model work | Per-call cost; Groq (primary) and Gemini (fallback) run it at ₹0 today — `src/lib/parse/llm.ts` |

Accepted: posted date on cards (TASK-086), a conversational copilot (TASK-088),
a company panel pending a free data source (TASK-089).

**The finding — Greenhouse's "posted" date was its last edit.** The adapter read
`updated_at`. Live probe of Okta's board: all 328 postings shared one `updated_at`
two days old, while `first_published` ranged back to February. The list API
returns `first_published` on every posting, with and without `?content=true`.
Dry run of `npm run backfill:posted-dates`, 2026-09-23: **548 Greenhouse boards,
4,472 roles still listed, 3,802 (85%) stored a date that is not the posting date,
median 46.9 days fresher than the truth.** Nothing displayed `posted_at` before
today, so this was latent — it became a false claim the moment a card showed it.

**Date coverage by provider, measured live 2026-09-23** (all 1,398 boards,
25,249 roles):

| Provider | Roles | With a date |
|---|---|---|
| Workday | 10,378 (41% of the index) | **0%** — listing says "Posted 30+ Days Ago"; detail call has `startDate` (live-probed on Novartis) and now keeps it |
| SmartRecruiters | 5,796 | 100% |
| Greenhouse | 5,718 | 100% — but the wrong field until this stage. 4,472 of them are still on their boards; the rest await ingest's prune |
| Workable / Ashby / Recruitee / Lever | 1,272 / 1,156 / 518 / 411 | 100% |

~~A first pass of this probe reported Workday at 8,960 roles~~ — its boards
query was unpaged and silently stopped at 1,000 of 1,398 boards, leaving 5,645
roles unattributed. Same failure class as `score-candidate.ts`'s 500-row cap:
a Supabase read with no `.range()` loop returns the first 1,000 and no error.

**Rule carried forward:** before displaying any stored field as a fact, check
what the provider meant by it. A field existing is not the field meaning what
its column name says — the same lesson as Stage T's salary probe (a key present
on every posting, empty).

**Gates:** `npm test` 642 · `npm run lint` 0 errors, 26 warnings (unchanged from
before the change) · `npm run typecheck` clean · `npm run verify:rls` verified ·
`npm run bench` DELTA none · `npm run bench:match` 0 components at 90%+.
Walked in a browser on localhost against the live database: 32 of 40 shortlist
cards show a date chip; an undated (Workday) card shows none; 375px width, no
horizontal scroll; no console errors. **Not deployed. No migration.**

### Stage AB — the QA pass: what a customer hits (2026-09-23)

Founder asked for intensive end-to-end testing and a revision plan. Full
evidence in **`docs/QA-AUDIT.md`**; fixes are ROADMAP Phase 11 (TASK-091 →
TASK-104). The numbers worth carrying, all measured 2026-09-23:

| Measured | Value |
|---|---|
| Upload of 4.7 MB to production ATS checker | **413 from Vercel → whole page crashes.** UI and zod allow 5 MB; Vercel's body cap is 4.5 MB |
| `/today` main query (500 rows + `role_requirements(*)`) | **9,954 ms cold / 492 ms warm, 1,045 KB JSON** |
| `/today` server time, local prod build, live DB | 19.2 s first, 2.1 s repeat; 691 KB HTML; "Show all 338" **6.3 MB** |
| Other signed-in pages | 0.33–0.75 s, 26–47 KB |
| Lighthouse mobile, production | `/` 84 (LCP 4.1 s) · `/tools/ats-checker` 86 · `/signin` 87 · `/audit` 97 · `/tools/paste-jd` 98 |
| Public TTFB, production | 0.17–0.50 s on every route |
| axe-core WCAG 2.1 AA, signed-in | `/today` 49 contrast failures; accent button **4.49:1**; tracker scroller not keyboard-reachable; 4 pages clean |
| Users in `profiles` | 9 |

**The finding that matters most for launch is not a bug in any one screen:**
nothing under `src/app` defines `error.tsx`, `global-error.tsx`,
`not-found.tsx` or `loading.tsx`. Every slow path and every failure falls
through to Next's unbranded defaults — which is how a 413 became a blank page
and a 10-second query became a frozen one.

**Two recurrences of defects already fixed elsewhere** — worth noticing as a
pattern, not only as two bugs: the ATS checker contradicts itself between step
1 and step 4 (the `keepStillTrue` family, fixed for `/tools/paste-jd` only), and
a displayed count is a cap (500 on `/today`; 150-of-199 on the checker), the
same class as Stage T's "field present ≠ field meaning".

**Doc drift found, not fixed here:** CLAUDE.md states 11 server actions and 24
legacy query sites; measured 21 and **25** — the "do not add a 25th" line has
been crossed. The codebase is right; CLAUDE.md needs re-measuring.

**Testing hygiene:** the founder's account was used for signed-in flows. Two
tracker rows and one `refusal_reports` row created by tests were removed; the
onboarding draft was cleared from sessionStorage; the confirm step was never
submitted. A fixture account (`db:seed-test-user`) is the right tool for the
untested new-user path next time.

### Stage AC — posted dates live; the three code P0s fixed (2026-09-23)

**Deployed** `dpl_BifT74tcXs6WVeYfSMSjKnApokUg` (commit `71a5922`), then
`backfill:posted-dates --write`: 3,792 Greenhouse dates corrected, 0 failed, a
re-run finds 0. Posted dates are live. Verified by the backfill's own re-run
and route smoke tests; the signed-in card itself cannot be opened on
production (Google-only sign-in, dev door 404s) and was verified on localhost
against the same database.

**TASK-091, 092, 093 built and walked in a browser — NOT deployed, NOT
committed.** Evidence per task is in ROADMAP Phase 11. What is worth carrying:

- **The upload limit is the host's, not ours.** 4 MB, with a test that fails if
  `MAX_RESUME_BYTES` + envelope ever exceeds Vercel's 4.5 MB body cap or if
  `bodySizeLimit` drifts above it. `next.config.ts` said 8mb to fix an earlier
  stuck upload, which only made local dev accept what production refuses.
- **`/today`'s weight was never the data.** Per 40 cards: 68 KB of class names,
  71 KB of inline SVG, 74 KB of *Insights* of which 8 KB is text — then all of
  it again in the RSC payload. Compressed, the default page is 43 KB. The slow
  part was the read: 500 rows × (full breakdown + role + every requirement).
  Now the list is read thin (74 KB, no join) and only rendered cards whole.
  ~~Load Insights on open~~ was in the plan and is dropped: DESIGN.md makes the
  breakdown "never behind a request", and that rule held.
- **Measured on a local production build, live DB:** first render 19.2 → 2.9 s,
  repeat 2.1 → 1.0 s, New tab 4.9 → 1.0 s, Newest 4.5 → 0.9 s. **The cold-cache
  case could not be forced and is unverified** — the claim is only that it now
  reads 14× less and joins 460 fewer roles.
- **Parity, not assumed:** old vs new reads compared on all 500 rows and 1,359
  requirement lines, 0 differences. `bench:match` unchanged.
- `/today` had no tests; `src/lib/__tests__/shortlist.test.ts` (12) now pins its
  arithmetic, written before the reads moved. Page query sites 25 → **22**.

**TASK-094 — the cap, measured before it was disclosed.** 6 of 9 profiles hold
exactly 500 scored roles; the founder's search matches 5,368 with adjacent
roles on (42 strict). So the cap is not an edge case — it is most users'
shortlist, and "Showing 500 roles matched" was describing the top 9% of the
founder's matches as all of them. The page now names both numbers and the
remedy that moves them. The count reuses `roles_for_candidates()` through the
scorer's own `candidateSearch()`; the lesson worth keeping is the bug in its
first version — an RPC resolved by argument NAMES, a wider object spread into
it, and a HEAD request that turned "no such function" into a silent null. A
type checker cannot see it; opening the page did.

**TASK-095 — the limiter had been pooling every feature's allowance.** All
eight rate-limited entry points keyed on one hashed IP in one Map; the sizes
(30 checks, 3 rewrites, 6 counts…) were each reasoned per feature, but the
store never separated them, so a normal checker session spent the rewrite's
allowance before the rewrite. Nobody had hit it because nobody but the founder
has used the product. The fix is structural — `scope` is required by the type,
which is also how the eighth caller was found. New signed-in limits key on the
user id: carrier-grade NAT and office networks put many Indian candidates on
one address, where an IP key makes strangers exhaust each other. Résumé
parsing now requires a session (CLAUDE.md's "gap to close first") and degrades
to the deterministic reader past its limit rather than refusing the upload.

**TASK-096 — five places one fact had two names.** Worth recording as a class,
not five bugs: every one was a number or a label true in its own function and
contradicted by a neighbour computed elsewhere — two readings both called "a
parser", a live count capped at 150 beside a stored snapshot of 199, a `>= 75`
written six times and named "strong" twice while cards call 60–74 "Strong
match", an enum printed raw, and gating-era refusal labels on a public page.
The fixes each give the fact ONE source (`coverageNote`, `IndexMatchCount.capped`,
`HIGH_PRECISION_MIN`, `requirementLabel`) rather than rewording one side. The
roadmap's own plan got (b) wrong — "150 most recent" — and reading the query
before writing the copy is what caught it.

**TASK-097 → TASK-106, same day.** Built, walked in a browser (or measured,
where there is no screen), and committed one by one; none deployed. The ones
worth carrying:

- **TASK-106, P0 security — email sign-in opened any existing account.** Instant
  sign-in (2026-09-03, chosen to hold ₹0 without a sending domain) minted a
  session for any typed address; its commit weighed that only as a digest risk.
  Reproduced with a throwaway user (new → `signup`; again → `magiclink`, same
  id). Now an email may start an account, never open one. **Live until deployed.**
- **TASK-105 — the rewrite's intermittent failure was the model running out of
  room.** gpt-oss's reasoning shares the reply budget; ~60% of Groq attempts on a
  whole résumé ended `400 json_validate_failed`. `max_completion_tokens: 8192`:
  8/8. `reasoning_effort: 'low'` also fixed reliability but doubled the share of
  lines the fabrication guard had to revert — measured, and rejected for that.
  Lesson kept: every model failure path returned null silently for weeks; the
  first thing that made this findable was a log line.
- **TASK-104 — the landing page's weight is tools, not the page.** ~168 KB of
  ~328 KB compressed is PostHog + Sentry; LCP does not change without them.
- **TASK-101 — every remaining contrast failure is the accent green**, and the
  two uses pull opposite ways (TASK-101b, founder).
- **TASK-097 — suggest only a role the index holds postings for** — the
  shortlist's own question, not the taxonomy's.

**Deployed 2026-09-23, `dpl_CmXXH16qoaxUiWyVvtBthbWB2soS` (commit `466c419`):**
TASK-091 → TASK-106 are live. TASK-106's refusal and TASK-091's size message
were verified on production itself; the rest on localhost against the same
database. The account-takeover window was 2026-09-03 → 2026-09-23.

**Environment:** the shell's default `node` was **v18.20.8** today (it was 24 on
2026-09-07); Next refuses to run on it. Every check above ran on the pinned
v22.23.2 via a PATH prefix.

### Deployed 2026-09-16 — the whole Résumé Studio, and a runbook that nearly shipped a 404

**https://saaf-ten.vercel.app**, `dpl_ARvB3JR54u71LNmvLYkNpvUCnbDN`, region
`bom1`. Migration `0027` applied by the founder 2026-09-15 and verified four
ways — read, write, a positive control on each — before anything was deployed.
Phase 9 (5/5) is live: the five-stage flow, the gap table, the section picker
and the scoped rewrite.

⚠️ **THE RUNBOOK'S RSYNC EXCLUDES WERE UNANCHORED, AND THAT IS A REAL DEFECT
CAUGHT BY ITS OWN CHECKS.** rsync matches an unanchored pattern at every depth,
so `--exclude 'extension'` and `--exclude 'bench'` — written to skip the
top-level browser-extension folder and the résumé corpus — also removed:

```
src/app/api/extension/score/route.ts   ← the extension scoring API
src/app/dev/bench/page.tsx
```

**A missing route deploys as a 404, not as an error.** The build would have
succeeded, the deploy would have reported Ready, and the endpoint would simply
not have existed. Checks 2 and 3 in the runbook — "an exclude ate a route" and
"src/ differs from the repo" — are the only reason this was seen, and they were
added for exactly this class of failure. Every directory exclude is now anchored
with a leading slash; `.git`, `node_modules`, `.next` and `.env*` stay
unanchored deliberately, because a nested one should also go.

⚠️ **THE PROFILE SAVE IS VERIFIED BY PROXY, NOT ON PRODUCTION.**
`/api/dev-signin` correctly 404s in production and email sign-in still needs the
domain (TASK-075), so `/profile` cannot be reached signed in. The save was
verified end to end on localhost against the same live Supabase database — five
columns written, read back, confirmed by query — and production runs the same
code against the same schema. That is a sound inference and it is not a
live test; the distinction is recorded rather than blurred.

### Deployed 2026-09-14 — Stage R and Stage S, same day

**https://saaf-ten.vercel.app**, deployment `dpl_5Ky6uK4tafD6gb9ujfdzvXusf29Z`.
Migration `0025` applied by the founder; `npm run reclassify:roles -- --write`
moved 2,653 roles out of `other`.

**Written and shipped the same day.** Every commit since the 2026-09-09 deploy
is dated 2026-09-14 (`git log --date=short f98f6b4..HEAD`) — this section first
claimed a five-day shipping lag, which was wrong and is corrected here rather
than quietly deleted. Five days separated the two *deploys*; no fix waited five
days.

⚠️ **The hazard it mistook is still real.** For most of 2026-09-14 the repository
held two scorer fixes the live site did not, and `docs/HANDOFF.md` described that
state as "on a branch" rather than "not deployed". Committing is not shipping.
The distance between them is measured against the deploy record, not against the
commit log, and both are cheap to check.

Verified in a real browser against production, not by curl:

| Check | Result |
|---|---|
| Landing hero | "Precision Career Copilot for India. Zero Spam." — no "100% Tailored" |
| Wordmark | "Saaf" on the landing header, footer, sign-in and every shell |
| `/copilot` | 200, redirects to `/signin` unauthenticated; no "Cookie" in the markup |
| `/api/audit/today` | 23,184 roles · 1,388 boards · `stale: false` |
| Coverage panel | nine functions, Sales third at 1,390 — verified signed-in against the same live database |
| `bench/corpus/real/*.pdf` | **404** — see below |

⚠️ **THE DEPLOY PROCEDURE WAS STAGING NINE REAL RÉSUMÉS, AND THIS WAS THE FIRST
DEPLOY THAT COULD HAVE SHIPPED THEM.** `docs/RUNBOOK.md`'s rsync names its
excludes explicitly because rsync does not read `.gitignore`, and the list was
missing `bench`. `.vercelignore` would not have caught it either, for the reason
its own header states about `.env`: the file existing means `.gitignore` stops
applying entirely, so "the corpus is gitignored" is precisely the reasoning that
ships it. Nothing leaked — the corpus arrived in `40cc807` on 2026-09-12 and the
previous deploy was 2026-09-09. Fixed in both places, and the RUNBOOK now carries
a `find` that prints nothing when the staged copy is clean. **A gitignored file
is not a file that stays out of a deployment.**

### Deployed 2026-09-09 — parity, and past it

**https://saaf-ten.vercel.app**, deployment `saaf-1kx67gl1e`. Verified in a real
browser against production, not by curl:

| Check | Result |
|---|---|
| Two-pane report, 7 categories | ATS essentials 7/8 · Sections 3/3 · Content 14/15 · Tailoring 2/3 · Red flags 2/3 · Seniority · Bias |
| Market column | `design 88% · 175 ads`, `cloud 67% · 134 ads`, measured across 199 postings |
| Index re-score | **85 live jobs at 50%+ of 150 Backend Engineer postings** |
| Landing page | two doors — Find your next job · ATS score checker |
| Saved résumés | migration 0023 applied; save → list → delete walked end to end |

⚠️ **`GEMINI_API_KEY` WAS ADDED TO VERCEL PRODUCTION AS PART OF THIS DEPLOY, and
without it the deploy would have shipped a known-broken state.** Production had
only `GROQ_API_KEY`, whose free tier is 8,000 tokens per MINUTE shared across
every environment on the key — roughly three rewrites a minute for the entire
site, after which the rewrite fails 60% of the time. The failover chain existed
in code and had one link. It now has two.

### Deployed 2026-09-07 — the scale-up is live

**https://saaf-ten.vercel.app** (also aliased `saaf-akshay-keerthi.vercel.app`),
region `bom1`, deployment `dpl_GMH6w7y1MvYs4grZHWgHeaHnptyQ`.

Verified against the live site, not the build log:

| Check | Result |
|---|---|
| `/audit` | **21,806 roles · 1,396 company boards** — was 742 · 31 |
| `/today`, `/applications`, `/profile`, `/resume`, `/copilot` signed out | all 307 → `/signin` |
| `/api/dev-signin` | 404 |
| `/start/gate` | gone |
| `/api/cron/ingest` unauthenticated | 401 |
| Cron jobs registered | 4 — ingest 21:00, recompute 23:00, audit 01:00, digest 03:00 UTC |
| Security headers | all four present |

Migrations `0020` (relevance-ranking RPC) and `0021` (last_seen_at indexes) were
applied by hand before the deploy, so the shortlist is ranked by `ts_rank_cd`
rather than falling back to freshest-first.

⚠️ **The deploy procedure changed and the RUNBOOK now carries it.** A plain
`vercel deploy --prod` from the repo sat at `UNKNOWN` with a 0 ms build for
fifteen minutes — the documented symptom of Vercel refusing a commit author it
does not recognise. `--prebuilt` from a partial staging copy does not work
either: the traced bundle reaches back into `node_modules` and `.next` by path.
What works is rsyncing the sources without `.git` and letting Vercel build.

### Stage AD — the workspace parity pass: two parked decisions reversed, the legal limits held (2026-09-23)

**The direction.** The founder brought a second, larger "full Jobright.ai
replication" brief the same evening Stage AA had declined a rebuild, and — asked
to choose between closing gaps, a dark rebrand, or reversing locked decisions —
answered "continue to execute my direction". Built on branch `jobright-parity`
(TASK-107 → TASK-116, ROADMAP Phase 12). ~~**Not merged, not deployed.**~~
**Merged and deployed 2026-09-24, `dpl_RdV14SSjhUtJTeAvZyewSTjDxeHK`** (TASK-117;
migration 0028 was already applied when checked, RLS re-verified). Signed-out
behaviour verified on production; signed-in screens verified on localhost only.

**Reversed by founder direction, 2026-09-23** (struck, not deleted, where they stood):

| Was | Now |
|---|---|
| Stage AA: "close the real gaps in Saaf, no rebuild" | Rebuild of the signed-in workspace to the Jobright layout |
| Dark rebrand parked (memory `saaf-dark-rebrand-parked`, DESIGN.md light system is law) | Zinc-950/900/800 + indigo→violet switched on for the whole app — done the way the parking note required: tokens in both palettes, one class on `<html>`, no per-screen colours |
| The co-pilot parked until matching is trusted (2026-09-06) | Cover letters, outreach and mock-interview scoring built; every draft grounded, every tool degrades to a template |

**Held, and what was built instead** — so a later session handed the same brief
does not re-derive this:

| The brief asked for | Built instead | Why |
|---|---|---|
| LinkedIn Import URL | Upload of the PDF LinkedIn itself exports ("More → Save to PDF") | Fetching a profile URL is scraping; LinkedIn ToS, *hiQ v. LinkedIn* |
| Cold LinkedIn InMail to named people | Contact TYPES + a link to LinkedIn's own people search, opened by the candidate; drafts they copy | We hold no people data and will not scrape it |
| Quick Apply / Easy Apply | Opens the employer's form and files the role as Applying; "Easy Apply" = one-page, no-account ATS hosts | Never applies on the candidate's behalf (permanent) |
| Salary > $X pill; salary on cards | No pill, no chip; pay floor collected for the tracker only | 2.2% of postings state pay, nothing extracts it (Stage T) |
| Glassdoor rating, funding stage | Company snapshot from our own index (open roles in India, cities, ATS) + culture tags quoted from the posting | No free licensed source |
| Profile Health Score | A visible weighted checklist of 11 fields summing to 100 | A number from nothing visible is what /copilot refuses; this one shows every point |
| Ring green > 85% | Green from 75 (`HIGH_PRECISION_MIN`) | At 85, an 81 drew amber under "High-precision match" — two verdicts on one card |
| Exact Jobright UI | Jobright's information architecture, Saaf's name and tokens | Copying another company's trade dress is a brand and legal risk |

**Found and fixed while building — each worth more than the feature line:**

1. **The tailoring studio rewrote a résumé's facts to match the profile.** With
   profile facts (2 years) the model turned a saved résumé's "6 years in
   payments" into "2 years", and the guard passed it — 2 is not more than 2.
   Facts now come from the document (`extractFields(body)`), as
   `optimise-resume.ts` already did. Found by opening the page, not by a test.
2. **`groundingFailure()` cannot judge prose.** It exempts only the first word
   of what it is given, so a paragraph fails on every sentence-initial "That" or
   "Most", and on `[Hiring Manager]` tags. `groundText()` strips tags and checks
   per sentence; invented employers and figures still fail (tested). ~~⚠️ **The
   existing review drawer passes a three-sentence cover note to it whole** —
   `src/lib/tailor.ts` — and so probably drops good notes; not changed here.~~
   **Fixed 2026-09-24 (TASK-118):** the drawer's note now goes through
   `groundText()`, which moved into `tailor.ts` to avoid a circular import. The
   bug is proven by test (a note rejected on "That"), not by a live count — how
   many real notes it had dropped since the drawer shipped was never measured.
3. **The grounding filter does not catch invented ACTIVITIES.** Checked live: a
   Groq cover letter said "I have led full-cycle recruiting" — no figure, no
   employer, no tenure, no credential, so it passed. Same limit in the review
   drawer. The UI says every sentence was *checked*, not *verified*; the gap is
   real and open.
4. **Every new tracker write was going into `src/app/`** (8 new `supabase.from`
   sites; invariant 3 says do not add a 25th). Moved to
   `src/lib/services/{applications,workspace}.ts` before commit; the action file
   is back to its original 5.
5. **The onboarding panel's hard-coded light gradient** (`oklch(0.95 …)`) would
   have put the now-white heading on a pale ground under `.dark`. The token test
   only bans hex and palette classes, so it did not catch an inline `oklch()`.

**Measured on localhost against the live database, 2026-09-23** (founder account;
every test row added was removed — tracker 0, saved résumés 0, as found):
tests 772 pass (50 files; +23 new), lint 0 errors / 23 warnings (all
pre-existing), typecheck clean, `npm run bench` 26 documents 0 misses, build
green. `bench:match` not run — the scorer is untouched. Feed pills
`easy+min80` → 2 of 500. Panel switch with no reload. Phone sheet Escape/focus
at 375 px. Drop Saved→Applied persisted; Applying refused pre-0028 with its
reason; bulk move → "On tracker · Interviewing" on the feed. **Not walked:** the
full sign-up flow (would re-confirm the founder's profile), Export Word/PDF
downloads, native pointer drag (the preview's synthetic drag does not fire
HTML5 DnD — verified with dispatched drag events).

### Stage AE — the extension parity pass: four autofill refusals reversed, the legal limits held (2026-09-25)

**The brief.** A second "replicate Jobright.ai" directive (web app + MV3 extension,
"hands-free", a `web-app/` + `extension/` directory map, Naukri/LinkedIn/Indeed
adapters, 1-click apply that logs to the Kanban). **Measured against the repo
first: ~80% already existed** — the whole web half went live in Stage AD. One
pushback listed what was built, what was held, and the three reversals needing a
yes. Founder answer: "Everything on parity with extension of jobright." Built on
branch `extension-parity`, ROADMAP Phase 13 (TASK-119 → TASK-126).

**Reversed by founder direction, 2026-09-25** (the refusals lived in
`extension/autofill.js` and `extension/README.md`; struck there too):

| Was | Now | What keeps it honest |
|---|---|---|
| Salary/CTC always refused ("we hold no figure we trust") | Filled from the candidate's own figure, typed in the extension | Stored in lakhs, written in the box's unit or not at all: a bare number box (lakhs or rupees?) and any non-INR box are refused. With no figure stored, still refused |
| Dropdowns never touched ("a wrong choice is invisible") | Picked when exactly one option matches | Every pick listed on the card; two matches → left, with the reason |
| Radios/tick-boxes never touched | Yes/no groups answered; preferred-location lists ticked | Only from the candidate's own stored yes/no — never inferred. "Are you based in Bengaluru?" is still refused |
| File inputs never touched | Résumé attached to a résumé/CV upload | Only with a stored file, only if the upload's `accept` allows its type; never a cover-letter upload |

**Held, and what was built instead:**

| The brief asked for | Built instead | Why |
|---|---|---|
| Naukri, LinkedIn, Indeed, Glassdoor, Foundit, Instahyre adapters | None; `detectAts()` returns null for them and the manifest never matches them | Their terms prohibit it and the ban lands on the candidate (extension README) |
| 1-click *apply* | 1-click *fill*; the role is filed as **Applying**, never Applied | Never applies on anyone's behalf (permanent). We cannot see whether they pressed Submit, so "Applied" would be a guess |
| `web-app/` + `extension/` directory restructure | Existing layout | CLAUDE.md invariant 1; moving a live app to rename folders gives users nothing |
| Demographic / EEO answers | Still refused | Not a legal requirement for the tool — a product line. One-line change if the founder overrules it |
| Real-time sync through `chrome.storage` from the web app | The signed-in app pushes on load/focus via `externally_connectable`; the card re-renders on storage change | The extension holds no session by design, so the app pushes and collects — the extension never writes to our database |

**Found while building — each worth more than the feature line:**

1. **"Track this in Saaf" never tracked anything.** The overlay linked to
   `/applications?add=…&url=…`; nothing in `src/` reads `add`. Every click since
   the extension shipped opened the tracker with nothing added. Replaced by the
   queue → bridge path (TASK-124).
2. **The overlay wrote a quote from the host page into `innerHTML` unescaped.**
   A posting containing markup would have rendered it inside our card on their
   page. All page/server strings are now escaped; checked in a browser with an
   `<img onerror>` planted in the quote (rendered as text).
3. **`el.value = x` is swallowed by React.** Proven with a negative-control test
   against a real controlled input. In a real content script the isolated world
   usually sidesteps React's value tracker, so this was probably working in
   Chrome by accident; the prototype setter makes it work by construction.
4. **The popup never stored `workAuth`**, though the filler had a field for it.
   Added.

**Measured 2026-09-25:** `npm test` **825 pass** (53 files; was 777 on 2026-09-24,
+48 net: new `autofill.dom.test.ts`, `extractor.test.ts`, `extension-sync.test.ts`; existing
autofill tests rewritten where the rules changed), lint 0
errors / 23 warnings (all pre-existing), typecheck clean, `npm run build` green.
`bench` and `bench:match` not run — neither the ATS checker nor the scorer was
touched. **Walked in a browser:** (a) a mock ATS page loading the real extension
scripts with a stubbed `chrome` — dark card, host's `!important` red rule did not
leak through the shadow root, Fill wrote 6 fields (first/last name, email, notice
dropdown, CTC in lakhs, work-auth radio) and left gender, "why us" and the
consent box with reasons, role queued as Applying, card switched to "On your Saaf
tracker · Applied" when a tracked list was written; (b) localhost `/interview-prep`
signed in as the founder — "Hear the question" and "Speak your answer" render;
(c) the bridge against the live database with a stand-in extension — one role
filed as Applying, acked, profile and 2 tracked stages pushed back; a second
drain filed nothing (dedupe); the test row was removed from the founder's
tracker (2 → 1, as found). **Not verified:** the real extension loaded in Chrome
(the preview browser cannot load unpacked extensions), real speech capture (no
microphone), any real ATS form, and anything on production.

### Deliberate residue — do not "tidy" these away

- ~~**`WithheldSection` and the report-refusal action are orphaned and kept.**~~
  **`WithheldSection` was deleted 2026-09-07.** The rewiring this note was
  holding it for had already happened: `ReportScore` sits on every role card and
  writes to `refusal_reports` through the same `report-refusal.ts` action, so
  nothing was orphaned. The component itself was the last file in the codebase
  reading legacy design tokens, and it had to go for the legacy block to go.
  **The action and the table stay** — that half of the note still stands.
- **`src/gates/evaluate.ts` and `src/gates/reasons.ts` still speak in refusals.**
  They are the demo path and the shared `experienceFloor()`, not live product
  behaviour.
- **`/api/audit/today` still publishes a `rolesWithheld` field** that
  `ingest/audit.ts` now hard-writes as `0`. Nothing in the app reads that route —
  `AuditStrip` and `/audit` query `audit_daily` directly. A permanently-zero
  "withheld" figure on a public endpoint is worth retiring; it is a known loose
  end, not a live claim.

---

## Index coverage by function — probed live 2026-09-08

*Measured against the live index (21,813 India roles) by scoring four probe
candidates through the real `scoreAgainstIndex` path. Re-measure rather than
trusting these numbers; they will move as the registry grows.*

| Candidate's preferred role | Roles matched | Scoring ≥50 |
|---|---|---|
| Software Engineer | **500** (hits `MAX_ROLES_PER_CANDIDATE`) | 156 |
| Business Analyst | 219 | 88 |
| Marketing Manager | 131 | 26 |
| **HR Business Partner** | **15** | **5** |

Index composition: engineering 39.2%, consulting 8.3%, finance 4.8%,
marketing 1.7%, hr 1.5%, **other 44.5%**.

⚠️ **THE MATCHING IS NOT WRONG — IT IS THIN, AND ONLY FOR SOME FUNCTIONS.**
Checked explicitly: there is no cross-function contamination. `scoreAgainstIndex`
ANDs every word of the preferred role against the posting title, so a marketing
candidate is never shown an engineering role. The failure mode is an EMPTY
SCREEN, not a wrong one — which is a worse first impression, because a wrong
match at least proves the machine works.

⚠️ **THE MISSING ROLES ARE NOT HIDING IN `other`.** Sampled 400 of the 9,697
`other` roles: only 7 look HR- or marketing-ish. 22% are classifiable by title
keyword alone, but they are overwhelmingly **sales** and **operations** —
two functions `ingest/classify.ts` does not have. HR and marketing coverage is
genuinely absent from company ATS boards, which skew engineering. Better
classification will not fix it; a different kind of source would.

**The implication for beta:** recruit engineers and consultants first. That is
a targeting decision, costs nothing today, and is the difference between a
first session that works and one that renders five rows.

---

## Verified technical facts — probed live 2026-09-02, do not re-derive

**ATS public APIs — zero auth, HTTP 200:**
```
boards-api.greenhouse.io/v1/boards/{token}/jobs   Razorpay 23 · Postman 66 · slice 26 · Groww 5
api.lever.co/v0/postings/{token}?mode=json        Meesho 46
api.ashbyhq.com/posting-api/job-board/{token}     Sarvam 62 · Atlan 5
```

**Supply funnel from those six boards — ATS boards are GLOBAL, this matters:**
```
233  roles total
137  (59%)  actually in India
 90  (39%)  India + not senior-titled
 66  (28%)  India + junior + non-engineering  ← addressable
```
Filtered-out roles sat in San Francisco, London, New York, Pristina, Skopje. Extrapolation: ~300 boards ≈ 3,000 addressable roles.

**Critical supply caveat:** rich in Product, GTM, Ops, Finance, Marketing, HR, Legal, Design, Data. Carries **almost no "Founder's Office" or "Chief of Staff"** postings — those live on LinkedIn, which is excluded. The customer wedge follows the legal supply, not the reverse.

**Free taxonomies:**
- ESCO API — `ec.europa.eu/esco/api/search` HTTP 200, no auth, open data, 24 languages
- O\*NET — CC BY 4.0 (commercial use OK with attribution), bulk DB downloadable, free-key web services

**Free stack, all verified as having real free tiers:** Vercel Hobby (non-commercial only) · Supabase or Neon · GitHub Actions for the daily cron (more generous than Vercel Cron's 2-job Hobby cap) · Groq ~1,000 req/day or Gemini ~1,500/day (neither carries non-commercial restrictions; **avoid Cohere free — non-commercial only**) · Resend 3,000 emails/mo · docx-js for document generation (MIT).

---

**Facts the build itself established — 2026-09-03, do not re-derive**

- **`slice` on Greenhouse is not the Indian fintech.** It is a company in North
  Macedonia (Pristina, Skopje, Debar). The 2026-09-02 probe counted its 27 roles
  as supply. Guessing company slugs finds the wrong employer; boards yielding no
  India roles are now auto-deactivated.
- **Razorpay's board 404s.** It returned 23 roles on 2026-09-02 and was gone a day
  later. Registry entries rot — that is what `boards.last_error` is for.
- **Workable puts `city`/`state`/`country` at the top level**, not under a
  `location` object. Reading the nested field silently dropped every Workable
  role — 162 from apna alone, with no error.
- **A description that states nothing reads as permission.** Gating only on stated
  requirements cleared 59 senior-titled roles for a two-year candidate. The title
  is stated text in the posting, so gating on it is retrieval, not inference.
- **Indian junior titles must be exempt.** "Assistant Manager" and "Senior
  Associate" are junior here; matching bare "Manager" or "Director" manufactures
  false refusals on exactly the jobs the candidate should see.
- **GitHub Actions is disabled on this account** (`HTTP 422`), though push and
  repository access work. That is why the scheduler is Vercel Cron.
- ~~**The full ingest takes ~34s at 20 boards**, about 1.7s per board.~~
  **Superseded by Stage B:** 7s at 20 boards under a concurrency-6 pool.

---

## Files

```
docs/                       tracked
  PROJECT-STATE.md          this file
  PRODUCT.md                the plain-English roll-up
  DESIGN.md                 design system, the source of truth
  PRD.md                    14 sections, the technical spec
  ROADMAP.md                53 tasks, 52 done
  HANDOFF.md                what still needs the founder
  VERIFICATION.md           the five success criteria, measured
  RUNBOOK.md                dashboard settings outside version control
productos/                  selectively tracked — work products yes, ProductOS material no
src/                        the app: gates, parser, screens, actions
ingest/                     six ATS adapters, the daily pipeline
registry/boards.json        31 boards — the moat, private
supabase/migrations/        three migrations, all applied
```

**Built and verified live:** requirement extraction against 211 real postings,
the résumé parser against real PDF and .docx, RLS proven to deny by seeding a row,
the daily ingest at 20 boards, the ranked shortlist rendering real score
breakdowns, magic-link sign-in end to end, the daily digest actually sending, and
a public index audit at `/audit`. **130 tests pass** under Node 22.23.2
(`.nvmrc`); the default `node` in this shell is 18, so `nvm use` first or a
version warning masquerades as a build failure.

**Deployment state, probed live 2026-09-05:** https://saaf-akshay-keerthi.vercel.app
(region `bom1`) serves **Stage A and Stage B. Stage C is committed but not
deployed** — `/privacy` in production still says the résumé is "never sent to a
third party", which the Stage C build replaces. Also verified live on 2026-09-03:
all four security headers, route protection returning 307 for an unauthenticated
`/today`, and both localhost and production callbacks allowlisted in Supabase.
The figures published on that date (935 indexed / 497 withheld) were the wrong
ones — Stage A fixed both at source; see above.

**Migrations:** `0001`–`0014` all applied. `0014` (`profiles.skills`,
`profiles.domain`) landed 2026-09-05 and is additive and nullable, so production
running Stage A/B against it is safe.


## The five personas, ranked

| # | Persona | Function | Now → next | Role |
|---|---|---|---|---|
| 1 | Rohan | Engineering | ₹7.5L Infosys → ₹12–17L product | Design for |
| 2 | Priya | Consulting | ₹9–12L Big-4 → ₹12–18L BizOps | Design for |
| 3 | Karthik | Marketing | ₹4–8L agency → ₹8–15L SaaS growth | Must not break |
| 4 | Meera | HR | ₹5.5L generalist → ₹9.5L HRBP | Must not break |
| 5 | Arjun | Finance/CA | ₹7–10L audit → ₹10–17L FP&A | Must not break |

Meera ranks 4th but is **strategically the most valuable beta user** — an ATS operator is the harshest critic of a matching claim and the best-networked evangelist if convinced.

---

## Next step

⚠️ **THIS SECTION IS STALE AND IS KEPT ONLY FOR THE REASONING IN ITEMS 2 AND 4.**
Item 1 shipped (Stage C deployed 2026-09-07, `GEMINI_API_KEY` set 2026-09-09) and
item 3's board count is 1,396, not 31. **The live next steps are: apply migration
`0024` (see `docs/HANDOFF.md`), collect 20–30 real résumés into
`bench/corpus/real/` so the scoring weights can be set from data rather than
judgement, and buy a domain.**

**1 · ~~Deploy Stage C, then set the key — in that order.~~ DONE.** It is the only
unshipped code. Deploying first puts the honest privacy copy live *before* the
behaviour it describes exists; setting `GEMINI_API_KEY` first would make the
production privacy page false for the length of the gap. The key is set nowhere
today, so the LLM parse is inert and the deploy is safe on its own.

**2 · Buy a domain.** Still the real blocker on having any user at all. Resend
only delivers to the founder's own address until a domain is verified, so **no
beta user can receive a sign-in link today.** A `.in` costs a few hundred rupees.
Everything else on this list is refinement; this one is binary.

**3 · Grow the registry — the hard stop at 28 boards is gone.** **31 as of
2026-09-05**, found by probing rather than guessing
(`npm run registry:discover`). New boards reach production with the next deploy:
`ingest/run.ts` reads `registry/boards.json` from the bundle and upserts it at
the top of every run, so a board added here is inert until the code ships. Stage B changed
the arithmetic: at 7s for 20 boards under a concurrency-6 pool, and with the run
declining to *start* a new board after 38s, outgrowing the budget now degrades
into rotation rather than a timeout. **The scheduler migration is therefore no
longer forced by the clock** — the remaining reason to move to a Supabase Edge
Function is that the service-role key sits in Vercel. Re-measure before treating
any board count as a ceiling. See HANDOFF D5.

**4 · The two deferred launches — and their proof asset is void.** `docs/LAUNCHES.md`
does not exist; nothing has shipped to a real person. Define step 5 (Mini-Launch,
win = one reply) and Design step 7 (relaunch, win = one "can I try it?") are both
open. Both were sequenced around **the refusal screenshot, which the pivot makes
unbuildable** — the product no longer refuses anything, so there is no refusal to
screenshot. Its natural successor already ships: the itemised score, an opaque
portal "TOP APPLICANT" badge against a 62 that breaks into its parts. `PRODUCT.md`
§ Proof still names the old asset and needs the substitution made deliberately.


## Open questions

0. **Resolved 2026-09-05 — "why Saaf rather than the category leader, now that both
   rank?"** `PRODUCT.md`'s own 2026-09-04 amendment posed this and left it
   open. `docs/COMPETITOR-ANALYSIS.local.md` (untracked) answers it: the mechanism converged at
   Stage A, but the registry, the shown-working score, the legal supply chain
   and ₹0 are all things the incumbent structurally cannot copy. The same document
   confirms the current roadmap (Phase 7) targets the co-pilot surface, not
   index-scale parity, and names the four locked decisions that would need
   reversing if that target ever changes.
1. **Still zero users, and zero first-party proof.** Every success criterion that
   needs people — withheld-section engagement, the eligibility rate — is marked
   *pending cohort* in `VERIFICATION.md`, not ticked. The instrumentation to
   answer them is live and verified.
2. **The refusal screenshot is not deferred any more — it is impossible.** The
   pivot removed refusals, so the asset `PRODUCT.md` § Proof names as the first
   earnable evidence cannot be built. The score-breakdown contrast replaces it
   and is already rendered; the portal half is still the missing half. The
   substitution needs making in `PRODUCT.md` rather than being left implicit.
3. **All five personas remain interview-unvalidated.** Ten interviews planned,
   zero done. The product now exists to show them, which makes the conversation
   easier than it was in the Define phase.
4. **Function-typed matching no longer exists in either direction.**
   `channel_budget`, `institute_tier` and `hr_track` survive as members of the
   `TypedRequirement` union and as labels on `/audit`, but **nothing extracts
   them and nothing scores them** — the six scored components are title,
   seniority, skills, location, work mode and credential. Onboarding no longer
   branches per function either: `start/gate` asks one unconditional credential
   question, so `profiles.channel_budget` / `institute_tier` / `hr_track`
   (migration 0008) are now written by nothing and read by nothing. Karthik,
   Priya and Meera are therefore matched on title, seniority and skills like
   everyone else. That is a defensible ranking product, but it is not the
   function-typed promise the personas were written against.
   **Decided 2026-09-05: state it rather than build it — for now.** The gap is no
   longer silent; `src/match/function-gap.ts` reads the candidate's own
   preferred-role text and `/today` names the requirement their function turns
   on and says we don't read it, attributed to our coverage. Building the reading
   (extraction + the three onboarding questions + score components) remains open
   and is the larger piece of work.
5. **The scheduler's expiry date moved, and only half the reason remains.**
   Stage B's concurrency pool and 38s start-cutoff mean the run degrades into
   board rotation rather than timing out, so the ~30-board cliff is gone. What
   remains is that the service-role key sits in Vercel, which earlier design
   notes ruled out — a real reason to move to a Supabase Edge Function, but a
   security-posture reason, not a deadline. See HANDOFF D5.
6. **Non-technical persona research is still the thinnest part.** Indian marketing
   communities were the weakest-mapped section in the Define phase and nothing has
   changed that.
