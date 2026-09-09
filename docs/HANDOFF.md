# Handoff — what Saaf still needs from you

---

## ✅ Migration 0023 applied — 2026-09-09

`resume_documents` is live. **No migration is pending.**

Verified after applying, end to end:

| Check | Result |
|---|---|
| `npm run verify:rls` | 8 `resume_documents` checks pass — A cannot read, UPDATE, DELETE or forge an INSERT against B's saved résumé; A **can** save, read back with the score intact, and delete their own |
| Save from the checker | "Keep this résumé" → **Saved to your account** |
| `/resume` | listed as `Backend Engineer — 9 Sept · 83/100 · saved 9 Sept`, `1 of 10` |
| Delete | one click, row gone, empty state returns |

⚠️ **This is the first table in the product that stores a document**, and it
reversed a promise three screens used to make. The copy changed in the same
commit as the storage, not after — `/resume` now opens "Your uploaded file was
deleted. What you build here, you keep", and the privacy page names the one
thing saved and where to delete it. **The uploaded PDF or .docx is still parsed
in memory and dropped**; that has not changed and the upload screen is untouched.

---

## ⚡ Resuming after 2026-09-07? Read this block first.

**The scale-up shipped.** Live at **https://saaf-ten.vercel.app** with **21,806
India roles from 1,396 company boards**, up from 742 from 31. Migrations `0020`
and `0021` are applied. All four crons are registered and running.

**State of the repository**

| | |
|---|---|
| Branch | `main`, working tree clean |
| Unpushed | **63 commits, none pushed to GitHub.** `git push origin main` when wanted — the remote is a backup only and does not deploy |
| Deployed from | `main`, deployment `dpl_GMH6w7y1MvYs4grZHWgHeaHnptyQ` |

**⚠️ Three things a fresh session will get wrong without reading them**

1. **The prune scoping in `ingest/run.ts` is not an optimisation.** See §5 of this
   file. Reverting it to a global delete empties the index at this registry size.
2. **The deploy procedure in `docs/RUNBOOK.md` is the one that works.** Do not
   move the repo's own `.git`, and do not use `--prebuilt`. Both were tried on
   2026-09-07; the first hangs at `UNKNOWN`, the second cannot resolve its own
   traced paths.
3. **The Review & Approve drawer is deliberately thin.** `docs/PROJECT-STATE.md`
   Stage N. It is the monetisation surface, not an unfinished generator.

**⚠️ Beta users can only sign in with Google.** Resend delivers only to the
founder's own address until a domain is verified, so email magic links reach
nobody else — a candidate who types their email gets "check your inbox" and
nothing arrives. Verified 2026-09-07 that Google OAuth returns a clean 302 with
the production callback, so that path works. Buying a `.in` and verifying it on
Resend fixes both sign-in and the daily digest, which currently reaches only the
founder.

**Where the volume comes from now.** `npm run registry:harvest` reads Common
Crawl's URL index for ATS host patterns; `npm run registry:qualify` probes each
candidate against its own public ATS API and admits only boards with live India
roles. 27,888 candidates are on disk (gitignored, 4 MB) with their probe results,
so a re-run does not redo them. Four high-volume boards are held in
`registry/needs-review.json` as suspected reposters — admitting one is a
deliberate act.

**The one thing that will look broken and is not.** The daily cron sweeps ~180
boards of 1,396 per 52-second window, so the registry is covered every ~8 days.
That rotation is the design, and it is only safe because of point 1 above.

---

*Written 2026-09-03, **revised 2026-09-05** for the Stage A–C pivot. The MVP is built and deployed at https://saaf-akshay-keerthi.vercel.app; **Stage C is committed but not yet deployed.** Read alongside `docs/PROJECT-STATE.md` — its **The pivot** section is the substance, this file is only what still needs you.*

> ⚠️ **Saaf ranks; it does not gate.** Stage A reversed that on 2026-09-04. Two entries in §5 below described the pre-pivot product and have been corrected in place rather than deleted, so the reversal stays visible.

Everything below is split by whether **you** have to do it or whether a coding
session can. Nothing here is blocked on both.

---

## 1. Decisions only you can make

These change what gets built. A session should not resolve them alone.

