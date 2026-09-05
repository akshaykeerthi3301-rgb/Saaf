# Saaf — Project State

**Last updated:** 2026-09-05 · **Phase:** Post-MVP. Develop closed at 53/53 and deployed; three stages have landed since — see **[The pivot](#the-pivot--stages-a-b-c-2026-09-04--09-05)**, which reverses a decision the table below still lists as locked. Define 4 of 5 and Design 6 of 7 — both remaining steps are launches, still deferred, and **nothing has yet been shown to a real person.**

> **Resuming? Read [`docs/HANDOFF.md`](HANDOFF.md) first.** It lists the decisions only the founder can make (D1 resolved and D2 moot since it was written — D3, D4 and D5 are live), the actions needing their accounts, and the invariants a fresh session must not undo.
>
> ⚠️ **Saaf ranks; it does not gate.** Stage A reversed *gates, not weights* deliberately on 2026-09-04. Anything below written in the language of refusals, withheld rows or cleared bands is the older product and is marked as such. Do not "restore" gating on the strength of the half of this document that predates the pivot.

Read this first. It carries decisions and verified facts from the originating session so they don't get re-derived or accidentally reversed.

---

## What this is

A free job-matching product for Indian candidates. It sources roles from company ATS boards, scores every role scoped to the candidate's stated preferred role against their confirmed profile, and ranks them. **Nothing is withheld** — a role the candidate cannot get scores badly and sinks, with the working shown. Document generation (tailored résumé and cover letter, on request only) is specified but out of MVP scope.

**Not** an auto-apply tool. **Not** a niche engineering platform — the engine is role-general across all corporate functions.

**Frame:** portfolio artifact first, built like a real product. ₹0 forever, no ads, no paid tier.

Named **Saaf** on 2026-09-02 (Design Step 1) — from *saaf saaf batao*, "tell it to me straight." The repo directory is still `jobmatch`; that is a path, not the brand, and renaming it is an open decision.

---

## Origin

Forked from a session in `~/Desktop/projects/trading/derivatives-bot` (2026-09-01 → 09-02) that audited a personal nightly job-search automation and then designed this product out of what that audit found. Two published artifacts carry the analysis:

- **[Nightly Job Search Pipeline](https://claude.ai/code/artifact/e1137fae-9fb0-4b67-a8d1-5a348f88c57c)** — teardown of the personal bot's sourcing: which tools work, which job boards are reachable
- **[Can this be a product?](https://claude.ai/code/artifact/0e441e7c-f513-41d7-9391-6fff21eed9bf)** — efficiency test, competitor teardown, live-probed $0 stack feasibility, legal red lines

The personal automation in `derivatives-bot` **continues running unchanged**. It is a separate concern from this product.

---

## Locked decisions — do not re-litigate

| Decision | Detail |
|---|---|
| **No LinkedIn or Naukri** | ToS breach. *hiQ v. LinkedIn* settled with a $500k judgment + permanent injunction. Removes ~84% of the personal bot's lead flow. Non-negotiable for a public product. |
| **Supply = ATS public APIs** | Greenhouse, Lever, Ashby, Workable, Recruitee, SmartRecruiters. Curated registry: ~100 boards seeded by hand, then automated discovery. **The registry is the moat.** |
| **Pre-application, not post** | The product answers *"which of these deserves my next 40 minutes?"* It does not attempt to explain post-application silence — that needs recruiter data nobody has. |
| ~~**Gates, not weights — typed by function**~~ **· REVERSED 2026-09-04 (Stage A)** | Superseded by **rank everything, withhold nothing**. Typed *reading* survives and still matters: the extractor types a requirement as years, credential, channel/budget, institute tier or HR track, and each type feeds the score differently. What died is the verdict — no requirement removes a role from the list. |
| ~~**Stretch tier ≤2 years, experience-typed only**~~ **· MOOT** | A stretch tier only means something against a refusal. With nothing refused, an experience gap is a score component carrying its own line of working. |
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

The product became a Jobright-equivalent for India. Every role scoped to the
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

### Deliberate residue — do not "tidy" these away

- **`WithheldSection` and the report-refusal action are orphaned and kept.** *"This
  shouldn't be here"* is still a real feedback loop worth rewiring onto a
  badly-scored role, and deleting them would orphan the `refusal_reports` table.
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
  DESIGN.md / DESIGN.html   design system, mirrored pair
  PRD.md                    14 sections, the technical spec
  ROADMAP.md                53 tasks, 52 done
  HANDOFF.md                what still needs the founder
  VERIFICATION.md           the five success criteria, measured
  RUNBOOK.md                dashboard settings outside version control
productos/                  selectively tracked — work products yes, ProductOS material no
src/                        the app: gates, parser, screens, actions
ingest/                     six ATS adapters, the daily pipeline
registry/boards.json        20 boards — the moat, private
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

**3 · Grow the registry — the hard stop at 28 boards is gone.** 20 today, found
by probing rather than guessing (`npm run registry:discover`). Stage B changed
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
   function-typed promise the personas were written against, and the earlier
   "your gate is not live yet" notice that made the gap visible is also gone —
   **the gap is now silent, which is the part worth deciding on.**
5. **The scheduler's expiry date moved, and only half the reason remains.**
   Stage B's concurrency pool and 38s start-cutoff mean the run degrades into
   board rotation rather than timing out, so the ~30-board cliff is gone. What
   remains is that the service-role key sits in Vercel, which earlier design
   notes ruled out — a real reason to move to a Supabase Edge Function, but a
   security-posture reason, not a deadline. See HANDOFF D5.
6. **Non-technical persona research is still the thinnest part.** Indian marketing
   communities were the weakest-mapped section in the Define phase and nothing has
   changed that.
