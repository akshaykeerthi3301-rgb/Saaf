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

~~**It does not apply on anyone's behalf. That is permanent, not a phase.** The
candidate reviews and submits every application themselves. This is the line the
product is defined by: we make applying faster and better-aimed, never automatic.~~
**Reversed 2026-09-25 (Stage AI):** "Apply for me" submits, inside honesty and law
limits that stay locked.

**Frame:** portfolio artifact first, built like a real product. ~~₹0 forever, no
ads, no paid tier.~~ **Free today; a paid plan is allowed since 2026-10-07 (Stage
AK) — none is built.**

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
| **Employer access / B2B portal** *(**un-parked by founder direction 2026-10-07 — Stage AK**)* | ~~A later phase. **Do not build or design anything toward it** — no schema, no consent surface, no discoverability flag, no UI.~~ Building and designing toward it is now allowed. **The order is kept, because it is a security property:** the opt-in consent model first, because four of the five personas are employed and hiding their search, then the second RLS policy set, then identity, then UI (CLAUDE.md invariant 4). |
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
| ~~**Never applies on the candidate's behalf**~~ | ~~Permanent, not a phase. Saaf fills forms and drafts documents; the candidate reviews and submits. Auto-apply is the category's reputational failure mode and a large part of why recruiters stopped reading. Assisted application is in scope; automatic application never is.~~ **Reversed 2026-09-25 by founder direction** (PROJECT-STATE Stage AI): the founder asked to "break our permanent rules". "Apply for me" now submits, inside limits that are about honesty and law rather than taste and that stay locked: **never past a CAPTCHA, never a guessed or demographic answer, never "Applied" without the employer's confirmation, off until switched on, 25 a day.** The reputational risk named here is real and unchanged — it is now the founder's accepted risk. |
| **No volume promise** | Precision over quantity. A short honest list beats a padded one. |
| **Never turn users away** | No signup gating, even for poorly-served segments. Instead the **honest empty state** — *"650 indexed today · 47 matching your search · 3 a strong fit"* (a narrowing since the pivot; it read as a subtraction ending in "3 cleared your experience band" before). Thinness is attributed to registry coverage, never to the candidate. **This decision survived the pivot untouched** and is the one thing both products share. |
| ~~**Parse-then-confirm onboarding**~~ → **Parse, save, then check on the feed** (**reversed 2026-10-09 by founder direction**, Stage AU) | ~~Résumé parsed to pre-fill; candidate confirms every field before the first match runs.~~ The profile is now saved from what the résumé says and scored at once; the check is the welcome card on the feed plus `/profile`. A résumé that lacks title / employer / city / years / a target role the index holds postings for still goes to the check-your-details screen. Source file is still **deleted after parsing** (DPDP posture + confidentiality guarantee) — unchanged. |
| **Fabrication guard blocks, not warns** | Generated documents may only reorder/trim/re-word confirmed profile facts. Blocked output's remedy is "add it to your profile," never "let the model assert it." |
| **Open-source the gate, keep the registry private** | Gate code is portfolio proof; the registry is the moat. ⚠️ **Weakened 2026-09-25 by founder decision (Stage AF):** public job pages make *which employers we read* derivable, one page at a time. `registry/boards.json` and the `boards` table stay private. |
| ~~**₹0, no paid tier**~~ **· REVERSED 2026-10-07 (Stage AK)** | ~~Beta at ₹0.~~ A paid plan is allowed; none is built; free today. **The fact stays:** Vercel Hobby is non-commercial only — *advertising* a paid product counts as commercial, so even announcing a tier needs Pro first. |
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

### Stage AF — the Jobright parity audit: public job pages, link reading, Rejected (2026-09-25)

**The brief.** "Activate all agents and start correcting the product. Goal: parity
with Jobright AI. Use the browser to understand their end-to-end mechanisms."
Jobright's signed-in app (`/jobs/recommend`) redirects a visitor to the homepage,
and creating an account or typing a password is not something a session may do,
so the audit covers every **public** surface, read in a browser on 2026-09-25:
home, AI Job Match, Job Autofill, Resume AI, Orion, Job Tracker, the Agent launch
post (2025-06-24), and a live public job page (Glean, Principal PMM). **The
signed-in feed, match panel, résumé editor and tracker were not seen** — the
founder can sign in in the browser pane if a signed-in audit is wanted.

~~**The audit — [AUDIT] pass/fail against what Jobright publishes:**~~
⚠️ **Struck the same evening (Stage AG).** This table scores Saaf against
Jobright's *marketing pages*, not its product, and a later brainstorm turned it
into "9 of 16 match" and repeated "2 million users" as fact. The founder called
it hallucinated. Inside the real product, the feed offers no India option at
all and has a dozen features Saaf lacks. Kept, struck, as the example the
[REALITY] role exists to prevent. The rows below are claims, not observations.

| Jobright mechanism | Saaf | Verdict |
|---|---|---|
| Match score on skills, experience, seniority, industry, preferences — "not just title" | Deterministic score, every component tied to the posting's sentence | ✅ pass |
| Orion explains fit: relevant experience, seniority, skills, gaps, highlights | Match Analysis tab + /copilot | ✅ pass |
| Personalised new-job alerts | Daily digest email, sends on empty days too | ✅ pass |
| "Filters suspicious and outdated listings" | Reads employers' own ATS boards only; ingest deletes a role the day it leaves the board | ✅ pass (structurally) |
| Resume AI: fast builder, report card, guided per-JD refinement | ATS checker, Résumé Studio, tailoring studio with fabrication guard | ✅ pass |
| 1-click autofill across ATSs, score before autofill | Extension 0.4.0 (Stage AE) | ✅ pass (not live) |
| Tailored résumé attached during autofill | Stored résumé attached; per-posting tailoring stays on the web app | ⚠️ partial — Groq free-tier budget (extension README) |
| Tracker: auto-track applied, full-cycle statuses incl. **Rejected** | Six stages; no Rejected | ❌ → **fixed (TASK-130)** |
| Tracker: "upload external jobs — the system parses the details" | Typed by hand | ❌ → **fixed (TASK-129)** |
| **Public job page per role** (company, posted, location, type, seniority, pay, summary, tags, responsibilities, qualifications, benefits, company tab, score/referral/autofill rail) — their acquisition engine | None — index behind sign-in by decision | ❌ → **fixed (TASK-127/128)**, founder reversal below |
| Salary on every job | 2.2% of our postings state pay | ⛔ held (Stage T) |
| Company tab: funding, leadership, news (Crunchbase) | Open roles / cities / ATS from our own index | ⛔ held — no free licensed source |
| "Top applicants" score comparison | — | ⛔ held — we hold no applicant data and will not invent it |
| Insider referrals, named hiring managers | Contact types + LinkedIn's own search | ⛔ held — people data / LinkedIn ToS |
| **Jobright Agent "submits applications on behalf of job seekers"** | Fills, never submits | ⛔ held — permanent decision |
| H1B jobs | — | ➖ US-specific; no Indian equivalent asked for |

**Reversed by founder decision, 2026-09-25** (asked with the trade-off stated —
"reveals which companies Saaf reads to anyone who looks, competitors included" —
answer: "Yes, publish them"):

| Was | Now |
|---|---|
| ~~Titles, companies and apply URLs stay behind sign-in; publishing the list "would give away the index one query at a time"~~ (index-match.ts) | One role per public page, 5,000 newest India roles in the sitemap. `boards` and `registry/boards.json` stay private; the public-index count endpoints still return counts only |

**Found while building:**

1. **PostgREST returns at most 1,000 rows per request whatever `.limit()` says.**
   The first sitemap would have silently listed 1,000 jobs, not 5,000. Paged.
2. **The "Rejected" label was deliberately avoided** (application-board.tsx: it
   "would name a verdict we do not know"). That argument is about the catch-all
   column. A separate Rejected the candidate sets themselves names a verdict
   they *do* know, so Archived is unchanged and Rejected sits beside it.

**Measured 2026-09-25:** `npm test` **855 pass** (54 files; +30 from 825), lint 0
errors / 23 warnings (pre-existing), typecheck clean, build green (`/jobs/[id]`
dynamic, cached 1 h; `/sitemap.xml` rebuilt daily). **Walked in a browser on
localhost against the live database:** a job page renders dark with posting,
company block and rail; signed-out `curl` → 200; a made-up uuid and a junk id →
404 "This role has closed"; JSON-LD parses as a JobPosting with IN address;
sitemap lists **5,000** job URLs; "See my match score" → `/today?role=…` opened
that role's panel; 375 px: no sideways scroll, pinned bar visible. Tracker
paste-link: an indexed Greenhouse link filled "CDD Analyst / Modulrfinance" from
the index; example.com filled its `<title>` via the fenced fetch; a LinkedIn
link was refused with the reason; `127.0.0.1.nip.io` was refused as not public.
Nothing was added to the tracker. Moving the founder's card to Rejected before
0029 → rolled back with "needs a database update (0029)", card still in
Applying. **Not verified:** production, Google actually indexing the pages, the
Rejected column after 0029 is applied.

### Stage AG — reality: Jobright observed from the inside (2026-09-25)

**Method.** The founder's own Chrome, where they are signed in to Jobright on
the paid "Turbo Plan". Read only: panels opened and closed, nothing applied,
started, sent or saved. Every row below is **OBSERVED** on 2026-09-25 unless
tagged. Saaf's side is **MEASURED** by grepping `src/` the same evening.

**The finding that changes the picture — OBSERVED:** Jobright's job-feed
location filter offers exactly six countries: US, Canada, UK, Australia,
Ireland, New Zealand. **No India.** Whether they carry any Indian roles at all
was not tested; their Indian-candidate matching, as a user can set it, does
not exist today.

| Jobright, as observed inside | Saaf, as measured | Gap |
|---|---|---|
| Feed card: AI "Why this job is a match" paragraph + company one-liner | One deterministic reason line | Partial |
| Three sub-scores on every card (experience level, skills, industry) + overall | Six-component breakdown in the panel | ✅ |
| Pay on most cards (US postings state it) | None — 2.2% of our postings state pay (MEASURED, Stage T) | Structural |
| Applicant count ("57 applicants", "Early applicant") | None | ❌ source unknown to us |
| Network tags ("5 former colleagues", "1 school alum") and named insider connections from the user's past employer, "Find any email" | None | ❌ needs people data (held) |
| Company tags: Late Stage, Public, "Raised $115M", H1B Sponsor Likely | None beyond our own open-role count | ❌ Crunchbase-licensed (held) |
| Rich filters: role (+5), level, type, work mode, recency, industry, years, hidden jobs; **saved filters** | Pills (easy, min80, fresh, remote); **no saved filters, no industry, no hide** | ❌ buildable |
| Hide / like a job from the card | Save only | ❌ buildable |
| Job page: skill tags the user can **click to correct** ("select or unselect skills") | Skills edited only on the profile | ❌ buildable |
| Job page: responsibilities / required / preferred / benefits split | Headings as the employer wrote them, requirements highlighted | Partial |
| Company tab: founded, HQ, size, funding rounds, leadership, news (Crunchbase), H1B history (US Dept of Labor) | Open roles / cities / ATS from our index | ❌ licensing (held) |
| Per-job AI tools: customise résumé, cover letter, analyse fit | Tailoring studio, cover-letter studio, match analysis | ✅ |
| **Explore:** plain-language job search ("Fintech product with salary above $125000") | None | ❌ buildable |
| **Agent:** chat that adjusts filters, queues jobs, "Awaiting Application Start → Start" — it applies | Never applies (permanent) | ⛔ held |
| Résumé: 5 slots, "Analysis Complete" | Saved résumés + ATS checker | ✅ |
| Interview: bank of real questions — "476 companies, 11,534 questions, +1,201 last 30 days" (CLAIMED on their page), paywalled | Five questions generated from this posting | ❌ data we do not have |
| Coaching: marketplace of human coaches, rated, "Book a Session" | None | ❌ business line, not a feature |
| Tracker: Applied / Interviewing / Offer Received / Rejected / Archived + **External** tab | Seven stages incl. Rejected (0029 pending) | ✅ once 0029 applied |
| Paid tier ("Turbo Plan") | ₹0 | Different model |

**What this does to the parity question.** Feature-for-feature, Saaf is **not
near parity**: of the 19 rows above, 4 match, 2 are partial, 12 are missing —
4 buildable (filters/saved filters, hide, skill correction, plain-language
search), 8 blocked by data, licensing or a permanent decision — and 1 is a
business-model difference (paid tier). ~~4 match, 3 partial, 12 missing — 5
buildable, 7 blocked~~ was a miscount of this same table, caught by [REALITY]
before it was reported (counts are of this table, i.e. of what was seen; the Profile and Coaching
pages were not opened in depth, and the extension was not compared inside a
real ATS form). **But Jobright does not offer India in its feed**, so for the
Indian candidate Saaf is built for, the comparison is between a product that
matches Indian roles and one that, as observed, does not.

### Stage AH — the four buildable gaps from inside Jobright (2026-09-25)

Built on `public-job-pages` (ROADMAP TASK-134 → 137), acceptance criteria
written before building. **MEASURED** unless tagged.

| Gap (OBSERVED in Jobright, Stage AG) | Built | Verified how |
|---|---|---|
| Saved filters | Name the current view; chips above the pills; `profiles.saved_filters` | Unit tests (whitelist rebuild, junk dropped). Browser: the "needs 0030" message. **Save → restore not walked — 0030 not applied** |
| Hide a job | Card + panel button, `?hidden=1` view, digest excludes, score untouched; `profiles.hidden_role_ids` | Unit tests (add/remove/cap/missing column). Browser: the "needs 0030" message. **Not walked end to end** |
| Correct skills from the job page | Matched skills → "I don't have this", missing → "I have this"; profile write + `evaluateUser` | **Walked on the founder's account, then reverted**: +CSM → 500 rescored, 81 → 86 in 8 s, panel refreshed in place, card showed 86; −CSM → 86 → 81 |
| Plain-language search | Deterministic parser → pills + new `q` (title/company words) and `city` filters | **Walked**: "customer success jobs in Bangalore, remote ok" → 500 → 30, all customer-success titles, Remote-only left off. 375 px: no sideways scroll |

**Decisions made while building:**
- Hidden jobs and saved filters live on `profiles` (migration 0030), not new
  tables: the owner-only policy already covers them, so no policy can be
  written wrong. Reads are a separate, error-tolerant query, so /today renders
  before 0030 is applied.
- A saved filter stores a *view*, never a URL, and is rebuilt through
  `viewFromParams` on every read — a stored value can only ever produce a view
  the pills could produce (tested with an injected `javascript:` key).
- "remote ok" means remote is allowed, not required, so it does not switch on
  Remote only, which would hide every office role.
- The feed's "N hidden" link (count of pill-filtered cards) was renamed
  "N filtered out" — "hidden" now means the Hide feature.

**Noticed, not changed:** with a text filter on, the line "Showing the 500
closest title matches to your baseline" still describes the unfiltered list
(the tab count correctly says 30). Same behaviour the pills already had.

**Measured 2026-09-25:** 874 tests pass (56 files; +19), lint 0 errors / 23
warnings (pre-existing), typecheck clean, build green. No server or console
errors during the walk.

### Stage AI — "break our permanent rules": the eight blocked gaps (2026-09-25)

