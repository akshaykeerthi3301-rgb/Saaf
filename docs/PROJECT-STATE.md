# Saaf — Project State

**Last updated:** 2026-09-07 · **Phase:** Post-MVP. Develop closed at 53/53 and deployed; nine stages have landed since — see **[The pivot](#the-pivot--stages-a-b-c-2026-09-04--09-05)**, which reverses a decision the table below still lists as locked. Define 4 of 5 and Design 6 of 7 — both remaining steps are launches, still deferred, and **nothing has yet been shown to a real person.**

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
| **Design system is monochrome, flat, square-cornered** | Anchored on live computed styles from `zerodha.tech`: zero shadows, one radius, `#F0F0F0` paper ground. The named anti-reference is `resumly.ai` (196 shadows, 8 radii, 4 gradients, 2 banned fonts). Error red is for system errors only — **never** for a gate outcome. |

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

⚠️ **The taxonomy is not a competitor's.** Jobright's categories are not
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
