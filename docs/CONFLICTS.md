# Conflict register

*Compiled 2026-09-06. Every contradiction surfaced while planning and starting the
category-parity work — between the new strategy, the decisions already locked in
`docs/PROJECT-STATE.md`, the documents, the code, and the `saaf-ai` front end.*

**Status key:** 🔴 needs your decision · 🟡 needs building · ✅ resolved this session · ⚪ noted, low priority

---

## 0. Settled 2026-09-06 — the bucket mechanic

The founder's direction (precision matching + application co-pilot, no
auto-apply, uncertain matches shown in **separate buckets**) resolves four
conflicts at once and is now recorded in `docs/PROJECT-STATE.md` § What this is.

| Was | Now |
|---|---|
| **A1** Block below 50% vs "rank everything, withhold nothing" | **Dissolved.** Roles are sorted into buckets — matches you / experience out of range / location out of range / worth a look. Nothing hidden, and uncertainty is *stated* rather than averaged into a score. Better than either gating or one flat list |
| **A2** Hard block vs candidate agency | **Dissolved.** There is no block. A role in an "out of range" bucket is visible and applicable; what varies is whether Saaf *assists* |
| **A14** Autofill vs PRD §13 "applying through Saaf" | **Settled.** Never applying on the candidate's behalf is now an explicit locked decision. Assisted application in scope; automatic never |
| **B2/B6** Unbuilt promises, undisclosed gaps | **Structurally handled.** The buckets are the disclosure mechanism — the product says what it is unsure about instead of hiding it |

**Parked 2026-09-06 — A3 (employer access) and A11 (WhatsApp) are future plans.**
Neither is to be built or designed now, which removes both from the open list.
A3's consent model still has to be designed *before* any B2B work, not after.

**One new flag: "100% accuracy" must not be published.** The ambition is right
and the product should be built for it, but no matching system is perfectly
accurate, and this repo's standing rule is that a promise the product cannot
keep is a defect rather than marketing. The buckets are the honest expression of
the same goal: certain where we are certain, explicit where we are not.

**Competitor names are now untracked.** Research lives in
`docs/COMPETITOR-ANALYSIS.local.md` and `docs/PARITY.local.md`, both gitignored.
⚠️ **Git history is not scrubbed** — roughly 30 commits still contain those names
in messages and diffs. Removing that means rewriting history, which changes every
commit hash and breaks the remote. Open decision.

---

## A. Strategy — your new direction vs decisions already locked