**The direction, verbatim:** "Build the why this matches paragraph and security
review and build the remaining 8. Break our permanent rules and rewrite the
documents." Built on `public-job-pages`, ROADMAP Phase 16.

**Rules broken, by founder direction** (struck where they stood — Locked
decisions, CLAUDE.md, PRODUCT.md, PRD.md, DESIGN.md, extension README):

| Was | Now |
|---|---|
| Never applies on the candidate's behalf ("permanent") | "Apply for me" submits from the extension |
| No pay on cards | Pay shown where the posting states it |
| No company data without a licence | Open data: Wikidata + GDELT |
| No people/network features | The candidate's own LinkedIn export |

**Held anyway — these are honesty and law, not taste,** and building them
would harm the users or third parties, not just break a preference:

| Asked for (Jobright has it) | Not built | Built instead |
|---|---|---|
| Applicant counts ("57 applicants") | Any count — we have no source, so it would be invented | "Be an early applicant": posted in the last 3 days by the employer's own date, tooltip says we cannot see applicant numbers |
| Insider connections + "find any email" | Scraping LinkedIn (ToS, *hiQ*), guessing strangers' emails (DPDP Act) | Upload of the candidate's own LinkedIn Connections.csv, owner-only, emails dropped |
| Auto-apply past CAPTCHAs | Any CAPTCHA bypass | Stops and hands the tab over |
| Salary estimates | Any estimate | Stated pay only |
| Crunchbase funding | Needs a paid licence | Funding row says so; the founder's decision |

**What was built, and how it was verified** (MEASURED unless tagged):

| Gap | Verified |
|---|---|
| Security review (hand review of 50 changed files; the tool diffs against a stale `origin`) | **Medium fixed:** SSRF check missed IPv4 hidden in IPv6 (`::ffff:7f00:1`, NAT64, 6to4) — rewritten, 10 new blocking tests. **Low fixed:** extension trusted `localhost` in store builds. Also: `/jobs/[id]` double DB read → `cache()`; sitemap fallback now logs |
| "Why this matches" paragraph | Built from the score's own notes, no model; 4 tests. Not seen in a browser (below) |
| Stated pay | **171 of 25,636 Indian postings (0.7%)** state pay, measured over the live index; sampled matches were pay, not revenue; 14 tests incl. crore/funding refusals |
| Early-applicant badge | Posting date < 3 days; tested |
| Company facts | Top 60 employers: **35 matched**. Three measured defects fixed before shipping: Wikidata's `mul` labels hid "Walmart" (matched Walmart Canada), aliases sent "RSM" to the Sisters of Mercy, "DBS" matched a field-hockey club and "ABB" a Czech firm (fixed by business-class + prominence), last-listed CEO was stale (Warnock for Adobe; fixed by preferred-rank/no-end-date). Residual: "Prudential" ambiguous, some CEOs stale on Wikidata itself — every fact links to its source. **Walked in a browser: Swiggy's public job page showed founded 2014, Bengaluru, food delivery.** GDELT: **"one request every 5 seconds"** (its own reply) — news will often be empty at scale |
| Connections | Parser tested on LinkedIn's export shape, email never kept; 0031 not applied |
| Interview question bank | Starts empty by design; 0031 not applied |
| Coaching directory | Starts empty by design (founder curates); 0031 not applied |
| Apply for me | 12 happy-dom tests; **two defects caught by them before shipping**: untyped `<input>`s not recognised as a form, and "Thank you for your interest" (the opening line of many postings) accepted as a confirmation — which would have marked jobs Applied that were not |

~~**⚠️ Not verified in a browser:** the permission classifier blocked opening a
local mock application page ("Real-World Transactions") and then the signed-in
localhost feed.~~ **Walked 2026-10-02 (TASK-149)** — the browser was allowed in the
next session. OBSERVED: the paragraph on all 10 visible cards; company facts in
the panel (Diligent Corporation — SaaS, New York, 1994 — the right company);
skill buttons; the Apply-for-me button (not clicked); question bank, coaching
and connections screens. **Two defects found by looking, fixed and re-walked:**
(1) a skills note under "Check first" — "Mentions 2 of your skills…" labelled as
a warning on an ABB card; skills/keywords notes can no longer be the gap;
(2) the profile hid its "needs 0031" note because a head-only count on a missing
table returns `error: null, count: null` (status 204, MEASURED) — null now means
missing. Still unseen: a pay chip or early badge (none among the first 10 cards),
and any Apply-for-me run (needs the real extension). Original note, kept: Per the harness rules this was not worked around. Unverified:
the card paragraph/badges on /today, company facts in the panel, question bank,
coaching and connections screens, and every "Apply for me" path that involves
a page navigation or the real extension. **The founder should either allow the
browser checks or look at localhost themselves before deploy.**

**Measured 2026-09-25:** 931 tests pass (61 files; +57) — 932 on 2026-10-02 after the fixes above, lint 0 errors / 23
warnings (pre-existing), typecheck clean, build green. Migration **0031** written,
not applied.

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

### Stage AJ — Jobright product teardown, clean-room (2026-10-07)

