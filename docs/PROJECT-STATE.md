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
| **The co-pilot — tailored résumés, cover letters, interview prep** *(parked 2026-09-06)* | On hold until the matching itself is trusted. The order is deliberate and worth keeping: a co-pilot that writes beautifully about a badly-chosen role makes the wrong application faster, which is the category failure this product exists to avoid. **Nothing to build or design here yet.** The provider is wired and fast enough for it (Groq, ~1.4s on a résumé), so this is a sequencing decision rather than a capability gap. Reconsider once scores are demonstrably right. ⚠️ The landing page's "Review & Approve" card is part of this and carries the same go-live-or-come-off condition. |

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
publishes one. What the founder wanted from it — an internship not reading as a
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

**1 · Deploy Stage C, then set the key — in that order.** It is the only
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