| # | Conflict | The tension | Resolution | Status |
|---|---|---|---|---|
| A1 | **Block applying below 50%** vs *"rank everything, withhold nothing"* | Stage A removed all gating on 2026-09-04. An anti-spam threshold is a gate returning by another route | Split them: **show** everything ranked, **gate the assisted action**. Nothing hidden; help withheld | 🟡 |
| A2 | **Hard block** vs candidate agency | A wall across someone's own job search is the same friction you criticise in the category leader | Recommend blocking only *assisted* applications (autofill, tailoring). Never stop them walking to the employer themselves | 🔴 |
| A3 | **Selling employer access (Phase 2)** vs *"Nothing shared about your search"* | A stated guarantee: no employer contacted, nothing sold, no recruiter can find you. **Four of five personas are employed and hiding** | Opt-in discoverability, default off, current-employer exclusion, one-click revoke. Guarantee rewritten now, not broken later | 🔴 |
| A4 | **"Scrapers monitoring Indian job boards"** vs the LinkedIn/Naukri lock | *hiQ v. LinkedIn* — $500k judgment, permanent injunction | Deferred to the gated expansion phase | ✅ |
| A5 | **"Scrapers…"** vs *your own* earlier answer | You said "stick to limited clean ATS as of now" in the same session | Held to the earlier decision | ✅ |
| A6 | **Autofill on Naukri** vs the Naukri lock | Merges two different legal questions | Separated: *scraping listings* = locked. *Autofilling a form in the user's own logged-in session* = defensible, in scope. Per-platform terms still need checking | 🟡 |
| A7 | **"Match or surpass the leader's index"** vs arithmetic | 31 boards → 650 India roles (~21 each). 1M would need ~48,000 India-active boards — more than exist on these platforms. The leader's 8M is US-heavy and aggregator-fed | Target ~150k live India roles + history. 1M is reachable only via aggregators (deferred) or going global | ✅ |
| A8 | **₹0 pricing** vs the leader's ~$40/mo | Feature parity is reachable at ₹0; business-model parity is not | Mechanics parity only. ₹0 becomes a differentiator, not a handicap | ✅ |
| A9 | **"Copy the exact same features"** vs Insider Connections | The leader's alumni/referral graph has no legal data source that isn't LinkedIn-shaped | Flagged and deferred rather than silently dropped. The only competitor pillar with no path | 🔴 |
| A10 | **Semantic matching** vs *"the scorer is locked"* | The architecture pass deferred embeddings on that basis | Your brief unlocks the scorer, so embeddings become core. Line held: semantic **features**, deterministic **scoring** | ✅ |
| A11 | **WhatsApp** vs *"free tiers only"* | The Cloud API bills per conversation past a small free tier | First real cost item. Size before building | 🔴 |
| A12 | **Drag-and-drop Kanban** vs **mobile-first** | Dragging needs a library and is hostile on a phone — I'd built the tracker without it deliberately | Drag on desktop, tap-to-move on touch | 🟡 |
| A13 | **Full design replacement** vs the monochrome design law | `DESIGN.md` bans shadows, radii, colour, motion — and names `resumly.ai` as the thing to never become | Replacement approved. Risk: landing exactly on the anti-reference. New system must state its own thesis | 🟡 |
| A14 | **Autofill extension** vs PRD §13 | §13 names *"applying through Saaf"* permanently out of scope | Auto-apply stays excluded; **user-initiated autofill enters scope**. Must be written precisely enough that a future session can't blur them | 🟡 |

---

## B. Promises vs reality — what we say against what we do

| # | Conflict | Detail | Status |
|---|---|---|---|
| B1 | **`/audit` published wrong numbers** | Every figure ~⅓ low on the one page whose purpose is "check our work" | ✅ |
| B2 | **Kit landing sells unbuilt features** | True-Fit Scoring, Review & Approve, WhatsApp — all planned, none shipped. Your rule: an unkeepable promise is *"a defect, not marketing"* | ✅ copy kept honest |
| B3 | **"No employer in this index publishes a salary"** | On `/today`. It did not need an aggregator to become false — **measured 2026-09-07 it already was**: 12 of 799 live postings state a figure ("15 LPA" at Apna, "₹50,000" at CRED). It also asserted something the product never checks, since nothing extracts salary | ✅ replaced with a claim about our own behaviour — *"We don't read salaries, so pay never moves a score"* — on `/today` and in the profile form. True, and true at any index size |
| B4 | **`PRODUCT.md` "Why this works"** | Argued Saaf gates where others weigh. Saaf now weighs too — self-flagged known-stale | 🟡 |
| B5 | **Skills scoring is dead for every user** | All 4 profiles have no skills/domain because `GEMINI_API_KEY` is set nowhere. Everyone scored out of **80, not 100** | 🔴 set the key |
| B6 | **Function-typed matching promised, absent** | Marketing/consulting/HR requirement kinds are extracted by nothing and scored by nothing | 🟡 currently disclosed on-screen |

---

## C. Resolved this session