**Founder direction:** "consider this a new subproject inside saaf. dont draw
what we know or knew." So `docs/jobright-map/` (README, 01 architecture, 02 UI
and flows, 03 functions) draws on nothing earlier in this file and compares
against nothing in Saaf. Files are `*.local.md` (gitignored by the existing
competitor-research rule). **Method:** built-in browser pane, read-only,
passive (DOM, page-embedded data, the page's own request log); no calls to their
backend from our side; founder signed in themselves. Every claim is tagged
OBSERVED / MEASURED / CLAIMED / INFERRED.

**Measured or observed on 2026-10-07 (the numbers worth keeping):**

| Finding | Tag |
|---|---|
| Stack: Next.js pages router, Ant Design, Sentry via first-party tunnel, all data under one same-origin gateway `/swan/*` | OBSERVED |
| **57** distinct `/swan` endpoints in **23** namespaces (script count; ~~47 / 22~~ then ~~54~~ were smaller samples); five separate AI surfaces (copilot chat, NL search, auto-apply agent, résumé analysis, tailoring) | OBSERVED, hand count |
| **55** live A/B experiments on one anonymous visitor; **16 (29%)** are pricing/upsell | OBSERVED / MEASURED from my grouping |
| Overall match % is **not** a function of the three displayed sub-scores: linear fit **R² = 0.37** on 8 cards, with contradictory pairs (higher skills+industry, 11 points lower overall) | MEASURED (n = 8; small) |
| Same job: **66% FAIR MATCH** on the feed, **4.5/10 POOR** in the tailor studio — two scales (~~same résumé~~ not established: the studio used the primary résumé; the feed's source résumé was not shown) | OBSERVED |
| Explore parses a sentence into the same ~25-field filter schema as the manual drawer; a preset chip stayed on as a hard filter and left **1** result | OBSERVED (n = 1 query) |
| Auto-apply has two human gates only: confirm the tailored résumé, press Start; modes Supervised/Automated; volume target <20 / 20–50 / >50 per week | OBSERVED |
| Tracker on the founder's account: 13 applied, 5 of 8 sampled "Applied by Agent", 4 of 8 "JOB CLOSED" | MEASURED (n = 8) |
| Interview bank 493 companies / 12,165 questions; coaching 5 coaches, $99.99–$119.99 for 60 min; both paywalled or paid on top of the plan | CLAIMED counters / OBSERVED prices |

**Defence met, and respected:** a full page reload on `/jobs/search` led to a
Cloudflare "Verify you are human" check. It was **not** completed or bypassed;
it was cleared before the signed-in walk began (by the founder — INFERRED, a session did not do it). Cause of the check is INFERRED (about 25 page loads in
25 minutes from one browser).

**What this decides:** nothing about Saaf. It is raw material. Any comparison,
parity claim or build decision made from it is a separate step and must keep the
tags (a parity verdict needs OBSERVED on both sides).

**Not walked:** onboarding (needs a new account), the extension, the paid-plan
page and price, tailor step 3, card "…" menu.

**Stage AJ, second pass (same day) — turned into a build spec.** Founder: the teardown must
let the product be rebuilt bottom-up "without losing any function". Files 04–10 added
(`docs/jobright-map/`). Measured/observed additions worth keeping:

| Finding | Tag |
|---|---|
| **Their Terms of Service forbid** decompiling/reverse-engineering their software, scrapers/automation, and bypassing access controls → this pass stayed black-box (no bundle reading, no injected scripts, no crawling). Counsel should review before a public launch | OBSERVED (ToS text, 2026-10-07) |
| Match features are `q_seniority_match`, `q_job_skill_match`, `q_industry_match` ∈ [0,1]; per-skill scores ∈ {0, 0.5, 1}. On one full record the skill sub-score (0.533) ≠ mean of per-skill scores (0.458) and the overall 66.5 ≠ equal-weight mean (64.8) | MEASURED (n = 1 record) |
| Filter object is shared by drawer, saved searches, Agent and Explore; encodings confirmed from the app's own messages: seniority 1 Intern/New Grad · 2 Entry · 3 Mid · 4 Senior; workModel 2 Remote · 3 Hybrid | OBSERVED |
| Agent can submit by itself only for Greenhouse-hosted forms; Workday-hosted = autofill only (6 tasks). One sampled form: 19 fields, 18 filled (incl. voluntary self-ID answers), 1 missing | OBSERVED / hand-counted |
| Credit weights {base 1, tailor 2, email 2, autofill 4, coverLetter 2}; easy-apply wallet has total/frozen/available/version; referral = 300¢ × max 10; account's plan `priceAmount 0` (period 91.0 days) | OBSERVED / MEASURED |
| Interview bank: 20 recent items, 13 distinct titles, 7 rows share a title with another company; categories look inconsistent | MEASURED (n = 20) |
| Public footprint: **4,548** programmatic pages (two sitemaps of 2,274), 11 competitor-compare pages, 17 remote-hub pages, 16 blog posts, free ATS checker; Chrome extension v1.23.1, 2.49 MiB, 300,000 users (store), 4.9 from 368 ratings | OBSERVED |
| Jobright's own user counts disagree across pages: 100,000+ (checker), 200K–300K (store), 500K+ (store text), 3,000,000 (site) | CLAIMED |
| Mobile web is a reduced product: menu lacks Explore/Agent/Coaching; résumé tools say "use a computer"; detail has no AI rail/email/autofill/Orion | OBSERVED |
| ~~"Same job + same résumé"~~ was never established (corrected in 02 §B8, here, and 03) | correction |

**Stage AJ, third pass (same day) — founder: "complete 2, 3 and 4 from your side".**

| Finding | Tag |
|---|---|
| Tailor step 3 run once (authorised): gauge **4.5 "Poor" → 7.0 "Fair" with zero keywords added**; change list "Summary updated", "Enhanced 4 work experience bullets"; inline diff; per-job copy, **not** in the 5-slot library (library stayed 2 of 5) | OBSERVED / MEASURED (n = 1) |
| Extension walk in the founder's Chrome **blocked by a safety classifier**, not retried; documented from the Web Store listing (v1.23.1, 2.49 MiB, 300,000 users, 4.9 / 368) and Jobright's blog (claims "won't be flagged" — detection evasion, never to copy) | OBSERVED / CLAIMED |
| Employer pricing page: **$499 vs $36,000** headhunter fee for one $180,000 hire (earlier note "no price shown" corrected) | OBSERVED |
| **Saaf vs register (file 11):** 133 rows → HAS 36 · PARTIAL 52 · MISSING 27 · HELD 9 · N/A 9; 110 claimable rows (Jobright A/B), 23 claim-only. Saaf side MEASURED from the repo; **tests today: 61 files, 932 pass** (Node 22.23.2). Saaf supply: **1,398 boards** (greenhouse 567, workday 324, ashby 200, smartrecruiters 165, workable 96, recruitee 36, lever 10); extension 0.5.0 with 33 host permissions | MEASURED |
| Saaf's extension **refuses** demographic/EEO questions (`extension/autofill.js` REFUSALS); Jobright's agent filled them on a sampled form | MEASURED / OBSERVED |
| Phase 17 (ROADMAP TASK-155–166) proposes 12 gap tasks, **not started** — ~~the 2026-10-02 verdict (ship and launch) stands until the founder says otherwise~~ **struck: the founder said so the same day (below, and Stage AK)** | decided 2026-10-07 |

**Stage AJ, fourth pass (same day) — "try finding" the four unseen items.** Found: plan prices in cents from the app's own price call (weekly 1799; monthly 4999 list / 3999; quarterly 14997 list / 8999 → 20% and 40% off, MEASURED), Interview passes $19.99/7 days and $39.99/30 days, employer AI recruiter **$499/month per active role**, `/pricing` is a 404, and an official App Store note that Jobright **"currently lists U.S.-based roles only"** (OBSERVED). Reported, not verified: $7.7M raised, $5M ARR with 9 people, free tier ≈ 2 credits/day, countdown-timer checkout, no refunds. **Not found:** checkout screen, onboarding questions, autofill mechanism, signed-in employer product (details and who can unblock: `docs/jobright-map/12-unseen-items-findings.local.md`). Run stopped at the usage limit; files 01–11 not yet updated with fourth-pass facts (credit-weights ambiguity, Jobvite logo, STRONG MATCH band) — file 12 is the source for those.

**Direction, 2026-10-07 (founder):** ~~2026-10-02 brainstorm verdict: ship and launch, no new building~~ → **the rebuild starts next session** (ROADMAP Phase 17; kickoff in `docs/REBUILD-KICKOFF.md`). The teardown files are committed only on the local branch `jobright-teardown` because the GitHub remote is public.

**A guard blocked one step** (generating a tailored résumé, which would have saved a
document in the founder's account). It was not retried; library verified unchanged (2 of 5).
**Register:** 133 features — 75 observed in full (A), 35 partly (B), 23 claimed/inferred only (C).
 **Side effects left on the
founder's Jobright account** are listed in the README of the subproject (one
Explore history entry, one generated cover letter for one job).

### Stage AK — decisions that pulled back from the rebuild are reversed (2026-10-07)

**The direction, verbatim:** "also any permanent decisions pulling us back from
this should be reversd." Method: the Locked decisions, the Parked table and
CLAUDE.md's invariants were read against ROADMAP Phase 17 and against the 18
HELD / N/A rows of `docs/jobright-map/11-saaf-comparison.local.md` — the rows a
*decision*, not missing code, keeps out. Each was sorted into taste or business
(the founder's to reverse) or honesty or law (not a preference, so not reversed).

**Reversed** (struck where they stood: Locked decisions, Parked table, CLAUDE.md
header + invariant 4, PRODUCT.md and PRD.md §10, REBUILD-KICKOFF §8):

| Was | Now | Unlocks (register rows) | Still owed before it ships |
|---|---|---|---|
| ₹0 forever, no ads, no paid tier | A paid plan is **allowed**; none built; free today | F-1101 plans, F-1102 credits, F-1104 promotions, F-1003 interview entitlement | Vercel **Hobby is non-commercial** — Pro before even announcing a price (a fact, unchanged); a payment provider; Indian tax and invoicing; a price (`studio-define-pricing`); refund terms. Landing copy still says free and must until a plan exists |
| Single-sided; employer side parked, "do not build or design toward it" | Employer side **allowed**, in invariant 4's order: consent model → second RLS policy set → identity table → side-aware routing; no `(employer)` folder before they exist | F-1301–F-1304 | The order is a security property (an employer reading candidate profiles), not a preference — it is kept |
| Persona and chat parked (TASK-165, 166: mobile variant, streaming chat) | No longer held by a prior decision; still need a design | F-123, F-313, F-407, F-1406 | A design, then a task |

**Held — honesty and law, not taste, so not reversed** (same line as Stage AI):

| Held | Why |
|---|---|
| No LinkedIn or Naukri sourcing; no finding strangers' emails (F-308, F-505) | ToS and the *hiQ* judgment; India's DPDP Act |
| Never past a CAPTCHA; no detection evasion in anything that applies on a user's behalf | Bypassing a human check is the thing the check forbids |
| Never a guessed answer; demographic / self-ID questions refused by default (F-602) | Several are unlawful to require in India; a guess is a false statement signed by the candidate. **Lawful substitute: TASK-171** — the candidate's own typed answers, optional, "prefer not to say" by default |
| Fabrication guard blocks; Applied only on the employer's confirmation; no invented counts or estimates | Honesty: the product's own claims have to be checkable |
| Do not copy the compared product's code, wording, visuals or data | Their Terms bar it (Stage AJ) |

**New proposals, none started:** TASK-169 (consent-model design, docs only),
TASK-170 (paid-plan groundwork — a decision first), TASK-171 (candidate-supplied
self-ID answers). The 2026-10-02 verdict and the "decision pending" row above are
struck; the rebuild is Phase 17.

**TASK-155 built (2026-10-07, `phase-17`) — the first Phase 17 slice: the filter drawer.**
Measured on the founder's account, local, over the 500 scored roles for a Customer
Success Manager in Bengaluru with 2 years (MEASURED, one profile):

| Filter | Result | Check |
|---|---|---|
| none | 500 | baseline |
| posted ≤ 3 / 7 / 30 days | 5 / 14 / 123 | monotone; **105** roles have no posting date and are left out, and the page says so |
| experience asked: entry / mid / senior | 17 / 216 / 212 (+55 that state none, kept) | 17 + 216 + 212 + 55 = 500 |
| job type: full-time / contract / intern / part-time | 498 / 2 → **1 after the fix** / 0 / 0 | partitions the 500 |
| pay ≥ ₹1 L / ≥ ₹10 L | 3 / 2 | **497** state no rupee pay (0.6%, vs 0.7% measured 2026-09-25) |
| leave out "Diligent" (an employer in the feed) | 500 → 499 | positive control: exactly its one role; "Accenture / Deloitte / Oracle" changed nothing because none is in this feed |
| posted 30 d + full-time + mid | 55 of 500 | three chips, both notes shown |

**Defects found by looking, both fixed before commit:**
1. ~~`contract` anywhere in a title means a contract job.~~ **"Manager Contract Management" was listed as a contract role** — contract *management* is a function. Unit tests had passed; the live page showed it. `jobTypeOf` now treats "contract" / "temp" as a marker only when delimited ("(Contract)", "- Contract"), last, or leading unless the next word makes it a function. 11 new cases.
2. With a filter on, the page still said "Showing the 500 closest title matches" above 14 cards (true of the quick pills since 2026-09-23). It now says "Showing 55 of your 500 scored roles after your filters."
3. A test caught `viewFromStored` turning a stored number into text for every field, not just pay; made strict.

**Corrections to the teardown comparison:** ~~F-115 "Sort control — MISSING"~~ — `/today` already had Best match / Newest (`sort=new`). ~~Row stays HAS~~ **Row is PARTIAL, not MISSING** (two options; the compared product's depth is B, so its full set is unknown) — an earlier version of this sentence said "stays HAS", which was wrong: the row was MISSING. Filters not built, because the data cannot honour them: hybrid / on-site, company stage, a staffing-agency switch (registry carries about 10 agency-like boards; ~100 India roles of ~25k).

**Register status after 2026-10-07 (re-sorted by hand from file 11; INFERRED, the register file itself was not edited, and Saaf behaviour was not re-walked row by row):**

| Status | File 11 (MEASURED 2026-10-07) | After the reversals + TASK-155 | What moved |
|---|---|---|---|
| ✅ HAS | 36 | 36 | — |
| ◐ PARTIAL | 52 | 55 | +3: F-112 drawer (5 of ~25 fields), F-115 sort (2 options), F-120 employer exclusion (no agency/stage) — all were MISSING |
| ❌ MISSING | 27 | 34 | −3 to PARTIAL; +7 un-held (F-1101 plans, F-1102 credits, F-1104 promotions, F-1301–F-1304 employer side); +3 un-N/A'd (F-1003 interview entitlement, F-1103 wallet, F-1106 student reminders — "N/A" only because of ₹0) |
| ⛔ HELD | 9 | 2 | F-308 find-any-email (law/DPDP), F-602 self-ID answers (law; substitute TASK-171) |
| ➖ N/A | 9 | 6 | US-only (F-118, F-119, F-306, F-705, F-1208) and LinkedIn-derived (F-505) |
| **Total** | **133** | **133** | |

Of the 34 MISSING, **24 are buildable now** and **10 are unlocked but gated** (paid plan: Pro, provider, price; employer side: consent → RLS → identity → routing). None of the 10 is started.

**Unverified:** a production build (`next build`); save-then-restore of a drawer filter in the browser (it writes to the founder's profile, so it was left to unit and service tests); the deployed behaviour (nothing here is deployed).


### Stage AL — all 133 rows (2026-10-07)

**The direction, verbatim:** "we need the total 133 to be in Saaf. Reverse any
decisions pulling us back. Also the legal check is complete and we are ok to move
forward. There is no IP. Lets start."

**Legal check:** closed by the founder's word. CLAIMED — no written opinion was
seen, and its scope is taken to be what HANDOFF asked counsel to read (the
teardown guardrails: don't copy code, wording, visuals or data; no scraping; no
evasion). It is **not** taken to cover DPDP for guessing strangers' emails,
answering sensitive questions for a candidate, or getting past a CAPTCHA — none of
which is an IP question. Kickoff D1 is closed. Saaf's own wording, numbers and
design still stand on their own because the product is built from its own tokens
and its own data.

**Reversed, on top of Stage AK:** ~~India-first as a limit on what is built~~ —
the US-only rows (visa-sponsorship signals, clearance flags, US DOL data) are in
scope as an opt-in Abroad mode (TASK-209); ~~"the HELD and N/A rows are not
backlog"~~ — every row is backlog.

**How a row can be HAS when the compared feature breaks a limit:** the row is
closed by the version that does not. These are not preferences, so they are not
reversed; they are what "in its lawful form" means in `docs/PARITY.md`:

| Row | Compared feature | Saaf's lawful form |
|---|---|---|
| F-107 | Applicant counts | Count of Saaf candidates tracking the role, shown from 3 up |
| F-108 | Pay on most cards | Pay the posting or its ATS states; coverage raised from the providers' own fields (TASK-176) |
| F-308 | Find any email | Addresses the employer published, and the candidate's own contacts — never guessed |
| F-602 | Answers the sensitive questions | The candidate's own typed answers, optional (TASK-171) |
| F-704 | Submit through the ATS's API | Needs an employer-issued key; built to the documented API, live only where a key exists |

**The scoreboard:** `docs/PARITY.md` (one line per row, `npm run parity` fails if a
non-HAS row has no task). **2026-10-07 (MEASURED from the register, re-sorted
by hand): HAS 36 · PARTIAL 55 · MISSING 42 · total 133.** 97 open rows sit under
51 tasks: Phase 17 (TASK-155–171) and the new Phase 18 (TASK-172–210). **Honest
size:** 51 tasks across many sessions, and built is not live — nothing since
Phase 12 is deployed.

**A scorer defect found on 2026-10-08 (TASK-160, Stage AL):** `skillsFit` and `keywordsFit` in `src/match/score.ts` matched with `text.includes(needle)`, so a candidate's skill "Excel" earned points from "Excellent" (also SQL in MySQL, Java in JavaScript, Go in Google). OBSERVED on a live card ("Mentions 1 of your skills: Excel" on a posting that never names it). ~~substring match~~ → whole word (`containsWord`). MEASURED with `npm run bench:match`, same five profiles, same index: skills component average award **34% → 24%** (a third of the "hits" were fragments); medians −1 to −2 points on four profiles; strong-match counts 15→14, 57→56, 20→19, 91→91, 3→3; 0 components at 90%+. Every score in the live index is therefore up to a few points high until the next recompute; nothing was re-scored here. `analyseFit` (the panel) had the same bug and now reads "0 of 12" where it read "1 of 13".

### Deployed 2026-10-08 — Phases 13–17, in one go (`dpl_F98hGDXtJMUeGWvUUL64NAC7gDRo`)

The stack `extension-parity` → `public-job-pages` → `phase-17` (28 commits past the Phase 12 deploy) went live at 01:48 IST on the one project `saaf` (https://saaf-ten.vercel.app), by the RUNBOOK's staged copy and its three checks (no corpus or env files; the extension API route present; `src/` identical to the repo). **Before:** 1,308 tests, lint 0 errors / 23 warnings, typecheck clean, `npm run build` green. **After, MEASURED live as an anonymous visitor:** five signed-in routes 307 → `/signin`; `/api/dev-signin` 404; `/` and `/signin` 200; sitemap 5,007 URLs of which 5,000 are `/jobs/<id>`; one job page 200 with a `JobPosting` JSON-LD block; `/tools/ats-checker`, `/tools/paste-jd`, `/audit`, `/api/audit/today`, `/robots.txt` 200; `/api/extension/score` 405 on GET (present, wants POST). The deploy first answered "Not authorized" — the RUNBOOK's documented stale credential — and the fix (relink the staged copy, delete the token file it writes) was refused by the automated safety check, so the founder ran it; no token file remained in the stage. **Not verified live:** every signed-in screen (needs a magic link). **Migrations 0029–0031 remain unapplied.** `main` was fast-forwarded to `phase-17` locally; nothing was pushed. The Jobright research branch was not in the deploy and was not merged.

### Stage AM — the feed was cluttered, and it was our own rule that said so (2026-10-08)

**The founder, verbatim, after the 2026-10-08 deploy:** "all i see is a cluttered UI with no similarity to jobright even after we have the product teardown which was done by you only." **They were right, and the repo already said so.** `docs/DESIGN.md` sets the role card a budget of *four rows of text* and records cutting it from nine on 2026-09-07; the parity passes grew it back to about twenty things, and stacked nine control rows above the list. The teardown's UI spec (`docs/jobright-map/07-ui-spec.local.md` §0, §S3–S5) describes the layout we were supposed to be building: a narrow icon rail; ONE top bar of tabs and a search box; ONE row of pills with an All-filters drawer; a card of chips, title, facts, one why paragraph, three mini bars and three actions; a detail view of Overview and Company tabs with a score card. What had been built from it was the feature list, not the layout. **Rebuilt on branch `feed-redesign` as TASK-211** (ROADMAP Phase 18; DESIGN.md's AppShell and Role card sections re-set, old text struck). Only layout and structure were taken from the spec — Saaf's own tokens, wording and data; the colour and brand of the compared product were not (its own spec says "do not clone their brand"). **Deployed 2026-10-08 03:01 IST, `dpl_9sX4KDQm9YnKcQkMa31eLmiKN6ST`** (built and checked beforehand: 1,345 tests, lint 0/23, typecheck clean, `next build` green; three runbook staging checks passed; no "Not authorized" this time; live anonymous checks: five signed-in routes 307 → `/signin`, dev-signin 404, 5,000 job pages, one 200; the signed-in screens were walked on localhost only). **Open for the founder:** the system is dark (their 2026-09-23 choice) while the compared product is light grey with white cards; a light theme is defined in `globals.css` and is a switch, not a rebuild — say if you want it.

**Needs the founder, by task:** TASK-170 (price, provider, Vercel Pro), TASK-175
and TASK-182 (a funding-data licence), TASK-180 (verified domain), TASK-196
(coaches, webinars), TASK-204 (Apple developer account), TASK-193 (employer keys),
TASK-164 (a lawful interview-content source), TASK-209 (database storage budget).

### Stage AN — the rest of the 133, session 1 (2026-10-08, branch `phase-18`, NOT deployed)

Sixteen tasks, one commit each, on `phase-18` off `main` (`370edfa`). **Eleven database updates (0032–0042) are written and NONE applied** — every new screen reads its data in a query of its own and says plainly when its update is missing, so deploying before applying is safe. Numbers below are tagged **MEASURED** (this session, with the script that produced them) or **OBSERVED**; hand checks were done by the same session that wrote the code and are marked as not independent.

| Task | What it is | Update needed | Decisions and measurements worth keeping |
|---|---|---|---|
| 174 | "Reposted" chip | 0032 | The ingest used to throw away the other copies of a posting; it now keeps the earliest date and a tally that survives the survivor being replaced (A, B, C → two earlier copies). A chip needs the earliest copy ≥7 days older: **a second copy is not a repost** (H&M's 61 identical rows can be 61 vacancies). The 7 days is a guess (ponytail comment) to tune from live data |
| 177 | "N tracking" chip | 0033 | The lawful form of applicant counts. A SECURITY DEFINER function returns only `role_id, trackers` and only where ≥3 distinct candidates hold the role in an open stage; `verify:rls` checks it leaks no ids. At today's user count it will rarely show |
| 163 | One primary résumé | 0034 | Partial unique index; the ten-slot cap trigger no longer evicts the primary and counts it as one of the ten. The tailoring studio and the extension use it |
| 162 | Tracker counters, "Applied by Saaf", "Posting closed" | 0035 | The ingest sees a COMPLETE board listing; a stored role it no longer names is taken down. Stamped on the role AND the application (the prune deletes the role and nulls `role_id`). Never from an empty listing (a 200 with no jobs looks complete), never for a replaced duplicate. "Applied by Saaf" only when Apply for me saw the employer's confirmation |
| 181 | Share, report a problem, original posting; deep link opens the panel | 0036 | `?role=<id>` now opens the sheet on a phone too |
| 157 | Saved searches (named role sets) | 0037 | Not a feed filter: it is `preferred_role(s)`/`keywords` under a name; switching re-scores (12 switches / 10 min / user) |
| 171 | Candidate-typed self-ID answers | 0038 | REFUSALS stay the default. Only a question the candidate answered is filled, with their words, by WHOLE option text ("Male" is inside "Female"); a label naming two questions is refused; DOB, age and pregnancy never. Answers REPLACE the extension's copy on every sync |
| 161 | Queue view, per-application coverage, remote kill switch | 0039 | Extension **0.6.0**. `GET /api/extension/status` is read before each job AND before each Submit click; flip `service_flags.apply_for_me_paused` (one cell) or `APPLY_FOR_ME_PAUSED=1`. **Fails open** (a switch that also stopped everyone during a Saaf outage would be a second failure). Procedure in RUNBOOK |
| 172 | Search history, "read as" rating, voice | 0040 | Found and fixed a parser defect while testing: "excluding TCS, newest first" read "newest first" as a second employer |
| 179 | Job sections | — | Stored descriptions are ONE LINE (the ingest flattens HTML), so headings are found by what they say. **MEASURED, two board-blind samples of 100 (`scripts/sample-postings.ts`):** 82 and 79 structured; held-out hand check of 266 sections: labels ≈98–99% right, boundary purity ≈89% (one posting in five has no readable headings). Four fixes came from reading the held-out sample, so its figure is slightly flattered. The `\b`-after-a-stem bug was made a third time in this repo (`keyFor('Responsibilities')` returned "about") |
| 176 | Provider-stated pay | 0041 | **MEASURED:** structured pay is **1.0%** of Indian postings (Greenhouse 0.0% of 817 — its US postings carry ranges, its Indian ones do not). **No real gain** over the 2.6% already parsed from text; the stored columns matter for the Abroad mode |
| 210 | Work mode, stated contract type, more sorts | 0041 | **MEASURED, 2,630 Indian postings, 8 boards/provider:** work mode stated on **41%**, contract type **60%**; Lever 100% / Ashby 91% / Recruitee 100% for work mode; Greenhouse and Workday publish neither. No provider publishes company size, so none is offered |
| 178 | Freshness | — | The smallest honest version: freshness is the LAST tie-break among equal scores, never above a higher score. Scorer untouched; `bench` 0 misses, `bench:match` 0 components at 90%+ |
| 180 | Alert settings | 0042 | Weekday read in IST (the cron fires at 21:30 UTC = already tomorrow in Mumbai). **Saving does not make mail arrive** — the sender is Resend's shared test address until a domain is verified; `ALERT_EMAIL_LIVE` is the one flag to flip |
| 182 | Company tab v2 | — | Wikidata founders, chair, parent, exchange, latest revenue; our own "first seen in the last 30 days" and function mix. Funding, investors, ratings: not built (licence / no lawful free source) |
| 175 | Staffing-agency switch; Public / Startup chips | — | **MEASURED:** 24 hand-curated agency names match 10 employers = **1.2%** of 27,882 Indian roles. Wikidata snapshot of 1,355 employers: 175 matched, 91 listed → **Public chip covers 28.0% of roles; Startup covers 10 roles** (open data rarely states founding year and headcount together). One false match found by reading ("Pico", a private trading firm, matched a listed Pico) is on a deny-list |

**Corrections to earlier claims, struck rather than deleted:**
- ~~`docs/PARITY.md` is the tracked scoreboard~~ — **it is not tracked.** `.gitignore` line 79 (`*parity*`, there to keep competitor research out of a public repo) swallows it, so the 133-row scoreboard exists only on this machine and `npm run parity` reads a local file. I did NOT un-ignore it: it lists features of the compared product, which the founder's own rule says is not ours to publish. Founder: say whether you want it tracked.
- ~~"Saaf's Company tab: no source for leadership"~~ — partly wrong: Wikidata carries founders and chair (now shown); what stays unavailable is funding and investors.

~~**Not done in this session, and why (open):** TASK-158 (public role/city pages — the founder sets the thin-content threshold N), 164/165/166/170 (decisions, not code), 169 (design doc), 183–184, 186–209.~~ **Struck 2026-10-08: session 2 did all of it that could be done — see Stage AO, which also lists what was deliberately not built and why.**


### Stage AO — the rest of the 133, session 2 (2026-10-08, branch `phase-18`, **DEPLOYED 2026-10-08 10:44 IST, `dpl_HBW4jkVsCzFJdUuTidwnz7iMXdEJ`** — and **migrations 0029–0049 APPLIED on production the same day**, verified: see HANDOFF)

The tasks below, one commit each (TASK-197/198 share one because they share one migration), on top of Stage AN. **Seven more database updates (0043–0049) were written; ALL are now applied (with 0029–0042)**; every new screen reads its data in a query of its own and says so when its update is missing, so deploying before applying is safe. Extension is now **0.7.0** (the founder reloads it). Scoreboard `npm run parity` (a local file — see Stage AN's correction): **HAS 109 · PARTIAL 13 · MISSING 11** (it was HAS 36 / PARTIAL 55 / MISSING 42 on 2026-10-07). Tests **1,781**, `lint` 0 errors / 23 warnings, typecheck clean, **`next build` green**. Tags: **MEASURED** (a script or a count run this session) · **OBSERVED** (a vendor page read) · **ESTIMATED**.

| Task | What it is | Update | Decisions and measurements worth keeping |
|---|---|---|---|
| 183 | Contacts beyond LinkedIn (own Google/Outlook export, typed-in people) | 0043 | LinkedIn rows still never keep an email — a database check makes that literally true; an address book the candidate uploaded keeps the email because it is theirs |
| 184 | Contact email, lawful form | — | **No address is found or guessed for anyone** (first.last@ is a guess about a person who never gave it; DPDP). Only addresses the employer wrote into the posting (with the words around them) and the candidate's own contacts. A regex took 15 s on 100,000 characters — input capped at 20,000 and quantifiers bounded |
| 185–187 | Popup governor; Ask Saaf (typed cards, **no model**); voice | — | A model-backed chat cannot serve a free product on a shared ~8,000-tokens-a-minute key. Ask Saaf answers a fixed set from the candidate's own rows and says so when it does not understand |
| 189–190 | Profile in five tabs + Download my data; résumé from a LinkedIn ZIP read in the browser | — | Only four of the export's files are read; messages are never opened (a marker string in the test ZIP's messages file never reaches the output) |
| 199, 200, 201, 195 | Feedback + inbox + surveys; experiment platform; install nudges; interview access rules | 0044 | Rules built, enforced nowhere: nothing is for sale. Installable-app manifest; the extension nudge is dormant until the extension has a store URL |
| **197/198** | Credits ledger, wallet, promo codes; referral programme and `/r/<code>` | **0045** | Append-only ledger written only by database functions; a retry cannot pay twice (unique reference). **Referrer paid for at most 20 people — instant email sign-in lets anyone make accounts with any address, so an uncapped reward is farmable the day credits are spendable.** Every price is empty on purpose; the wallet says nothing costs a credit. Student reminders (F-1106) not built: no student benefit exists |
| **194** | Candidate's own answers to employers' custom questions | **0046** | Filled only for the exact question (lower-case, punctuation dropped — never "similar"); a required unanswered question is filed blank for the candidate; Apply for me uses an answer only if ticked; demographic/credential/consent never. The key function exists in the app and the extension and a test fails if they differ |
| **192** | Extension: tailor hand-off, capability list, request-a-site | **0047** | Tailor opens Saaf's own tool prefilled (one-time, 10 min, nothing sent until its button). **Only Greenhouse (23 recognised sites) has a real form captured as a test**; the list says so, and the README's "22 platforms" was wrong (struck) |
| 188 | Fix chips on résumé lines; edit-with-AI on one line; build-a-résumé-in-a-minute | — | Found by opening the page: the first fast-start was a form nested inside the checker's form (invalid HTML, broken hydration) |
| **165** | Phone experience | — | Decided what a phone user can do; first card now fits in the first 600 px. **The browser pane's Mobile preset sizes fixed elements to the pane (the detail sheet looked shifted): check phone layouts in a 375-px iframe** |
| 202, 158, 203 | Landing ticker + `/jobs` public search; role and role-in-city pages; comparison pages, remote hub, data blog, per-role keyword pages | — | **MEASURED 2026-10-08:** 27,882 India roles. **Two defects found by reading pages, fixed:** a title counted as a role if it had the words anywhere (a "Business Development Manager … Product" was a Product Manager); and **`first_seen_at` is one instant for a whole ingest batch (the newest eight rows share a second), so "newest first" by it was arbitrary — public lists now sort by the employer's posted date.** Thin-content guard `MIN_ROLES_TO_INDEX = 5` (founder sets it): on the newest 5,000 roles it admits **39 role pages and 32 role-in-city pages** (N=10: 25 and 14; N=25: 13 and 4). Comparison pages name no rival and pin each number to code |
| **191** | Agent: Off / Suggest (default) / Auto-queue, weekly target, queue and progress cards | **0048** | The agent decides only what goes on the queue; submitting stays Start-gated and rule-bound. Easy-apply roles only |
| 196 | Office hours on the Coaching page | **0049** | No scheduling engine, by decision (coach booking stays each coach's own hosted page). The first coaches and sessions are the founder's |
| 169, 170 | Employer consent model (design only); paid-plan decision page | — | `docs/EMPLOYER-CONSENT.md`: four levels, build Stage 1 (candidate-initiated sharing) first. `docs/PAID-PLAN.md`: floor ≈ $45 / ≈ ₹4,000 a month (**OBSERVED** vendor pages: Vercel Hobby is non-commercial, Pro $20; Supabase Free 500 MB, Pro $25 / 8 GB; Razorpay 2% + GST) — **advertising a paid product needs Pro first** |
| 063, 066, 089 | Old open tasks found to be already built (Cover Letter Studio and Outreach; mock-interview scoring and Ask Saaf; the company panel from Wikidata) | — | Ticked on the evidence of the later tasks, not re-walked |

**Measured and decided NOT to build (each is in ROADMAP with the numbers):**
- **TASK-206 supply growth.** The registry is complete against its candidate pool: 1,539 probed candidates had India roles, 1,398 are boards, the other four are SmartRecruiters boards held on purpose (over 250 India roles each; the three largest — 8,476 / 3,861 / 1,782 — read as staffing-firm bulk). The newest Common Crawl snapshot (CC-MAIN-2026-39) yielded **0** new candidates. More supply needs a new provider adapter (Personio, Breezy are the documented ones; both skew European) or a decision on the four held boards.
- **TASK-209 Abroad mode.** **The `roles` table is India-only by design** (27,882 rows, all `in_india`). The same boards listed **155,737 roles, 18,168 in India** at qualification (2026-09-07) — about 137,600 non-India roles, ~7.6× what is stored; at ~6 KB a role (**ESTIMATED**) that is ≈ 825 MB against a 500 MB free tier. It cannot live on the free database. The DOL H-1B files would need a download I did not make without your say-so.
- **TASK-193** (ATS-API apply): every provider issues the key to the employer only — nothing to point it at. **TASK-204**: no passwords exist to reset; Apple needs the founder's developer account. **TASK-205**: measure abuse first; per-address limits and Vercel's bot protection are in place. **TASK-207/208** wait on the founder approving the consent model.

**Corrections, struck rather than deleted:**
- ~~"2.6% of Indian postings state pay"~~ is not reconciled with the new **MEASURED 0.6%** (25 of a 4,000-description sample spread across the whole table, 2026-10-08); the earlier figure was measured on a different set. The blog quotes only the new, dated, reproducible one (`scripts/blog-measure.ts`). TBD: find why they differ.
- ~~"22 ATS platforms"~~ in the extension README — the extension's own list has **23**.
- A public claim that Saaf "never applies for you" was corrected earlier in the session (commit `b730bc4`).
- `CLAUDE.md`'s architecture counts were re-measured: 22 legacy query sites (was 24), 43 action files (was 11), 35 of 43 re-authenticating, 39 of 43 with a schema, 0 `any` types.

**Unverified, plainly:** the extension on any real page (the preview browser cannot load one) — the form filler, the popup sections, the queue, the tailor hand-off and the service-worker messages are covered by happy-dom tests only; every screen that needs 0043–0049 has been seen only in its "update missing" state; a Google index of any new page; the ISR refresh and in-memory rate limits on a deployed build.

---

### Stage AP — the first ingest after the updates, and what it showed (2026-10-08, branch `phase-18`)

**What ran, on production, at the founder's instruction:** the daily ingest (`runIngest`, 45-minute budget so every board was swept) then the recompute (`recomputeAll`, nine confirmed profiles; 500-result batches). Not `npm run ingest` — that also sends the audit and the email digests.

| Measured 2026-10-08 | Before | After |
|---|---|---|
| Boards fetched OK | — | 1,295 of 1,306 (11 returned HTTP 404 — probably retired boards, registry clean-up candidates; not yet checked one by one) |
| Roles stored (India) | 27,882 | 28,751 (+869 net, 2,938 pruned) |
| Fields filled that were empty before the updates | 0 | reposted 1,998 · work mode 3,005 · contract type 7,619 · pay 146 · **closed 7,014** |

**The finding worth keeping:** 24% of stored roles were taken down by their employer and nothing in the app knew. It is *not* one bad board (859 of 1,348 boards have some; median 23% per large board; 3 boards fully closed). Likely cause (INFERRED, not tested): the cron rotates through boards inside a 52-second budget, so a board can go days unvisited and its stored roles go stale; today's run swept every board at once. Public pages and the candidate match-finder counted them as open. Fixed in TASK-212 (see ROADMAP) — **~~"ingest deletes closed roles"~~ was the assumption in `readPublicJob`'s own comment; in fact the prune deletes 30 days after last seen, so closed roles sat in the index for up to a month.**

**Fix deployed and verified the same day (`dpl_9nDhTkTTnTaJQFHYR4HRyeDDoUqb`):** public counts now 257 (Product Manager) and 865 (remote); taken-down job pages 404; none in the sitemap. The recompute re-run removed every stored match that pointed at a taken-down role: **693 of 3,970 (17%) → 0 of 3,277**. Still open, deliberately: `roles_for_candidates()` itself does not skip closed roles, so on a search matching more than 500 roles they use up slots before the app drops them (~~one-line migration, not written~~ — **migration 0050 written 2026-10-08, tested on a scratch Postgres 16 (500 rows with 100 taken-down before, 500 with 0 after), and APPLIED on production the same evening at the founder's "apply 0050"**: through the live function "product manager" went from 500 rows / 129 taken down to 398 rows / 0 taken down — 27 open roles that the cap had been pushing out now fit).

**Dependency vulnerabilities, looked at 2026-10-08 (read-only; nothing patched).** GitHub's Dependabot lists 3 open alerts (all have a fixed version): `brace-expansion` high, `ip-address` moderate, `dompurify` low. `npm audit` against the same lockfile finds **20** (2 critical, 12 high, 5 moderate, 1 low; 18 of them in the production tree). **None is reachable on the live site, as far as I can tell (INFERRED from reading the code and the advisories, not exploit-tested):** (1) **`next` 16.3.4, critical** — the remote-code-execution flaw needs attacker-controlled text passed into `next/og` `ImageResponse`; Saaf has one maker (`src/lib/og-card.tsx`) called with fixed strings by four static `opengraph-image` files, and `/icons/[size]` allow-lists 192 and 512 before calling it. The two cache advisories do not apply (Pages Router on self-hosted; `use cache` + Draft Mode — 0 uses). Still the framework itself, so **patch to 16.3.8 or newer (16.4.0 is published)**. (2) **`proxy-addr` critical, `ip-address`, `@modelcontextprotocol/sdk`, `ts-morph`, `fast-glob`/`braces`/`micromatch`** — all arrive through `shadcn`, a command-line tool declared under `dependencies` that the app uses only for `@import 'shadcn/tailwind.css'` at build time; no Express server runs on the site. Moving it to `devDependencies` would likely drop most of the production-tree findings (unverified — needs a build). (3) **`brace-expansion`** — build-time glob matching (Sentry bundler, ts-morph); **`source-map-js`** — build-time CSS. (4) **`dompurify`** via `posthog-js` 1.425.1 (1.438.2 is current) — client-side, needs a hook configuration Saaf does not set. (5) **`sharp` 0.35.4 (high)** — `next/image`, one use, default settings (no remote images, no SVG). (6) **`mammoth`** (résumé .docx reader, direct) moderate via `argparse`/`sprintf-js` — a denial-of-service on format strings, probably not fed by file contents (not checked); ⚠️ **`npm audit`'s suggested "fix" is a DOWNGRADE to 0.3.29 — do not follow it blindly.** Proposed order: Next.js first, then `shadcn` → dev, then `posthog-js`; each needs a build, the tests and a deploy.

**PATCHED AND DEPLOYED the same day (TASK-213, `dpl_5G3mTdkJCg5Hbov3CLdM1oMC8Aj7`):** `npm audit` all 20 → **12** (critical 2 → 0), production tree 18 → **3** (moderate, `mammoth`'s `argparse`/`sprintf-js`). The 9 high left are developer tooling whose only offered fixes are breaking; `mammoth`'s "fix" is a downgrade and was refused. ~~"none reachable"~~ stays the assessment, the patch was hygiene. Lesson: a stale `.next/dev/types` folder from an old dev server breaks `next build` locally (4 TS errors in generated files) — delete `.next/dev`, it is regenerated.

**Correction to an earlier number:** pay stated in postings measured **0.6%** on 4,000 sampled postings today against 2.6% earlier; the two samples differ and have not been reconciled — do not quote either as the Indian-market figure.

### Stage AQ — the end-to-end parity audit (2026-10-08, `main`)

**What it was:** all 109 scoreboard rows graded against the competitor's signed-in product (the founder's own Chrome, black-box, nothing saved) and Saaf's live production screens. Full table and evidence in the local file `docs/jobright-map/20-parity-audit.local.md`.

| Grade (2026-10-08) | Rows |
|---|---|
| Match | 50 (46%) |
| Same capability, deliberate lawful form | 11 |
| Partial | 24 |
| Gap | 3 |
| Could not be verified today | 21 |

**Strict parity is therefore 46%, 56% counting the lawful forms** — ~~"109 rows built"~~ meant built to the row's own lawful acceptance, not identical. **Measured defects:** voice input is blocked on production by `vercel.json` (`microphone=()`), so F-203/F-411 were counted as built but do not work live; public job pages omit six Google-recommended JobPosting fields and an `og:image`; browser errors go to Sentry without a tunnel. **Biggest functional gap:** the sentence box searches only the user's ~395 scored roles, not the 21,737 indexed. **A measurement withdrawn:** a "slow detail pane" reading came from timing a background automation tab — the pane's request took 2.8 s once the page ran. Follow-ups are Phase 19 (TASK-214–221). **Done so far:** 214 (microphone, re-measured live), 215 (job-page markup; ~~"baseSalary absent"~~ was only that the sampled role stated no pay; ~~"validThrough missing"~~ is correct to omit when expiry is unknown, per Google). **Found while doing 216:** Sentry rejects the production DSN (`403 … ProjectId`), so error monitoring has recorded nothing — needs the founder's DSN.

### Stage AR — the parity-audit fixes, measured on production (2026-10-08, `main`)

Phase 19 was worked in the order the founder gave: 214 microphone → 215 job-page markup → 216 error tunnel → 217 whole-index search → 218 card gist → 219 filters → 220 freshness. Each was deployed and re-measured on the live site before it was ticked; the numbers are in each task's note in `docs/ROADMAP.md`. ~~Stage AQ's "Done so far: 214, 215"~~ is superseded: **214, 215, 217, 218, 219, 220 are done and live; ~~216 is built and live but not ticked~~** (Sentry refuses the production DSN — `403 … ProjectId`) — **superseded, 216 is done and live (2026-10-08, later):** the cause was that the Sentry project had been re-created (old project id `…0402432`, live `…4269056`); with the new key in Vercel, a browser error in the founder's Chrome reached Sentry through `/api/monitoring` (route 200, upstream 200, issue visible in Sentry). Error monitoring works for the first time since the project was re-created; before that every production error went nowhere. The browser SDK starts only after first interaction or 5 s (TASK-104), so errors in a visit's first seconds are not reported — a standing trade-off, not a fault. **221 is the only task left in Phase 19 and needs the founder** (a saved résumé on the account; the extension loaded in Chrome).

**Decision, TASK-220, against the obvious default: no freshness score bonus.** MEASURED 2026-10-08 on the 3 profiles with stored matches: a +2/+3/+5-point bonus fading over 14–30 days left the median age of the top 20 almost unchanged (43→43/43/31 d, 50→50/49/49, 24→24/22/22) and made the printed scores disagree with the order (2–37 inversions, worst 5 points). Fresh roles already sit in the top 20 in rough proportion to their share of the pool (≤14 days old: 25% / 20% / 40% of the top 20 against 33% / 22% / 27% of the pools). The order stays score → location standing → posting date (TASK-178). Reversible: a +2/14-day bonus is the smallest honest version if the founder wants it. **A claim corrected:** the audit's "0 of 40 cards showed Reposted" was read as a possible wiring fault; it was the 7-day rule working (of 1,998 flagged roles only 818 clear it, and none of the founder's top 40 does). The real gap was that `/today/explore` never drew the chip; that is fixed.

**TASK-221, partly done (2026-10-08 evening) — the founder's own résumés, and what they exposed.** Instruction: 'use the résumés on this laptop; find, recognise and use them'. 185 résumé-named files = 117 distinct; base = `Akshay_Keerthi_Resume_Common.docx`; the rest are per-employer variants under `Desktop/Job_Search`. Used the base .docx and the 'Saaf-only' PDF; saved one résumé to the account without any model rewriting (skills-only path) plus one tailored version. Audit after walking 12 rows (the Word export was added once the founder OK'd a download): **59 of 109 match (54%), 72 of 109 counting lawful forms (66%)**, 9 still unverifiable (8 extension rows, F-1413); PDF export is unverified inside F-508. The exported .docx carries the parser defects into the file the candidate sends to an employer, and drops the header's links. **Real résumés found five defects the synthetic ones never did** (parser misreads company-first two-line layout — current title/employer 'nothing' or swapped; project headers; dropped education bullets; hyphen-only 'rewrites'; saved-searches menu off-screen) — recorded in ROADMAP TASK-221 and filed as follow-ups, not fixed. ~~'Nothing is wrong Saaf-side; the rows just cannot be seen'~~ (the audit's section C) was wrong: they could be seen once a real résumé existed, and the real résumé showed defects. Lesson: test with a real document in the layout real users use.

### Stage AS — the product gets its own domain (2026-10-08, `main`, deployed `dpl_C5BRhVSXKGHguNwRCHrGQF6sezX8`)

**Founder decision:** `jobinko.in` (Hostinger) is the main address; `www` redirects to it; `saaf-ten.vercel.app` keeps working. **Why the bare domain, not www:** shorter to say and print, one canonical form for search engines, and the www form costs one permanent redirect rule. **Why DNS stayed at Hostinger:** one changed `A` record was enough; moving the nameservers to Vercel would have taken the future email records (Resend) into a second place. **Measured:** certificate issued ~10 minutes after the record changed; every canonical, sitemap and robots URL now reads `jobinko.in`. **Not done:** Resend verification (the project's key is send-only and Chrome is not signed in to Resend), so email sign-in still reaches only the founder — TASK-075 stays open. ~~**Naming question, unanswered:** the product is 'Saaf' in every screen, email and file, and the domain is 'jobinko'; nothing was renamed.~~ **Answered the same night — the product is now Jobinko** (founder: 'Saaf no longer required'). Renamed in the app, emails, ingest and extension (`dpl_4zBJWXCGsRzjkCKgsJxKMnGAYTR2`): 307 replacements in 131 files; MEASURED 0 mentions of the old name in the served HTML of 12 public pages and in the signed-in feed's visible text. Kept on purpose: identifiers (`AskSaaf`, `SaafEvent`, `appliedBySaaf`), storage keys `saaf.*`, extension messages `saaf:*`, the iCal UID suffix — changing them would reset stored state or break the extension protocol for no visible gain. **Still named Saaf outside the repo (founder/Supabase/Google):** the Supabase sign-in email templates and sender name, the Google sign-in consent-screen app name, the Resend sender name. **Email DNS (2026-10-08):** `send` and `rsend` CNAMEs, the `resend._domainkey` TXT and a monitor-only `_dmarc` TXT were added in Hostinger; all four resolve from 8.8.8.8, 1.1.1.1 and 9.9.9.9; Resend shows the domain 'Pending' (it re-checks on its own schedule). **Job limits:** measured, plan in ROADMAP TASK-222 — a second, silent ceiling of 1,000 rows per request sits under the 500 constant. **Built later that night (TASK-222, `dpl_G4EkHmpN3Qxa1mufS1NNNAEi33yT`):** the ceiling is now **3,000** matches per person, the 1,000-row cap is paged around everywhere a person's matches are read, recompute has a budget, retry and rotation, and 'New' no longer counts old postings. Founder's feed 395 → 3,000 (of 4,602 that fit); all nine profiles recomputed in 115 s with 0 failures; feed 1.3–1.5 s steady. **Why 3,000 and not unlimited:** each stored match is ~2.9 KB, the database is 184 MB of a 500 MB free tier (about 35 people at 3,000 each), one heavy person takes 10–15 s of nightly work, and three at once hit the database's statement timeout. **Why the founder is still told 'not scored':** 1,602 of his 4,602 matches rank lowest on title; the page says so rather than implying completeness (the standing 'no silent caps' rule). **Email:** jobinko.in verified in Resend 9:03 PM; Supabase sends from `noreply@jobinko.in` as 'Jobinko'; digest emails likewise. **Superseded 2026-10-09:** the ceiling was raised to **5,000** ('raise the job volume to maximum, expect 20 people'); see ROADMAP TASK-222 for the measured capacity (database 217 MB of 500 MB; 20 × 5,000 ≈ 380 MB) and for the fetch/timeout findings. **Sign-in page redesigned the same day** from the founder's reference image (Nas.com): wordmark top-left, bold heading, email first, Continue, 'or', Google with its logo, terms line, accent glow; kept inside the design system (rounded-xl/2xl, token colours) — NOT the reference's pill buttons or light palette, which the design rules forbid; the Google 'G' is a static file because the theme test forbids raw colours in components. **Still off-brand and not fixable in code:** Google's own account chooser shows the Supabase project address ('to continue to …supabase.co') until the consent screen is branded in Google Cloud and/or Supabase's paid custom auth domain is bought. ~~Open decision: raise the ceiling to 5,000~~ **Open decisions (founder):** ~~raise the ceiling to 5,000~~ done (covers his 4,602; ~+6 MB per heavy person, ~+60 s nightly); the four held SmartRecruiters boards (+14.4k jobs, staffing-firm bulk — recommendation: not by default); when to move Supabase to the paid plan. Google sign-in needs no change at Google because its redirect address is Supabase's own callback, not ours; only Supabase's allow-list needed the new origin.

### Stage AT — the founder's last-chance verdict on the product screens, and what was done (2026-10-09, `main`, `dpl_3DD18NHAguFEog8uKcdgHBdLKirS`)

**Founder direction (verbatim goal, restated):** "We are building a Jobright AI for India. Only the colours and the jobs should be different. Rest all should be a ditto of Jobright. Only the ATS score checker is extra." Landing: "text heavy — need more minimalistic clean UI". Tools: delete `/tools`, `/tools/paste-jd`, `/tools/resume-keywords`; keep `/tools/ats-checker`. `/today`: "still cluttered and not even close to the parity you promised … the resume tailoring, styling, nothing is there." This is the standing instruction for the product screens; it overrides earlier "keep the evidence on the card" choices (the reasoning paragraph, the three bars and the line of facts left the card for the job detail — nothing was removed from the product).

**Decisions and why.**
- **Feed = two states, as in the reference** (list in the centre + quiet sidebar; job detail in the centre + AI tools on the right) rather than a list with a side panel. *Trade-off accepted:* the list is hidden while a job is open (kept mounted, scroll restored), so a long list is not re-fetched; phones keep their full-screen sheet.
- **Three AI tools open as drawers from the job**, not as separate pages: the tailor drawer is the reference's 3 steps (see the difference → align → review). The third step is the existing Résumé Studio (accept/dismiss per line, Save as version, Word/PDF), so no tailoring logic was rewritten; `tailorSavedResume` gained a `scope` (summary / experience / skills) that `rewriteResume` already supported.
- **Résumé styling stays typographic and one column.** Font (4 standard families) and accent colour (4) were added; every combination still passes our own checker because the text, order and structure do not change. Tested by opening the .docx XML. *Not* done: columns, sidebars, icons — they would fail the checker the product sells.
- **Landing says one thing.** Every explanation that used to sit on it lives on `/privacy` and `/compare`, one link away.

**Measured (2026-10-09).** Tests 1,871 pass (was 1,866); `tsc` and `eslint` clean; legacy `supabase.from()` sites in `src/app/` stay at **22** (a 23rd that appeared mid-work was moved into `services/job-insight.ts` as `readMinYears`). Production feed for the founder: Recommended **4,602**, New **1,117**, ~~Saved **8**, Applied **9**~~ Saved **0**, Applied **0** (corrected: misread from a low-resolution screenshot). Tailor run on production-grade data: model call 28 s on a full-scope rewrite (Groq returned `json_validate_failed` after 9.3 s, then the fallback answered) — **a slow path worth a look**, not changed.

**Defects found by looking.** (1) The reader swapped company and title on company-first layouts — fixed (TASK-225). (2) The tailor drawer caches its data per job for the life of the page, so a fix to the server needed a page reload before it showed — fine for users, trap for testing. (3) Mobile top bar overflowed with four tabs and counts — tabs trimmed to two, no counts, below 640 px.

**Still open from this verdict.** Saved/Applied as in-feed lists; Explore chat; résumé library/editor parity; Agent rail item; the on-screen résumé preview taking the chosen font/colour; the model path's slow fallback (above).

### Stage AU — the first run rebuilt to the reference product's three screens (2026-10-09, `main`, `dpl_3yEtrsrV2YWBmTcCCzNrXqu3VVxh`)

**Founder direction:** "You wanted to create a new account in Jobright for the complete picture … lets do that." I may not create accounts, so the founder signed up themselves and pasted four screenshots. **OBSERVED (founder's new Jobright account, 2026-10-09, black-box, from their screenshots):** (1) sign-in modal over the landing — Job Seekers | Employers tabs, Google, Apple, email + password, "Sign up now"; (2) `/onboarding-v3/resume-upload` — a split page, copilot avatar + "One last step, let's level up your search by uploading your resume", a circle upload icon, an "Upload" button, "PDF or Word, 10 MB", a privacy note, a "Start Matching" button, Logout top-right; (3) `/matching` — a progress bar, "Scanning your resume for key skills, work history, and education", and a rotating "Feature highlights" card; (4) `/jobs/recommend` with a welcome card over the feed — "We found N roles that fit you best", six experience-level cards (one pre-ticked), an optional LinkedIn URL, "Confirm & See Jobs". **The whole first run is those three steps** — no portals question, no years question, no per-field confirmation, no preference matrix.

**What was built, and what each trade-off cost.**
- **`/start` is one screen** (`src/components/features/first-run.tsx`): upload → scanning (`ScanView`: a bar that creeps toward a ceiling for the stage it is in and reaches 100 only when the answer is back; a line that says which stage; `ScanHighlights`, three slides that describe only shipped features) → profile saved with `confirmProfile` → `/today?welcome=1`. Replaced: portals step, years-first ask, LinkedIn-PDF / from-scratch tabs (the LinkedIn PDF still uploads as a PDF), the reading, confirm-every-field and preferences screens, the "baseline" splash. `/start/upload` now redirects to `/start`.
- **~~Nothing is stored until you confirm every field~~ is gone.** Trade-off: the first match is scored on what the parser read. Mitigations kept: (a) `profileFromRead` (`src/lib/first-run.ts`) saves only when title, employer, city, years AND a target role the index holds postings for are all present — otherwise the person goes to `/start/confirm` with the read pre-filled and the gap named; (b) the welcome card says which years it ticked the level from and links to `/profile`; (c) the privacy page was rewritten to say the fields are saved from the read and editable on `/profile` (it used to promise confirmation before storing — now untrue, so changed).
- **Welcome card** (`welcome-modal.tsx`, `actions/first-run.ts`): six levels, pre-ticked from years (Entry = up to 2, Mid = 3–5, Senior = 6+, Lead 9+, Director 15+); stores the lowest ticked as `profiles.seniority`; optional LinkedIn link validated as a `linkedin.com/in/…` address and stored in `profiles.linkedin_url`, never opened. It scores nothing (neither field feeds the scorer). If every ticked level falls in one of the feed's three filter buckets the feed opens on that filter, as a visible removable chip; otherwise it opens unfiltered. Skipping saves nothing.
- **Measured:** one full first scoring run = **27.3 s for 4,912 matches** on the live database (2026-10-09, `evaluateUser` on the founder's profile, via a throwaway script — not re-run through the UI). The old flow was built when the ceiling was 500; the 5,000 ceiling had never been exercised through a first run. `src/app/(onboarding)/start/layout.tsx` sets `maxDuration = 300` so the platform cannot cut it. **Unverified:** that value actually applies on this Vercel plan.
- **Removed as orphaned by this change:** `getMatchSummary`, `countMatches`, the `OnboardingPrefs` draft type, the onboarding step counter. **Left alone on purpose:** `/start/confirm` (the fallback), the `use-draft` hook, and the `savePreferences` action (used by `/profile`).

**Verification, honestly.** Tests 1,884 pass (was 1,871); `tsc` and `eslint` clean. Looked at in a browser: the upload screen at 1,440 px and 375 px, the scanning screen (rendered from a throwaway preview page, deleted), the welcome card at both widths, "Skip for now" (closes, URL returns to `/today`, nothing saved); on production in the founder's Chrome: `/start` and `/today?welcome=1` render, the card reads "We found 4,602 roles", Skip closes it. **NOT verified: the whole run — upload a résumé → scan → saved → feed — with a brand-new account.** A local attempt (a throwaway user plus a temporary sign-in-as-it route) was refused by the tooling as weakening the dev sign-in, and was not worked around. The first real run is the founder's second-inbox sign-in.

**Seen in the feed behind the card, NOT built (OBSERVED, the rows left):** tabs Recommended | Liked | Applied | External (we have Recommended | New | Saved | Applied); a left rail of Jobs, Resume (with a done-tick), Profile, Agent, Coaching, Interview (NEW); a "Free Plan" row and a dismissable "add LinkedIn for smarter matches" banner on the right; saved filters as "Filters +" with a row and an edit pencil; a "complete these to win 1v1 coaching" progress card (customise your résumé, enable the autofill extension); a student-promo banner in the top bar.

### Stage AV — the résumé customising function, cloned step by step (2026-10-09, `main`)

**Founder direction:** "In the job page, Jobright gives an option to customise the résumé … Here we give add résumé which takes us back to the ATS score checker and never brings back to the resume customising section. Prepare a massive correction. We are going to clone the exact functions from Jobright, step by step until it is completed. Right now I am the customer." Standing: *not even 10%* — satisfaction is measured by whether a new customer can go from sign-up to a tailored, styled, downloaded résumé without leaving the job.

**OBSERVED, read-only, in the founder's signed-in Jobright (2026-10-09; nothing generated, nothing downloaded).** The résumé library lists the primary résumé, named after the uploaded file, and a second one; the editor is inline-editable sections with drag handles, an "Analyze" button and Export. **Export Resume** opens a right drawer, badge "ATS-friendly format": page size (Letter); template cards Standard (Recommended) · Compact · Centered · Structured (+ more); Accent Color (hex + scope "All Headings"); Font — family, Name, Section Headers, Sub-Headers, Body Text sizes; Content Style — date format, bullet icon, Hide Divider; Layout — header alignment (Left/Center/Right), Show Education By (Degree-first / Institution-first), Skills Layout (3); Spacing & Margin — Section, Entry, Line, Top & Bottom, Side margins, Align Text Left & Right; Reset formatting; a live paginated preview ("1/1") and Download Resume. **Their sign-up upload becomes their library's PRIMARY résumé** — which is why their tailor never meets an empty account.

**What was built, with its trade-offs.**
- **The résumé uploaded at sign-up is now KEPT (its text, never the file) and made primary** — a reversal of "nothing is stored until you press Keep" for signed-in customers (the public ATS checker is unchanged: nothing stored without sign-in). Why: it is the only way "Customize your résumé" works on first open, which is what the reference does. Mitigations: said on the upload screen, on the privacy page, and deletable on /résumé. DPDP posture: the file is still read once and dropped.
- **With no saved résumé the drawer takes an upload in place** rather than linking to the checker (`ResumeIntake`).
- **Export drawer** (TASK-228): one style value, one block list, two renderers. The decision that matters: the preview and the Word file cannot disagree because both are loops over `buildDoc()`. PDF is the printed preview, not a PDF writer — chosen because every glyph (₹) survives and nothing has to be kept identical; the cost is the browser's "Save as PDF" step where the reference downloads directly. Adding `pdf-lib` + an embedded font would remove that step and is a dependency decision for the founder.
- **Parser:** "B.Tech, Computer Science, VIT Vellore, 2019" is one qualification and a school; `isProject` survives the schemas.

**~~Gaps still open~~ Step 3 is built (TASK-229, same day):** the rewrite is now APPLIED AT ONCE and the person undoes and edits — a reversal of the studio's earlier rule that nothing is applied until accepted. What keeps it honest: the fabrication guard runs before anything is shown, what it refused is listed, every changed line is marked on the page and has Undo, and the score is the free checker's, re-run on each edit. **Still open from the reference (OBSERVED 2026-10-07, `docs/jobright-map/02-ui-and-flows.local.md` §B8/B8b):** step 3 is a two-pane screen — left: "Your score jumped from 4.5 to 7", a "See what's changed" list and tabs AI Rewrite · Editor · Style; right: the rendered résumé with changes highlighted, a file-name pill, Fit to one page, Download, Apply now — and the tailored copy is stored per job (not in the library). Step 1 has an Industry Experience row and an under-6.0 warning; step 2 has Projects and keywords grouped Functional Skills / Tools with Select all. The résumé library has five slots, PRIMARY and an Analysis report. **Not yet built here.**

### Stage AW — the founder's "take control of the PC, test and complete yourselves" (2026-10-09 night)

**What was authorised, and what still was not possible.** The founder asked me to test the new-customer path myself. I connected to the second Chrome (Browser 1: a clean profile, signed OUT of Jobinko) and stopped there: creating an account — or signing in to one through Google or an email — is an action I may not take, whoever asks (the test-account exception covers a local app that talks only to local services; this one signs in through Supabase and Google). The sign-in is the founder's one click. Everything else was done through the signed-in browser (Browser 2) and the local app on the founder's account.

**Built and applied (all LIVE).** TASK-230 library + editor (+ the end-to-end walk above), TASK-231 `tailored_resumes` (**migration 0051 applied to production by the Supabase editor, verified by script**), TASK-232 steps 1–2. The résumé library replaces a page that explained what was stored; the reasoning moved to where each promise is made (the upload dialog, /privacy).
- **Decision recorded:** "Tailored copies are not library résumés." The library keeps the person's own résumés (ten slots); a tailored copy lives per job (cap 200), so a week of tailoring cannot evict a base résumé — which the old 'Save as version' path (replace-the-oldest beyond ten) could have done.
- **Decision recorded:** keywords chosen in step 2 steer the rewrite but do not relax the guard. The reference lets a person tick keywords; here a ticked term is worked in only where a line already supports it, and the result screen says so.

**Still unverified (and why).** The brand-new-account path end to end (sign-up → upload → feed → customise): the pieces are each tested and walked on the founder's account, but the empty-account states can only be seen by a new account, and I cannot create or sign in to one. **Founder-only test:** sign in once in Browser 1 (or any browser) with the second email; I take it from there.

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

### Stage AX — the Profile page rebuilt to the reference's layout (2026-10-11)

**Request (founder, 2026-10-11):** "Access and reverse engineer this format on to our profile section. Keep it the exact same" — a Simplify profile link. The link is private (it redirects to login); the founder signed in in their own Chrome and the page, its Personal Info and Job Preferences views and the edit panels were read there. **Nothing was signed in by me; nothing was saved or changed on Simplify** (every edit panel was opened and cancelled).

**What was built (TASK-233).** Left column + three views + a card per section + right-hand edit panels, from our tokens (no Simplify colours, logos or wording copied). Decisions worth keeping:
- **No second copy of a career.** Work experience, projects and education are the *primary saved résumé*; the page reads and writes it (`lib/profile-entries.ts`). The consequence — measured on the founder's account — is that a badly parsed old résumé now shows on the profile ("Go-to-Market & Growth … Bangalore" as an employer). It is the old reader's output, fixable in the edit panel or by re-uploading; it is not a new bug.
- **A heart is a keyword.** The reference's "skills you'd prefer to use" has no effect we can verify there; here a hearted skill is written into `keywords`, which the scorer already treats as a boost and never a filter. Otherwise it would be a control that does nothing.
- **Honest about what moves the list.** Role, skills, city, years and pay floor change matches; values, company size, industries, skills-to-avoid, employment type and hidden companies are stored (migration 0052, one jsonb) and say so on the page. 'Hide companies' is NOT applied to the feed yet and the card says so.
- **Not built, on purpose:** the paid upsell (no plan exists — Stage AK), a working "show profile to recruiters" switch (the employer side is not approved — `docs/EMPLOYER-CONSENT.md`; the card shows it off and locked, and says nobody can find you), the extension banner until a store URL exists (`NEXT_PUBLIC_EXTENSION_URL` is empty), the US security-clearance question.
- **Zod 4 re-applies field defaults under `.partial()`** (measured: `{a:'1'}` → `{a:'1', b:[]}`). A partial save of the extras would have blanked every answer it did not mention; `saveProfileExtras` keeps only the keys actually sent.
- Dev sign-in note: stale `sb-…-auth-token` cookies on `localhost` make `/api/dev-signin` look broken ("Refresh Token Not Found"); clear them and it works. Two tabs sharing one dev session also fight each other.

### Stage AY — a customer's two bug reports on the new Profile (2026-10-11)

**Reported:** "add a keyword" did not work; selecting two roles (Account Manager + Customer Success Manager) showed one. **Both were my design, shipped the same day (TASK-233), not old bugs.** Role: a single-choice box above a second box — a second pick in the first box replaces the first, which is what a person naturally does. Keyword: no keyword control existed on the new page; and the old one dropped a word that was typed but never added. Fixed in TASK-234. **Lesson kept:** a multi-select must be ONE list that every pick appends to; and any "type then add" box must commit what is typed when focus leaves it, because the next click is usually Save. Related unfixed (not reported): the first-run confirm screen offers only a single role.

### Stage AZ — the extension, rebuilt toward the reference's shape (2026-10-11)

**Request:** after installing 0.7.0 the founder said "it is not what I expected", and asked for Jobright's extension to be understood end to end (what data, how it reads a page, autofill, attaching a résumé, tailoring from the extension, saving a job) and "cloned" so it can be rebranded.

**Decisions.** (1) **Not a copy.** Jobright's terms forbid reverse-engineering and claim their code and designs; a Simplify extension was refused the same way earlier in the day. What is built is Jobinko's own code that does the same *jobs* (functionality is not theirs to own; their code is). (2) **The extension could not be watched running** — it is a toolbar/side-panel UI outside the browser tools, and an earlier safety check blocked opening a real application form; the spec therefore rests on public sources and is tagged OBSERVED/CLAIMED, never MEASURED (docs/jobright-map/13). (3) **What was wrong with 0.7.0, measured not guessed:** it held no login — a saved job waited in the extension until a Jobinko tab happened to be open, and the résumé file had to be uploaded by hand in the popup. Those two are why a first test felt broken.

**Measured facts worth keeping.** In Chromium, the extension's background code reuses the site's login cookie when `host_permissions` covers the site (signed in → 200; `credentials: omit` → redirect). Its POST carries `Origin: chrome-extension://<id>`; its GET carries **no Origin** but `Sec-Fetch-Site: none`. A web page can forge neither, so the gate accepts Origin = the extension, or no Origin plus `none`, together with a custom header a page cannot send cross-origin. Chrome 137+ removed `--load-extension` from branded Chrome; Playwright's Chromium still loads unpacked extensions (the harness in `scripts/extension-e2e/`).

**A claim retracted.** Midway I said the manifest only allowed `localhost` to message the extension and that this "was probably the cause". That came from a printout where my own filter had hidden the `https://` lines. The manifest already lists jobinko.in; the assertion before the edit stopped any change. The cause stated above is the measured one.

**Built:** see TASK-237. **Not built:** Insider connections, the "1-Click Improvement" gauge, an industry-experience chip.

### Stage BA — questions for the candidate, and Workday (2026-10-12)

**Request:** after installing 0.11.0 the founder said it was good, but (a) the extension never asks the candidate the questions a form asks, so that information is missing from the autofill, and (b) Autofill cannot apply to a Workday job (Alteryx, Customer Success Manager).

**Reproduced on the real Alteryx page (Chromium, 2026-10-12):** Apply is a button that renders late; pressing it opens a pop-up with 'Apply Manually'; that leads to a Create Account page. The old build stopped at the first step (no Apply found in time) and, once on Create Account, offered 'Ready to submit?'. Fixes: debounced 5-minute observer for late buttons, 'Apply Manually' accepted, `data-automation-id` and `data-testid` read as field signals, submit prompt gated on `SaafAccount.kind`.

**Decisions.** (1) Questions are asked only for what the person can truthfully answer once — free text, yes/no, dropdown, when required and unanswered. Gender, caste, disability, veteran, credentials, consent boxes and files are never listed (they stay the person's, or come from their own saved self-ID answers, which is existing behaviour: the founder's saved gender was filled in the test). (2) Answers saved from the panel are `auto: false` — Apply for me never uses them until the person opts in on the Profile page. (3) A saved answer now also fills dropdowns and radios; before, the bank only fed text boxes.

**Honest limits.** No Workday account was created (the rule is that the person makes accounts), so My Information, My Experience, Application Questions, Voluntary Disclosures and Review are untested; Workday's custom (non-native) dropdowns are not asked about. **Lesson:** my first cleanup marker did not match how the bank normalises text ('e2e-test' became 'e2e test'), so the first run reported 'left: 0' while saving nothing — a cleanup count is only evidence if the marker was seen to match; the test now asserts three rows were stored before cleaning.

**Built:** see TASK-241.

### Stage BB — the profile collects what Jobright collects (2026-10-12)

**Request (founder, after 0.12.0):** keep Simplify's profile format, but collect every detail Jobright collects, edit it in pop-ups with tap-to-pick choices, and take Jobright's dropdown options.

**OBSERVED 2026-10-12 in the founder's signed-in Chrome (`jobright.ai/jobs/profile`, read-only; every pop-up closed unsaved):** tabs Personal · Education · Work Experience · Skills · Equal Employment. *Personal pop-up:* first, middle, last name; email; phone type (Home, Mobile, Work, Other) and phone with country code; address line; country/region; state/province; city; county; postal code; LinkedIn, GitHub, portfolio URLs. *Education:* school, major, degree type, GPA, start, end, 'I currently study here'. *Work:* job title, company, job type (Full-time, Contract, Part-time, Internship), location, start, end, 'I currently work here', experience summary, description bullets. *Employment (Equal Employment) pop-up:* authorised to work in the US (Yes/No); sponsorship (Yes/No); disability, veteran, LGBTQ+, Hispanic or Latino (Yes/No/Decline to state); gender (Male, Female, Non-Binary, Decline); race (American Indian or Alaskan Native, Asian, Black or African American, Hispanic or Latino, White, Native Hawaiian or Other Pacific Islander, Two or More Races, Decline); sexual orientation, multi-select (Asexual, Bisexual, Gay, Heterosexual, Lesbian, Pansexual, Queer, I prefer to self-describe, Decline); pronouns (He/Him, She/Her, They/Them, Other, Prefer not to say). Header line: 'Updates to your profile will be synced to Autofill Information for future applications.'

**Decisions.** (1) Option LISTS are facts (standard US EEO wording) and are used as-is; Jobright's layout, copy and styling are not copied — the Simplify-shaped cards and drawers stay. (2) 'Decline to state' is not a stored value; it is the absence of an answer, which the autofill never fills — the same rule as before. (3) Jobright asks about the US; Jobinko is India-first, so legal-to-work and sponsorship are stored as answers about INDIA, and the extension refuses to give them to a question that names another country (US/UK/EU/Canada/…); that question goes to 'Questions for you' and the person's answer is saved against its exact wording. Without this rule the new profile fields would have answered 'Are you authorised to work in the US?' with the Indian 'yes' — found while reading the existing yes/no matcher, which had no country check at all. (4) New fields live in the existing `profile_extras` jsonb: no database update needed. (5) Orientation stays single-choice (forms take one). (6) GPA and Experience Summary are NOT added — they sit inside the résumé record, so adding them changes the résumé model; offered as a separate task.

**Limits.** Saving through the new pop-ups was not exercised against the real database (the founder's profile was not touched); the new address fields were tested on plain forms, not on Workday's own field names.

**Built:** see TASK-242.

### Stage BC — GPA, Experience Summary, and "mandatory only where Jobright's is" (2026-10-12)

**OBSERVED 2026-10-12 in the founder's Chrome (red stars in Jobright's pop-ups):** Personal — First, Last, Email, Phone, Address line, Country/Region, State/Province, City, Postal code, LinkedIn URL. Education — School, Major, Degree type. Work — Job title, Company, Job type. Employment — authorised to work, sponsorship, disability, veteran, gender, LGBTQ+, race, Hispanic/Latino, orientation (pronouns carries no star). Not starred: middle name, phone type, county, GitHub, portfolio, GPA, dates, location, experience summary, description.

**Decisions.** (1) Mandatory means *mandatory to save that pop-up*; it never blocks using the product (the standing rule is never to gate a user out). (2) 'Decline to state' must count as an answer for a required question, so it is now stored (`decline`) rather than being the absence of a key; the extension strips it on sync and ignores it if it ever sees one — a declined question is left blank, exactly as before. Optional questions keep the old meaning: Decline = clear. (3) GPA, Major and Experience Summary are optional fields on the résumé record, never printed — the résumé's text, export and ATS score are untouched. (4) Work authorisation and sponsorship are Yes/No only (Jobright offers no decline for them); Jobinko's own 'willing to relocate' stays optional. (5) Existing entries saved before these rules (no job type, no major) will ask for it the next time they are edited; nothing is rewritten in bulk.

**Found, not fixed:** the résumé reader stored the founder's education with school and degree swapped ('MBA' as the school name). Tracked as a separate task.

**Built:** see TASK-243.

### Stage BD — the school/degree swap (2026-10-12)

**MEASURED on the founder's own résumé (`Akshay_Keerthi_Resume_Common.docx`):** lines are 'IIM Sambalpur (…)<tab>2023 - 2025' then 'MBA, General Management<tab>Sambalpur, India'. Before the fix the reader returned 4 entries (qualification = the school, institution null; then qualification 'MBA', institution 'General Management<tab>Sambalpur'). After: 2 entries — MBA, General Management @ IIM Sambalpur (2023 - 2025); B.Tech, Mechanical Engineering @ College of Engineering Muttathara (2017 - 2021). The ATS benchmark (26 documents, mean 82.4) is unchanged. **Why it was missed:** the existing education tests all use degree-first lines; the school-first layout is the common Indian one and had no fixture. **Not changed:** already-saved résumés are not re-read — a saved résumé keeps its entries until it is re-uploaded or edited. See TASK-244.

**2026-10-12, later — the founder's saved résumé corrected (approved in chat).** Re-reading the SAVED text could not repair it: the saved body is generated from the already-swapped entries ('IIM Sambalpur (…), MBA, 2023 – 2025'), which carries no field of study. The source of truth was the founder's original file, so school, degree and field were taken from it and the saved dates kept; `major` was set to the field. Only `sections.education` of the primary résumé was written; read back from the database and checked on the live page. Lesson: a saved résumé's text is a derived copy — repair from the original, not from the copy.

**2026-10-12, same night — the tailored résumé too.** The second saved résumé ('Tailored — Anthropic Fellows Program, AI Safety & Security', not the main one) carried the same swap and was corrected the same way (founder-approved): only `sections.education`, from the original file, dates kept, read back from the database. Any other tailored résumé made BEFORE the reader fix (TASK-244) from a school-first résumé would carry the swap too; new ones will not.

### Stage BE — one saved password, one-click account creation (2026-10-12)

**Request (founder, critical):** the extension must ask for a permanent password once, then fill email + password on every account page so creating an account is one click — 'the same as Jobright'.

~~**Decision 2026-10-12 morning:** email-only login helper — the extension never writes, generates, reads or stores a password.~~ **Reversed the same day by the founder.** It went wrong in between because I answered 'one click' with a weaker thing (a generated password shown for copying) instead of the design he described; he had to say it twice. The permission checker also blocked the first two attempts as 'Unauthorized Persistence' — both times because the feature stores a password; the third, after the founder spelled the design out, went through.

**Design and its limits.** (1) The password lives in `chrome.storage.local` on that browser only — not `sync`, never sent to Jobinko or any server (a test watches every network request). Reason for local-only: Jobinko holding the keys to a person's employer accounts would turn a breach of Jobinko into a breach of all of them. (2) Stored in plain form inside the extension's own storage — as safe as the person's browser profile, no safer; anyone with that profile could read it. That is the price of 'no master password to type', which is what makes it one click. (3) One password reused across sites is the real risk; the panel says so where it is set. (4) A password that most sites would reject (under 10 characters, or missing a class) is refused when saved, so the person is not stranded on the first form. (5) The site's agreement box is never ticked for the person; the button waits for them. (6) A CAPTCHA or a 'verify your email' step is theirs.

**Not verified:** Workday's real Create Account button (it is drawn as a div with role=button; the code finds that shape and is tested on one, but no real account was created); the steps after sign-in.

**Built:** see TASK-245.

### Stage BF — account creation, rebuilt from what Jobright was seen to do (2026-10-12)

**What the founder asked (critical, 'last chance'):** access his browser tab with the Jobright extension, take screenshots, recreate ours accordingly, 'use the exact UI as Jobright's'.

**Method and limits.** Black-box only: his browser, screenshots, clicking the panel and pop-up open and reading them. No reading of Jobright's scripts (its terms forbid reverse-engineering), no pressing 'Account Creation & Autofill' (that would create a real account — I do not create accounts), nothing typed into Jobright's password box. So what is KNOWN is the screens above; what is INFERRED is that its one button then fills and presses the site's own button. The founder's own tab (a Create Account page) was not in the set of tabs I can drive; an equivalent tab on the same job was used and the founder's screenshot of his tab was read.

**Corrections (struck through, not deleted).** ~~'0.15.0 asks for a password once on the Create Account page and fills it'~~ — that shipped and still left him stuck: the first-time form was cramped, the rules were one line of small text, and 11 characters failed a 12-character rule silently-ish. ~~Rule: 10+ characters~~ → 12+, matching what Jobright showed. ~~'Never ticks an agreement box'~~ → off by default, on only by the person's own switch.

**Decisions.** (1) Pop-up not panel box: the password is set where Jobright puts it, before the site. (2) The agreement-box tick is an advance, visible, revocable choice, limited to boxes that are required or say agree/acknowledge/terms/privacy — a marketing box is never ticked or waited on. (3) Everything else in the one-click path is unchanged: local storage only, never `sync`, never sent anywhere (a test watches every request).

**Lesson.** Twice I built the smaller thing the checker would allow instead of the thing described, and once I guessed the flow instead of looking at the competitor. When a screen is the spec, look at the screen first.

**Built:** see TASK-246.

### Stage BG — the Jobright extension audited end to end, and what matches (2026-10-12)

**Request (founder):** 'make sure you have cloned the Jobright extension end to end — all functions and UI — then tell me.' **Answer, honestly: not a literal clone, and it cannot be certified as one.** Reasons: Jobright's terms forbid reverse-engineering and copying its code, text and graphics, so the method is black-box (its screens, clicked open in the founder's own browser); some functions create real things (an account, a résumé, an application, a cover letter) and I do not press those, so their behaviour after the press is INFERRED, not seen; and a few functions belong to Jobright's business (credits, upgrade, promo) and have no Jobinko equivalent.

**Audit method.** Founder's browser, a Workday job (Alteryx), Jobright's panel on the job page and on the Create Account page, its Settings, its résumé picker and every tab of its 'Your Autofill information' pop-up — screenshots saved in the session, read-only.

**Parity table (2026-10-12, Jobinko 0.17.0).**
| Jobright (OBSERVED) | Jobinko | Status |
|---|---|---|
| Docked panel, collapse, header Feedback/gear | Docked panel, collapse, gear | Built (no Feedback button) |
| One button 'Account Creation & Autofill' | Same label once a password is saved; does account step then fill | Built |
| 'Your Autofill Information' pop-up, 7 sections, Update | Same shell and sections | Built — Sign-up Information + Preference (pay) editable; Personal, Education, Work, Skill, Equal Employment are VIEW-only here (edit on Jobinko) |
| Sign-up Information: email, password + eye, live 12-char rules, local-storage note | Same | Built, verified (test page; Workday elements found by dry run) |
| Settings: Autofill After Page Turn, Default Plugin View, Save | Same, default Automatically/Expanded | Built, verified |
| Autofill after page turn on later steps | Automatic on single-page steps and full loads | Built, verified on a fake two-step application; NOT yet on a real Workday step |
| 'View & Select Your Resume': list, PRIMARY, without resume, preview, Download, Continue | Same except 'Choose version' | Built, verified |
| Generate Custom Resume | 'Tailor résumé for this job' | Equivalent |
| Upload Cover Letter / Generate Cover Letter | — | NOT built in the extension (the website has a cover-letter tool) |
| Add This Job In One Click | Save job + match + Tailor (separate buttons) | Equivalent, not identical |
| Credits meter, 'Get Unlimited', Turbo promo | — | Not applicable (no paid plan) |
| Pop-up: 'Automatically update Autofill information' toggle; 'Anything else we should know?' | — | NOT built |
| Application dashboard (Required/Optional, % complete), progress drawer | Built 0.8.1 | Built |
| Insider connections, match chips | — | NOT built |

**Corrections (struck through).** ~~'0.16.0 has Jobright's UI'~~ — it had the Sign-up screen only; the Settings, résumé picker and data tabs were not there until 0.17.0. **Lesson:** I asserted parity from one screen. Parity is a table of screens, and only the observed ones count.

**Built:** see TASK-247.

### Stage BH — the pop-up becomes editable; cover letters (2026-10-12)

**Parity table, updated (from Stage BG):** ~~Personal/Education/Work/Skill/Equal Employment VIEW-only~~ → **editable** (0.18.0). ~~Cover letter NOT built~~ → **built**: Generate / edit / Download / Use, filled into a cover-letter box or attached to a cover-letter upload. ~~'Anything else we should know?' NOT built~~ → **built** (notes the person can insert beside free-text questions; deliberately not auto-filled — a free-text answer is the person's, and an auto-pasted note would be the 'pre-filled why do you want to work here' failure the filler exists to avoid). **Still not the same as Jobright:** the 'Automatically update Autofill information' toggle, 'Choose version', credits/upgrade, Feedback button, 'Add This Job In One Click' as one button, insider connections, match chips — and what Jobright's account button does after it is pressed (never pressed).

**Decisions.** (1) The extension edits through a GATE in front of the website's actions, not new write logic — one set of rules; a bug fixed on the Profile page is fixed in the pop-up. (2) A letter with an unfilled [Blank] is never usable: the panel names the blank and keeps 'Use this letter' off. (3) A letter reaches a form only after the person pressed 'Use this letter' for that page; an unapproved draft never does. (4) The pop-up's saves were not exercised against the real database in testing (the founder's profile is the real one) — they were stubbed and the exact requests asserted; the actions behind them are the website's. **Lesson:** the first cover-letter draft had `[Role]` and `[Company]` in it — the writer's fallback is a template for a person to fill, and only running it showed that the extension, which knows those facts, has to fill them.

**Built:** see TASK-248.

### Stage BI — the pop-up that opened off-screen (2026-10-12)

**Defect, shipped in 0.16.0–0.18.0 (three releases):** each pop-up inherited the panel's 380 px width through a shared CSS rule, so it was a 380 px strip with a 1,056 px card spilling off the left edge; with Jobright's panel present (ours docks left) the half-hidden card sat on top of the page. Fixed in 0.18.1 (TASK-249). The founder found it; my tests did not, and I had not looked at my own screens.

**Correction (struck through).** ~~'Verified in real Chromium … the pop-up shows your corrected education'~~ — the data was right and the pop-up was unusable; text in a hidden box still passes a text check. **Rule from now on for this extension: a screen is verified when it has been measured against the viewport AND a screenshot of it has been read** — in both dock positions. `popup-visual.mjs` does the first; the second is a person (or me) looking.


### Stage BJ — the panel follows the page (2026-10-12)

**Defect (0.16–0.18.2):** the panel's idea of 'what page is this' was taken once at open, then refreshed only by DOM-change events for five minutes, and ignored while it was busy. On a single-page site that left it describing a page that no longer existed. **Rule from now on:** page-dependent UI (account box, button wording, job card, form support) is derived from the CURRENT page on a timer as well as on events, and a change of address rebuilds the panel. **How it was found:** the first fix came from reasoning about the five-minute cutoff; the second — the more damaging — only appeared when the real Alteryx flow was run with a timeline of the panel's state every few seconds. Reasoning found half of it; running the real thing found the rest.

**Built:** see TASK-251.

### Stage BK — web-component application forms (2026-10-12)

**Finding (OBSERVED in the founder's browser, SmartRecruiters one-click page):** `document.querySelectorAll('input,textarea,select')` returns 0; the same search through 34 shadow roots returns 11. SmartRecruiters' own components carry the label as an attribute on the OUTER component (`label="First name"`, `autocomplete="given-name"`, `required`), the City box is a real combobox (`role=combobox`, listbox popup), the phone has a hidden country-search input, and there are two drop zones (`apply-with-resume-container`, a résumé reader; `resume-upload`, the required one). **Decision:** make 'where are the fields' a shared question answered once (`deepAll`) rather than a SmartRecruiters special case — Shadow-DOM form libraries are spreading, and every site built on them was invisible to the extension. **Not done:** closed shadow roots (a page can hide a component from every extension; nothing can be done); SmartRecruiters' multi-part sections further down (Experience/Education repeaters, custom questions) — their component shapes were not seen. **Honest gap:** the real page could not be driven in my test browser (blank page for automation), so the proof is a faithful copy plus the structure read from the real tab.

**Built:** see TASK-252.

### Stage BL — the City box that stalled Autofill (2026-10-12)

**Finding:** the old picker (a) waited a fixed ~0.8 s, (b) accepted only an exact or a single partial match, (c) had no keyboard fallback, (d) was not isolated — one hanging/throwing widget froze the run. "Bengaluru" against ["Bengaluru, Karnataka, India", "Bengaluru Rural…"] was refused as ambiguous; "Bangalore" never matched.
**Decision (founder, 2026-10-12):** for dropdowns and type-aheads choose the closest option; if nothing fits, skip and move on. This **reverses** the earlier rule "never guess between two matching options" for *places only* (city/state/country/preferred locations, bar 58/100); other questions keep the stricter bar (72), and yes/no, numeric and demographic answers are unchanged.
**Ranking rule:** score by what the option *is* (first comma-part equals the wanted place = 92), then prefer the option in the person's own state/country, then the shorter text. Ties between equal candidates take the first listed.
**Isolation rule:** every field is in its own try/catch and the type-ahead has a 12 s ceiling; whatever fails is left empty and reported, never half-typed.
**Measured (2026-10-12):** `city-picker.mjs` 13/13 in real Chromium (normal list 0.7 s, slow 1.6 s, click-ignoring, never-answers 4.5 s total, throws 1 s). Unverified on the real SmartRecruiters page.

### Stage BM — why 0.18.5 did not fix the City box (2026-10-12)

**~~0.18.5 solved it~~ — it did not.** It was proven only against a mock I wrote from a *guess* at the real list's markup. The founder reported 'same issue'; I then drove the real page in their Chrome tab (OBSERVED, not inferred).
**Observed on the real SmartRecruiters page:** City list rows are `spl-select-option` (no role) inside `div[role=listbox]` with the text in light DOM; the last row is a 'Cannot find your city? Click here to fill in manually' link; clicking a row (host or inner `spl-dropdown-item`) does nothing; ArrowDown + Enter on the input commits ('Bengaluru, Karnataka, India', `aria-expanded` false); a script's bare value change leaves the component's own copy stale and the next write is appended ('BengalooruBeng'); `execCommand('insertText')` over a selection types cleanly and the phone component then reformats ('86063 66187', host value `{country:'IN', internationalFormat:'+918606366187'}`, `ng-valid`). Phone field host `spl-phone-field` carries `label`, `autocomplete=tel`, `required`.
**Rule (lesson):** a mock is only evidence for the shape it copies. For any third-party widget read the live DOM first; the mock must fail on the old code (negative control) — this one now does.
**Decision:** inside web components, text goes in as a genuine edit (insert-text command, then change + blur); plain light-DOM fields keep the proven native-setter path (React).
**Not measured:** the packaged 0.18.6 extension running on the real page — needs the founder's reload.

### Stage BN — résumé parsing evaluated, rebuild planned (2026-10-14)

**Founder direction:** evaluate the résumé parser; deliver an architecture and an evaluation framework that fill the profile (title, company, experience, education, skills, summary, certifications) with the least manual effort; zero hallucination.

**MEASURED 2026-10-14** (`resumeFacts` over the 26 documents in `bench/corpus/`; coverage, not accuracy — no field-level labels exist yet): 2 of 26 yield under 50 characters of text (cause undiagnosed); current title and employer found in 17 of 26; years in 22 of 26; 11 of 82 experience entries have no dates; 12 of 82 lack a title or employer; 5 of 26 have no skills from rules alone.

**Decisions recorded (recommendations, founder to confirm):** stay in TypeScript for the request path (Docling/Unstructured/Marker are Python and heavy; PyMuPDF is AGPL and Marker's licence is restrictive — CLAIMED, verify); aim for zero WRONG values with abstention, not "complete accuracy"; model reads and cites line numbers, code verifies and computes; experience = union of intervals, month-inclusive, internships reported separately; OCR option A (in-app) first because option C (vision model) would send contact details out, breaking the stripped-contacts promise.

**Open gaps found:** experience is this-year minus earliest-start-year in whole years (`extract.ts` `readYears`); 15-city whitelist; mammoth skips text boxes (CLAIMED); only five fields reach the model; no certifications field; the fabrication guard covers rewrites, not reads.

**Founder directive 2026-10-15 (supersedes the open decisions):** OCR must be local — no scanned file may go to a hosted model; internships/fellowships/short academic projects are excluded from the headline experience and stored in their own array; run on a local Indian volunteer corpus; produce a side-by-side audit sheet for the founder's 9 résumés. **Decided: OCR option A; internships excluded.** (Volunteer corpus: `tests/fixtures/resumes/indian_volunteers/` was asserted to hold files and does **not exist / is empty — 0 documents**. Nothing was invented.)

**Built 2026-10-15 (engine only — NOT wired into `parse-resume.ts`, so no user sees it yet):** `src/lib/parse/engine.ts` (layout-aware text → local OCR when the text layer is missing/garbled → sections → date arithmetic in code → current/latest role), `experience.ts` (dates, month-set union, gaps, current-role rules), `ocr.ts` (Tesseract.js WASM + bundled English data + `@napi-rs/canvas`; new dependencies `tesseract.js`, `@tesseract.js-data/eng`, `@napi-rs/canvas`), `src/lib/types/parsed-resume.ts` (Zod, enforced on every result), `scripts/run-audit.ts` (`npm run audit:parse`), `scripts/make-scanned-fixtures.ts` (`npm run audit:fixtures`). Reports go to `output/reports/` (git-ignored — real people's data).

**MEASURED 2026-10-15** (`npm run audit:parse`, deterministic, 29 documents): 29/29 parse, 0 crashes; OCR used on 5 PDFs — 3 synthetic scans and the 2 public samples that have **0 characters of text because they were made with 'Microsoft: Print To PDF'** (the undiagnosed 2-of-26 above; today's live upload turns these away with 'we couldn't find any text'); professional entries with usable dates 66/75 (88%); with title and employer 62/75 (83%); internships kept out of the headline: 11 entries, **0 leaks**; layout-collision suspects 0. **Hand-checked answers:** 88 months on the 3 synthetic layouts and on their 3 OCR'd scans, 39 on `rohan.pdf`/`.docx`. These are coverage numbers plus 9 hand-verified documents, not accuracy: value-level ground truth is still TASK-255/268.

**Defects found by looking, fixed:** (1) `rohan` — no 'Experience' heading — read 0 roles (0 months; should be 39): headingless fallback added. (2) Tesseract read a two-column scan straight across the gutter ('SKILLS Mar 2022 – Present'): word boxes now go through the same column detector as text PDFs (`layout.ts buildPage`). (3) Tesseract drops the dash in 'Mar 2022 – Present', and the section parser then took '2022' as the whole date: dash restored on OCR text only. (4) A merged 700-character 'bullet' crashed the schema (`uw-law.pdf`): long strings are now cut, not rejected.

**Defects found, NOT fixed (visible in the founder's pilot sheet; in `sections.ts`, pre-existing):** a title split at the first comma inside brackets ('Private Banking Manager (Relationship Manager' — the rest lost) in the older 'real-1/2' variants; a side venture ('Mind Customs', year-only '2026') read as a job with no employer and, on a tie, as the latest role; project headers whose title/employer are swapped ('GenAI Website Generation Agent' / 'WebCraft AI'). Year-only point dates count as 1 month.

**Not done from the blueprint:** DOCX text-box reader, magic-byte sniffing, `.doc`/image upload counters, line IDs, the verifier, taxonomy import, the 100-résumé golden set and its metrics, shadow mode. Plan: `docs/RESUME-PARSING-BLUEPRINT.md`; tasks: ROADMAP Phase 20.

**Round 2 — audit, cross-check and hardening (2026-10-15, later).** Founder: 'audit, test and cross-check yourselves, then improve every nook and corner.'

**How the engine was cross-checked (each independent of the code it checks):**
- *Fuzz vs a second algorithm* (`experience.fuzz.test.ts`): 4,000 random ranges rendered in 12 written styles must read back to the generating month; 2,000 single ranges and 1,500 random unions must equal closed-form arithmetic and a merged-interval sum. It found two real bugs in the first run: `Jan 15, 2021` read as January **2015** (a day taken for a year — silently +6 years of experience) and `2019 – 21` lost its end.
- *Old parser vs new, 26 documents:* the old 'years' (this year − earliest start year) counted the founder's 28-month MBA as experience: **old 4, new 2.3** on the current résumé (10 + 17 months). Where dates are placeholders (`June 20xx`) the engine returned 0 — a lie; it now returns `total_experience_basis = stated | unknown`.
- *Stress corpus with declared answers* (`bench/make-stress.ts`): 24 invented careers × 5 layouts (single-column PDF, two-column PDF, plain Word, Word table columns, Word text-box sidebar) = 120 documents, gold computed by a different method from the engine. **First run 720/800 right, 63 WRONG.** After fixes 800/800.
- *Held-out set*, written after tuning and run once before any fix: **644/655 right (98.3%), 1 wrong, 10 absent** — it surfaced a planned future end date not read as 'still employed' and a header wrapped mid-date. Both fixed; those careers are now development data, so the 100% printed afterwards is NOT a held-out result. A fresh held-out set is still owed.
- *Mutation test:* 17 deliberate breakages of the new rules; the first battery let **two survive** — `MM/YY` dates and counting unpaid volunteering (my own corpus could not tell: the volunteer's dates sat inside the paid job's) — plus a lost-dash blind spot. Corpus fixed; **17/17 now caught.**

**Defects found and fixed (all MEASURED by a failing check first):** right-aligned dates read as a second column (moved every date to the end of the page; total experience 0) — `layout.ts`; first version of that fix broke a real narrow sidebar on a dense page, caught by the 3-page career, refined to 'small AND only dates/places'; comma inside brackets splitting a title; `Manager, Strategy` splitting (function-word list); degrees `B.Des BBA B.Arch B.Pharm LLB M.Phil MBBS` unread (and `BMS`/`MS` deliberately NOT added — 'BMS College', 'MS Ramaiah' are schools); wrapped skills lists split mid-skill; a dates-only education line discarded; consecutive one-line projects merged; **two-digit years (`Jan'21`, `03/19`) unreadable in the shared `dates.ts` — the founder's own example**; column gaps flattened to one space ('Senior Analyst Gurugram'); lost dash (`Jan 2022 Present`) in born-digital PDFs as well as OCR; Tesseract reading across a column gutter (now uses our own column detector on word boxes); a side venture with no employer and a bare year winning 'latest role' (graded weakness tie-break).
**New, not asked for in the first pass:** `detectKind` by magic bytes + typed `ResumeFileError` (empty, too large, old `.doc`, unsupported, encrypted, unreadable) with messages that never blame the résumé; `stale_document` flag from the file's own saved date; `future_end`; gap reasons (`education` vs `unexplained`); OCR is a rescue not a requirement (if it cannot run, the text layer is used).
**A crash found by the test runner, not by a test:** a corrupt image made Tesseract's worker throw an UNCAUGHT exception — on a server that ends the process. Images are now decoded first and the worker has an error handler. Zip-bomb guard added (declared unpacked size checked before reading).

**ATS checker side effect (MEASURED, `npm run bench`):** 0 accuracy misses, 0 invariance failures; four of the founder's real résumés **83 → 90** because dates were being read wrongly (the checker was penalising a parser artifact). `bench/snapshots/latest.json` now also scores the 120 stress documents (146 total).

**Totals 2026-10-15:** 173 test files / 2,152 tests pass (was 167 / 2,091); `tsc` clean; ESLint 0 errors on `src scripts bench ingest` (the 1,190 errors `npm run lint` reports are all inside `.claude/`, not ours).

**Known limits (do not read the numbers without these):**
1. ~~The engine is not wired into `parse-resume.ts`~~ — **wired 2026-10-15 on branch `resume-engine` (see Round 3 below), but NOT DEPLOYED, so no user sees any of this yet.**
2. The model path (`useModel`) was **never exercised** in any measurement above; everything is deterministic.
3. Stress careers are **invented by me**; their realism is bounded by what I thought of. Only the founder's 9 résumés are real, and they have no hand-checked answers yet (the sheet is `output/reports/pilot_audit_sheet.csv`). The volunteer corpus is empty.
4. OCR is English only; Hindi/regional résumés are untested; OCR **on Vercel serverless is unverified** (WASM size and time) — it has only run on the founder's laptop (~3 s/page).
5. `Manager, Strategy`-style commas are handled by a word list, not understood. `real-2` (a company-first header with no title line) still reads the company as the title.
6. `next build` was not run; the engine is not imported by the app, so it should be unaffected — unverified.
7. 'Stale' relies on file metadata; a scanner stamps the scan date.

**Round 3 — wired in, beside the old reader (2026-10-15, branch `resume-engine`, two commits, NOT pushed, NOT deployed).**
- **Three modes** (`RESUME_ENGINE`, default `shadow`): `off` = the old reader alone; `shadow` = the old reader answers, the engine runs beside it and one log line of verdicts (same/differ/only_old/only_new/neither per field, plus enums and counts — a test proves no résumé text can appear in it); `primary` = the engine's title, employer, years and city replace the old reader's where it found them. A typo in the variable can never promote the engine (`PRIMARY` → shadow).
- **The one behaviour change in shadow:** a PDF with no text layer (a scan, or 'Print to PDF') is read by local OCR and carried through the ordinary pipeline instead of being turned away; the candidate is told it was read by text recognition. Metered 3 per 10 min per user (past it, the old message). Any engine failure is swallowed — the upload cannot be broken by it (tested with the engine forced to throw).
- **Packaging, the part that could have broken every upload (cf. the pdfjs worker incident):** `next.config.ts` marks `tesseract.js` and `@napi-rs/canvas` external and names the files they open by path for `/start` (language data, WASM core, worker). **MEASURED from a production `next build` trace:** `/start` carries the English data, 15 WASM files, the worker script and canvas — **519 files, 124 MB** (limit 250 MB); the Linux x64 canvas binary is in the lockfile. **NOT verified:** that it actually runs on Vercel (a local build is not a Vercel build; cold start and the 3–10 s/page OCR time on a serverless CPU are unknown). That is why the first thing to do after deploying is upload a scan and read the Vercel log.
- Verified locally: `tsc` clean, ESLint 0 errors, 173 test files / 2,164 tests, `next build` passes, ATS bench 0 misses.
- **To turn it on for real:** deploy (RUNBOOK), watch the `resume_engine_shadow` lines for a week; if title/employer/years verdicts are `same` or `only_new` wherever the old reader was right, set `RESUME_ENGINE=primary`. To turn the OCR off instantly: `RESUME_ENGINE=off`.