**D1 · ~~The landing page promises document generation~~ — RESOLVED 2026-09-03.**
Benefit 3 (*"Nothing invented in your documents"*) was cut; the page runs three
benefits. Restore it only when document generation actually ships.
**Blocks:** nothing.

**D2 · ~~The withheld list is capped at 50 rows~~ — MOOT since the pivot.**
There is no withheld list. The live question underneath it moved rather than
disappeared: **how far down the ranked list is worth showing.** A candidate whose
search matches 228 of 650 roles does not want 228 rows, and a tail of weak
matches costs the same attention the withheld list would have. The page applies **no limit at all** — it renders every
scored row, ordered by score; the only bound is upstream, at the 500 roles
`evaluate-user` writes per candidate. *Recommendation: decide it against real session data, not in advance.*
**Blocks:** nothing. Revisit after the first cohort.

**D3 · Which companies go in the registry.**
*Revised 2026-09-07 (Stage M). The question changed shape.* It is no longer "can
we find 30–40 boards" — `scripts/harvest-common-crawl.ts` reads Common Crawl's
URL index for ATS host patterns and `scripts/qualify-boards.ts` admits a board
only when its own public API returns a live India role. That found roughly 1,500
qualifying employers without a slug being typed.

What is left for you is narrower and real: **a staffing agency's ATS board is
technically a company board.** The first sweep surfaced "Endeavor IT Solution"
with 8,476 India roles and "Squircle It Consulting Services" with 1,782, against
a median of 5 — reposters, not employers, and admitting them would reverse the
locked "no aggregators" decision by accident. A volume rule alone cannot separate
them from Bosch (546) or AECOM (340), so boards above 250 India roles are held in
`registry/needs-review.json` instead of the registry. **Deciding those is yours.**
**Blocks:** nothing; the registry works without them.

**D5 · The ingest scheduler holds the service key. ~~And has a 60-second ceiling.~~**
*Revised 2026-09-05: Stage B removed the deadline; the key placement is what's left.*
Moving the scheduler to Vercel had a second consequence beyond the timeout. The
ingest writes roles, requirements and gate results, all of which RLS blocks for
ordinary clients, so `SUPABASE_SERVICE_ROLE_KEY` now lives in the Vercel
production environment. Earlier design notes said it never should — that was
written when GitHub Actions was the runner. It is set for **production only**,
never preview or development, and it remains a server-only variable that cannot
reach a browser bundle, with ESLint blocking app code from importing the client
and the cron route requiring a bearer token. **Migrating to a Supabase Edge
Function removes the key from Vercel entirely**, which is a second reason to do
it beyond the timeout.

~~Vercel Hobby caps a function at 60s and fires cron once daily... it will time out
past roughly 30 boards.~~ **Stage B changed this.** Board fetching runs as a
concurrency-6 pool — measured 7s across the same 20 boards, down from 34s — and
the run stops *starting* new boards after 38s, ordering them least-recently-ingested
first. Outgrowing the budget now degrades into rotation (what's skipped today goes
first tomorrow) rather than into a hard timeout. **There is no longer a board count
that breaks the scheduler**, so "do it at 28 boards" no longer applies; re-measure
before treating any number as a ceiling.

*Recommendation: still migrate, but for the key, not the clock.* A Supabase Edge
Function on `pg_cron` removes `SUPABASE_SERVICE_ROLE_KEY` from Vercel entirely.
**Blocks:** nothing. It is now a security-posture improvement on your own schedule.

**D4 · A domain, before beta.**
Resend will only deliver to your own account email until a domain is verified,
so magic links cannot reach real beta users yet. A `.in` costs a few hundred
rupees a year. **Blocks:** real users, not the build.

---

## 2. Actions only you can perform

A session cannot do these — they need your accounts, your browser, or your card.