| # | Conflict | What was wrong | Fix |
|---|---|---|---|
| C1 | **Audit truncation** | Database returns max 1,000 rows; there are 1,496. Sums done on 67% of data | Counting moved into the database; stored row corrected in place. `431/248/231/12` → `652/363/353/19` |
| C2 | **Digest emails** | Every production email linked to `localhost:3000` | Derivation chain that also survives the domain purchase |
| C3 | **Unbounded query** | `.limit(500)` applied to only one branch — "open to adjacent" pulled everything | Limit applied to both branches |
| C4 | **Token name collision** | Tailwind generates `--color-*`; the old system already used two of those names. `--color-secondary` meant grey text in one and near-white surface in the other | Renamed to `--legacy-ink` / `--legacy-ink-soft` |
| C5 | **Unlayered CSS beat Tailwind** | One old `a { color }` rule outside a CSS layer silently overrode link colour on every ported screen. Cost the main CTA its text — dark on dark, build green | All legacy globals moved into `@layer base` |
| C6 | **Dark mode became incoherent** | Old system flips dark; new system has no dark values. Page stayed light while ink went near-white → invisible button | Dark mode disabled entirely until a dark palette is designed |
| C7 | **`saaf-ai` untracked** | One clean checkout from being lost | Committed |
| C8 | **PRD vs Roadmap on interview prep** | §13 said permanently out of scope; Phase 7 scheduled it | PRD corrected in place |

---

## D. Document contradictions

| # | Document | Says | Reality | Status |
|---|---|---|---|---|
| D1 | `PROJECT-STATE.md` | *"Gates, not weights"* locked | Stage A reversed it | 🟡 |
| D2 | `PROJECT-STATE.md` | *"No volume promise"* | Weakened by the pivot; your brief **restores** it | 🟡 |
| D3 | `PROJECT-STATE.md` | Monochrome design is law | Being replaced | 🟡 |
| D4 | `PROJECT-STATE.md` | *"The registry is the moat"* | Narrows to a phase, not a permanent lock | 🟡 |
| D5 | `HANDOFF.md` §5 | *"No language model runs anywhere in the MVP"* listed as a must-not-undo invariant | Stage C added one deliberately. A fresh session would have "fixed" it | ✅ corrected earlier |
| D6 | `1-Product-Offer.md` | Describes hard gates **and** a curated registry | Stale twice over; never amended for the pivot | 🟡 |
| D7 | `2-Magic-Moment.md` | The aha is "recognising a refusal" | Marked **VOID** — the product no longer refuses | 🟡 |
| D8 | `1-Product-Identity.md` | *"A match score's first job is to refuse"* | False since the pivot | 🟡 |
| D9 | `3-Onboarding-Flow.md` | 7 screens, per-function gate question | 5 screens, one unconditional question | 🟡 |
| D10 | `PARITY.md` | "20 boards" | Registry holds 31 | ⚪ |
| D11 | Four ProductOS docs | Reference `docs/LAUNCHES.md` | File doesn't exist | ⚪ |
| D12 | `4a-Landing-Page.md` | Hero built on withheld-count arithmetic | No withheld counts exist | 🟡 |

---

## E. Code and data conflicts

| # | Conflict | Detail | Status |
|---|---|---|---|
| E1 | **Registry vs database** | File holds 31 boards, database has 21. **0 of the 11 discovered on 09-05 are live** — they ship only with a deploy | 🔴 deploy-gated |
| E2 | **Kanban columns mismatch** | Kit: Drafted/Applied/Interviewing/Closed. Database: saved/applied/interviewing/**offer**/closed | 🟡 map Drafted→saved, add Offer |
| E3 | **Kit screens are client-side; `/today` is server-side** | Porting naively breaks authentication and drags the database query into the browser | 🟡 |
| E4 | **Free-text role vs structured taxonomy** | Kit's onboarding has a real role taxonomy; today it's free text — which is why matching uses crude word overlap | 🟡 adopting it is a **matching upgrade** |
| E5 | **Dead database columns** | `function`, `channel_budget`, `institute_tier`, `hr_track` — written by nothing, read by nothing, still hold data in 3 of 4 profiles | ⚪ |
| E6 | **Dead type members** | 4 of 8 requirement kinds are produced by nothing but still labelled on `/audit` | ⚪ |
| E7 | **Historical audit rows** | 09-03 and 09-04 carry pre-pivot inflated figures. Not displayed, not recomputable | 🔴 your call: delete or annotate |
| E8 | **15 roles have no description** | 2.3% of the index, ranked on title alone | ⚪ |
| E9 | **Migration 0004** | Never existed — numbering simply skipped it | ⚪ cosmetic |

