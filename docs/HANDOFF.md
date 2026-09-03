# Handoff — what Saaf still needs from you

*Written 2026-09-03. **The MVP is built and deployed** — 53/53 tasks, live at https://saaf-akshay-keerthi.vercel.app. Read alongside `docs/PROJECT-STATE.md`.*

Everything below is split by whether **you** have to do it or whether a coding
session can. Nothing here is blocked on both.

---

## 1. Decisions only you can make

These change what gets built. A session should not resolve them alone.

**D1 · The landing page promises document generation, which is out of MVP scope.**
Benefit 3 on `productos/design/4a-Landing-Page.md` reads *"Nothing invented in your
documents."* Document generation and the fabrication guard are P2 (see PRD §13).
Either that copy comes off the page, or the feature comes into scope.
*Recommendation: cut the copy.* Moving words is cheap; shipping a fabrication
guard you cannot trust is not.
**Blocks:** TASK-040, TASK-053.

**D2 · The withheld list is capped at 50 rows.**
On a thin day that could be 50 struck-through rows against 3 cleared ones.
*Recommendation: keep 50 for launch and instrument it.* If withheld-section
engagement is high but session length collapses, drop to 20 with a remainder
count. **Blocks:** nothing. Revisit after the first cohort.

**D3 · Which companies go in the registry.**
Phase 3 needs 30–40 Indian company ATS boards. A session can seed plausible ones
from public sources, but you may have opinions about which employers your
candidates actually want. **Blocks:** TASK-031 quality, not its existence.

**D5 · The ingest scheduler has a 60-second ceiling — and now holds the service key.**
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

Vercel Hobby caps a function at 60s and fires cron once daily, so the work cannot
be split across invocations. The run takes ~34s at 20 boards. **It will time out
past roughly 30 boards** — and growing the registry is the moat, so this is a
*when*. Migrate to a Supabase Edge Function on `pg_cron` (150s) before then.
*Recommendation: do it at 28 boards, not at 31.*
**Blocks:** nothing today. Everything, quietly, the day the registry outgrows it.

**D4 · A domain, before beta.**
Resend will only deliver to your own account email until a domain is verified,
so magic links cannot reach real beta users yet. A `.in` costs a few hundred
rupees a year. **Blocks:** real users, not the build.

---

## 2. Actions only you can perform

A session cannot do these — they need your accounts, your browser, or your card.

| # | Action | Needed for | Notes |
|---|---|---|---|
| A1 | **Run migrations** in the Supabase SQL editor | every schema change | A session copies the SQL to your clipboard and opens the editor; you paste and Run. Migrations `0001`–`0003` are already applied |
| A2 | **Configure Resend as SMTP in Supabase** | magic-link sign-in | Project Settings → Authentication → SMTP. Host `smtp.resend.com`, port `465`, user `resend`, password = your `re_` key. **Status: unverified — please confirm** |
| A3 | ~~Create the GitHub repo and push~~ | — | ✅ Done 2026-09-03. 26 commits at `akshaykeerthi3301-rgb/Saaf`, private. Commit emails rewritten to GitHub's noreply address so the founder's real address stays private |
| A4 | ~~Add the Actions secret~~ | — | ✅ Secrets set, but **Actions are disabled on this account** (`HTTP 422`). The scheduler moved to Vercel Cron. See D5 |
| A5 | ~~Deploy~~ | — | ✅ Done 2026-09-03. **Redeploying needs `.git` moved aside**, because Vercel blocks deployments whose commit author it does not recognise. Permanent fix: add `275312729+akshaykeerthi3301-rgb@users.noreply.github.com` as a secondary email on the Vercel account |
| A6 | **Buy and verify a domain in Resend** | beta users | See D4 |

---

## 3. What a session can do with no further input

**Phase 3 — the pipeline (9 tasks), entirely unblocked.** Board registry, six
provider adapters, daily ingest with India filtering and 30-day pruning, gate
recompute, audit aggregation, the GitHub Actions workflow file, and swapping the
fixture for live data.

**Phase 4 — trust surfaces (8 tasks), 7 of 8 unblocked.** Public audit page,
profile editing, one-click deletion, stretch tier, daily digest, and the
"gate not live for your function" notice. Only the landing page waits on **D1**.

**Phase 5 — launch readiness (7 tasks), 5 unblocked.** Accessibility pass,
performance pass, security review, magic-moment timing, and success-criteria
verification. The refusal screenshot and the landing-page reconciliation depend
on **D1** and **A5**.

---

## 4. How to resume

Say **"continue"**. A session should then:

1. Read `docs/PROJECT-STATE.md` and this file.
2. Open `docs/ROADMAP.md`, find the first unchecked task, and work from there.
3. Read only the Reference sections that task's phase lists — the PRD is ~10,000
   words and loading all of it wastes context that belongs to code.
4. Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run verify:rls`
   before committing anything.

**Useful commands**

```
npm run dev              # localhost:3000
npm test                 # 48 tests
npm run verify:rls       # proves RLS denies, by seeding a row first
npm run gates:demo       # the gate engine against 211 real postings
npm run db:load-fixture   # reload roles into Supabase
npm run db:seed-test-user # recreate the test profile
```

**Signed-in local testing:** visit `/api/dev-signin`. It signs in the seeded
fixture account, refuses to run in production, and **must be deleted** once A2 is
confirmed and real magic-link sign-in works.

---

## 5. Things a fresh session must not undo

Written down because each was reached deliberately and against an obvious default.

- **`boards` has RLS enabled with zero policies.** That is correct — the registry
  is the moat. Company names are denormalised onto `roles` precisely so nobody
  needs to read `boards`.
- **The confidence threshold is 0.7, and unframed statements score 0.75.** An
  earlier 0.6 default cleared 109 of 121 roles for a two-year candidate,
  including Staff and Principal engineering roles. Lowering it reintroduces
  false clearances, which is the original harm.
- **Title seniority gates on the title, never on an invented years figure.** The
  reason says what the title is and that the posting states no year count.
- **"Assistant Manager" and "Senior Associate" are junior Indian titles** and are
  deliberately not gated. Matching bare "Manager" or "Director" manufactures
  false refusals.
- **Parsed résumé fields never touch the database before confirmation**, because
  the upload screen promises only confirmed fields are stored.
- **No language model runs anywhere in the MVP.** Refusal reasons are templated
  from the gate that fired.
- **Marketing, consulting and HR users are told their gate is not live yet**
  rather than silently having the years gate applied.