| # | Action | Needed for | Notes |
|---|---|---|---|
| A1 | **Run migrations** in the Supabase SQL editor | every schema change | A session copies the SQL to your clipboard and opens the editor; you paste and Run. **No migration is pending as of 2026-09-08** — `0018` (`role_requirements.max_years`) was recorded here as outstanding but is APPLIED; verified by selecting the column against the live database. Over-qualification is scored. Re-check by query rather than by this line, which went stale once already |
| A2 | **Configure Resend as SMTP in Supabase** | magic-link sign-in | Project Settings → Authentication → SMTP. Host `smtp.resend.com`, port `465`, user `resend`, password = your `re_` key. **Status: unverified — please confirm** |
| A3 | ~~Create the GitHub repo and push~~ | — | ✅ Done 2026-09-03. 26 commits at `akshaykeerthi3301-rgb/Saaf`, private. Commit emails rewritten to GitHub's noreply address so the founder's real address stays private |
| A4 | ~~Add the Actions secret~~ | — | ✅ Secrets set, but **Actions are disabled on this account** (`HTTP 422`). The scheduler moved to Vercel Cron. See D5 |
| A5 | ~~Deploy~~ | — | ✅ Done 2026-09-03, redeployed 2026-09-07. **Deploy from a copy staged without `.git`** — `vercel --prod` from the repo hangs at `UNKNOWN` with a 0 ms build (observed: 14 minutes), because Vercel will not build a commit whose author it does not recognise. Staged without git metadata it reaches "Building" in 3s. Never move the repo's own `.git` aside. Permanent fix: add `275312729+akshaykeerthi3301-rgb@users.noreply.github.com` as a secondary email on the Vercel account |
| A6 | **Buy and verify a domain in Resend** | beta users | See D4 |

---

## 3. What a session can do with no further input

*Phases 3–5 are complete; TASK-039 (seven-day ingest stability) is the one
roadmap box still open, and it needs elapsed time rather than work.* What a
session can pick up now:

**Deploy Stage C.** The only unshipped code. Safe on its own — migration 0014 is
applied, and the LLM parse stays inert until `GEMINI_API_KEY` is set. Deploy
first, set the key second, so the honest privacy copy is live before the
behaviour it describes.

~~**Grow the registry**~~ **Done 2026-09-05: 20 → 31 boards.** The candidate
list in `scripts/discover-boards.ts` went from ~110 slugs to 219; 30 came back
live and 11 were new. Growing it further means adding more slugs — the script
probes a fixed list, so re-running it unchanged re-probes the same names.

~~**Close the silent function gap, or state it.**~~ **Stated, 2026-09-05.**
`src/match/function-gap.ts` infers the function from the candidate's own
preferred-role text — onboarding no longer asks it — and `/today` names the
requirement their function turns on and says plainly that we don't read it.
**Building the reading is still open**: posting extraction for channel/budget
scale, institute tier and the HR track, the three onboarding questions that fill
`profiles.channel_budget` / `institute_tier` / `hr_track`, and three more score
components. That is the larger piece, and it is what would make the score
honest for those functions rather than explaining why it isn't.

~~**Retire the `rolesWithheld` field** on `/api/audit/today`.~~ ✅ Done 2026-09-05.

**Verify the signed-in shortlist.** `/api/dev-signin` was deleted once magic-link
sign-in worked, so nothing signed-in can be exercised locally any more — the
score-breakdown instrumentation and the "this score looks wrong" control were
built and unit-verified but the assembled page was not. First signed-in session
after deploy settles it.

---

## 4. How to resume

Say **"continue"**. A session should then:

1. Read `docs/PROJECT-STATE.md` — **including its *The pivot* section** — and this
   file. The roadmap and the PRD were written for the gating product and are
   governed by the pivot, not the other way round.
2. Pick from §3 above. The roadmap has one box left and it is a waiting task.
3. `nvm use` first — Node 22.23.2 is pinned in `.nvmrc` and this shell defaults
   to 18.
4. Run `npm test` (130 tests), `npm run lint`, `npm run typecheck` and
   `npm run verify:rls` before committing anything.

**Useful commands**

```
npm run dev              # localhost:3000
npm test                 # 203 tests
npm run verify:rls       # proves RLS denies, by seeding a row first
npm run gates:demo       # requirement extraction against 211 real postings.
                         # The ONLY live caller of src/gates/evaluate.ts's
                         # verdict path — no app code reaches it any more
npm run db:load-fixture   # reload roles into Supabase
npm run db:seed-test-user # recreate the test profile

npm run registry:harvest              # Common Crawl -> registry/candidates.json.
                                      # Reads a URL index; touches no employer
npm run registry:qualify -- --limit N # probe candidates against their own ATS
                                      # API; admits only boards with India roles
npm run registry:qualify -- --regate  # re-apply the review threshold
npm run registry:qualify -- --rename  # re-derive Workday display names, offline
```

