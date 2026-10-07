# Rebuild kickoff — read this first in the next session

Prepared 2026-10-07. Founder direction: **the rebuild starts next session.** This reverses the 2026-10-02 brainstorm verdict ("ship and launch, no new building") — recorded in PROJECT-STATE Stage AJ; the old verdict is struck there, not deleted.

**What "the rebuild" means here (default, confirm in the first minute):** work through ROADMAP **Phase 17** (TASK-155–166), the gaps found by comparing Saaf with the teardown of a competing product. It is not a copy of that product; Saaf's locked decisions stand.

## 1. Read, in this order

1. `CLAUDE.md` (project) — architecture invariants, the session-end ritual, plain English for the founder.
2. `docs/PROJECT-STATE.md` — *Locked decisions*, then **Stage AJ** (the teardown, four passes).
3. `docs/HANDOFF.md` — what only the founder can do; what is live vs written.
4. `docs/ROADMAP.md` — Phase 17 (proposed) and the status line.
5. `docs/DESIGN.md` — before any UI change; tokens only, no hard-coded colours.
6. The teardown files (see §2): `README` → `00-engineer-briefing` → `11-saaf-comparison` → `10-build-blueprint` §0 and the layer you are building.

## 2. The teardown files are NOT on this branch, on purpose

The GitHub remote is **public**. The 14 research files live only on the local branch `jobright-teardown`, which must **never be pushed or merged into `main`** until counsel has read `10-build-blueprint` §0. To read them while working here, materialise them as ignored, untracked files:

```bash
git restore --source=jobright-teardown --worktree -- docs/jobright-map
git status --short   # must show nothing for docs/jobright-map (the *.local.md rule ignores them)
```
Never `git add -f` them on this branch.

## 3. Preflight (measured 2026-10-07 — re-measure, then compare)

```bash
export PATH=$HOME/.nvm/versions/node/v22.23.2/bin:$PATH && node -v   # must say v22.23.2
git status --short && git branch --show-current
npx vitest run          # baseline: 61 files, 932 tests pass
npm run lint            # baseline: 0 errors, 23 warnings (the 24→23 legacy query sites)
npm run typecheck       # baseline: clean
```
If any baseline differs, find out why before writing code. Touching scoring? Also `npm run bench` and `npm run bench:match` (both gate changes).

## 4. State of the stack (do not assume it is live)

- `public-job-pages` is stacked on `extension-parity`; **not merged, not deployed.** Migrations **0029, 0030, 0031** are founder-applied (Supabase SQL editor) — check HANDOFF before relying on columns they add (hidden jobs, saved filters, coaching, network).
- Building more on top of undeployed work compounds risk. **Decide with the founder first:** merge and deploy the backlog (RUNBOOK) *before* Phase 17, or build on the stack and deploy once. Recommended: deploy first.

## 5. Branching

- Work on a new branch from `public-job-pages`: `git switch -c phase-17`. One task per commit. Do not merge `jobright-teardown` into it.
- Commit message: precise and technical, ends with the Co-Authored-By trailer. Never push without being asked.

## 6. Decisions the founder owes before code (ask in the first message)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Counsel review of the teardown guardrails — status? | Needed before any public launch; not blocking local work |
| D2 | Which Phase 17 tasks, in what order? | Start TASK-155 (filter drawer, sort, company filters): cheap, visible, uses data Saaf already has |
| D3 | Deploy the backlog first? | Yes (§4) |
| D4 | Lawful content source for the interview bank (TASK-164) | Candidate reports with provenance; no scraping; label verbatim vs paraphrased |
| D5 | Streaming chat (TASK-166) and a mobile variant (TASK-165) | Decisions, not tasks; persona was removed 2026-09-14 |
| D6 | Sentence search v2 (TASK-156): deterministic first or LLM? | Deterministic first, with a 100-phrasing test set |

## 7. First slice, specified: TASK-155

- **Today:** `src/lib/feed-query.ts` — the feed view has **6 keys** (`min80`, `fresh`, `remote`, `easy`, `q`, `city`); saved filters store that same shape (`src/lib/services/feed-prefs.ts`, migration 0030).
- **Target:** a documented, URL-encodable set adding job type, work mode, experience level, date posted, minimum stated pay, exclude company/agency, and a sort control. **Before choosing fields, confirm which columns exist** (`supabase/migrations/`, `src/lib/services/shortlist.ts`) — only offer a filter the data can honour. Pay is stated on only 2.2% of postings (Stage T), so label that filter honestly.
- **Done when:** unit tests round-trip every field through the URL and through a saved filter (as `feed-query` tests do today); changing one field moves the count the expected way; no new `supabase.from()` in `src/app/` (invariant 3 — add a named function in `src/lib/services/`); Zod at the boundary; no `any`; UI uses DESIGN.md tokens; **opened in a browser and looked at** (grep on served HTML has misled this repo three times).

## 8. Rules that bind every task (do not re-litigate)

- Locked: no LinkedIn/Naukri; supply = ATS public APIs; never turn users away; **fabrication guard blocks, not warns**; parse-then-confirm; **₹0, no paid tier**; monochrome flat design system; the founder's personal tracker is never publishable.
- Apply for me stays: off by default, Start-gated, 25 a day, never past a CAPTCHA, never guesses, **never answers demographic/EEO questions** (`extension/autofill.js` REFUSALS), marked Applied only on the employer's confirmation.
- Single-sided product (invariant 4): no employer UI.
- From the teardown guardrails: **do not copy the other product's code, wording, visuals or data**; no scraping it; **no detection evasion** in anything that applies on a user's behalf; a typed sentence overrides conflicting preset filters, or asks.
- Every number you report is tagged OBSERVED / MEASURED / CLAIMED / INFERRED; a parity verdict needs evidence on both sides.

## 9. End of every session

Tick ROADMAP boxes and the status count; record the *why* in PROJECT-STATE (struck-through corrections, dated numbers); update HANDOFF with anything live vs written; close the reply with **Progress** and **Next steps** (founder-only items listed separately); say what was verified and how.