---

## F. Ceilings — not conflicts yet, guaranteed conflicts as you grow

*Addressed 2026-09-07, in the scale-up that took the registry off its 31-board
ceiling. Every ✅ below was fixed **before** any new volume landed — F1, F2 and
F10 destroy data the moment the registry grows, so growing first would have
turned three latent defects into silent deletion.*

| # | Ceiling | Breaks at | Consequence | Status |
|---|---|---|---|---|
| F1 | **Rotation vs 30-day deletion** | ~80 boards | Boards not revisited within 30 days have their **live jobs deleted**. Total data loss, not degradation | ✅ prune scoped to boards actually ingested in the run |
| F2 | **Workday pagination vs deletion** | First Workday board | A company timing out mid-fetch deletes **97% of its jobs** in one run. Guaranteed, not probabilistic | ✅ `fetchAll` returns `{roles, complete}`; an incomplete board is never pruned and never deactivated |
| F3 | **500-role cap, freshest-first** | ~10k roles | The candidate's genuine best match becomes invisible because it's the 501st *newest*. Silent — no error | ✅ ranked by `ts_rank_cd` in the database before the cap — migration 0020 |
| F4 | **Nightly rescoring loop** | ~1,000 users | Cannot finish in the 60-second window. Independent of job count | 🟡 own cron path and own 60s budget; the ~1,000-user curve itself is untouched |
| F5 | **Vercel 60-second limit** | ~80 boards | The whole ingest is one function call | ✅ four cron paths, and the budget now degrades into rotation rather than loss |
| F6 | **India detection** | Now | 20 hardcoded city names. Silently drops Kochi, Indore, Coimbatore, Chandigarh, most states | ✅ delegates to the 54-city taxonomy + 40 states. Also ended the reverse bug: `'india'.includes` called **Indianapolis** Indian |
| F7 | **`/today` renders every row** | Any growth | No limit on the shortlist page | ✅ **overstated when written.** `gate_results` is bounded at 500 rows a user by the scoring cap, and the page renders `CARDS_PER_BUCKET = 20` of each bucket with the full count stated above it. Rendering a bucket whole needs `?show=<bucket>`, which is a deliberate click. Verified 2026-09-07 |
| F8 | **Free storage tier** | ~120k roles today, ~350k after planned changes | Supabase free tier is 500 MB | 🟡 `description` capped at 6,000 chars (p95 of the live distribution), which roughly halves the worst case. A board-count ceiling still has to be set from a real measurement |
| F9 | **SmartRecruiters pagination** | Now | Pinned at 100 results — jobs 101+ are invisible today | ✅ offset paging against `totalFound` |
| F10 | **Board reactivation** | Every run | Registry sync re-activates boards the previous run disabled | ✅ `active` written only for rows that did not exist |
| F11 | **A board bigger than the whole budget** | First large Workday tenant | **Found 2026-09-07, not in the original register.** A tenant with thousands of India postings pages for longer than the 52-second function, and each kept role costs a further detail fetch. The function is killed *before* the upsert, so `last_ingested_at` is never stamped — the board sorts first again tomorrow, is killed again, and **the entire registry behind it is never fetched.** Latent at 31 boards; the default outcome at 1,500 | ✅ `fetchAll` takes a deadline and returns `complete: false`; description hydration stops at the deadline and leaves those roles ranking on title, which is an already-tolerated state |

---

## What actually needs you

| Priority | Decision |
|---|---|
| 1 | **Set `GEMINI_API_KEY`** — skills scoring is dead for every user without it (B5) |
| 2 | **Hard block or assisted-only block** below 50%? (A2) |
| 3 | **Opt-in discoverability** — confirm the consent model before any B2B work (A3) |
| 4 | **Historical audit rows** — delete or annotate? (E7) |
| 5 | **WhatsApp budget** — the first thing that costs money (A11) |
| 6 | **Insider Connections** — accept it has no legal path, or drop it from parity (A9) |
| 7 | **Lift the deploy hold** when ready — 11 boards are waiting on it (E1) |