**The developer bench:** `/dev/bench` (development only — it 404s in any
production build, including Vercel previews). Drop in several résumés, edit the
parsed fields, and score each against the live index with the real pipeline. It
writes nothing, so it is safe to run while signed in as yourself.

**Signed-in local testing:** visit `/api/dev-signin`. It signs in the seeded
fixture account, refuses to run in production, and **must be deleted** once A2 is
confirmed and real magic-link sign-in works.

---

## 5. Things a fresh session must not undo

Written down because each was reached deliberately and against an obvious default.

- **`boards` has RLS enabled with zero policies.** That is correct — the registry
  is the moat. Company names are denormalised onto `roles` precisely so nobody
  needs to read `boards`.
- **The confidence threshold is 0.7, and an unframed stated minimum scores 0.75**
  (`src/gates/extract.ts`). An earlier 0.6 default cleared 109 of 121 roles for a
  two-year candidate, including Staff and Principal engineering roles. It now
  decides whether a requirement is read into the *score* rather than into a
  refusal, but lowering it still means believing text the extractor barely read.
- **Seniority is judged on the title, never on an invented years figure.** The
  posting's own words are retrieval; a year count nobody wrote down is inference.
- **"Assistant Manager" and "Senior Associate" are junior Indian titles** and are
  deliberately not penalised. Matching bare "Manager" or "Director" manufactures
  false negatives on exactly the jobs the candidate should see.
- **Parsed résumé fields never touch the database before confirmation**, because
  the upload screen promises only confirmed fields are stored. Stage C makes this
  load-bearing rather than tidy: skills feed the score directly, so a hallucinated
  one would move real rankings, and the confirm screen is what contains it.
- ~~**No language model runs anywhere in the MVP.**~~ **Superseded 2026-09-05
  (Stage C), and replaced by a narrower rule that must hold:** a model **reads,
  never decides.** `src/lib/parse/llm.ts` reads skills and domain off the résumé;
  scoring stays deterministic code. The call is **strictly additive** — no key, a
  timeout, malformed JSON or any error returns null and the regex parser's result
  stands. Nothing may make the upload path depend on the model.
- ~~**Marketing, consulting and HR users are told their gate is not live yet.**~~
  **No longer true, and not yet replaced.** There are no gates, onboarding asks
  one unconditional credential question, and those functions' requirement kinds
  are extracted by nothing and scored by nothing. The gap is real and now silent.
  Do not treat its absence as a decision — see PROJECT-STATE open question 4.
- **Nothing is withheld.** A role the candidate cannot get scores badly and sinks;
  it is never hidden. If a future change needs to hide a row, that is a product
  reversal and belongs in PROJECT-STATE's locked table, not in a patch.
- **A thin list must never read as a verdict on the candidate.** The arithmetic
  attributes the shortfall to registry coverage. That principle predates the
  pivot and survived it intact — it is the one thing both products share.
- **⚠️ THE PRUNE IS SCOPED TO BOARDS INGESTED IN THE CURRENT RUN, and that is
  not an optimisation.** `ingest/run.ts` deletes stale roles only for boards that
  came back **complete** this run. The obvious simplification — one global
  `delete where last_seen_at < cutoff` — is what the code used to do, and it is
  catastrophic at any registry too large to sweep in one 52-second function:
  rotation *means* most boards are legitimately unvisited for 30+ days, so the
  global delete reads normal operation as "these jobs are gone" and empties the
  index. Related and equally load-bearing: `fetchAll` returns
  `{ roles, complete }`, and a board that came back incomplete is neither pruned
  nor deactivated. If you find yourself deleting the `complete` flag because
  nothing seems to read it, read this paragraph again.
- **A board is deactivated only on a COMPLETE fetch that found no India roles.**
  A timeout, a 404 or a short read is not evidence about an employer.
- **`registry/boards.json` only ever grows from qualification.** Nothing
  auto-removes; deactivation is the daily ingest's decision, recorded in the
  database, and `syncRegistry()` must never write `active` for a row that already
  exists — doing so resurrects every board the ingest has retired.
- **Copy ships in the same commit as the behaviour it describes.** Stage C
  rewrote the privacy page in its own commit because the old text became false the
  moment the code merged. The deploy order matters for the same reason: Stage C's
  build goes out **before** `GEMINI_API_KEY` is set, never after.
