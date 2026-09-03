# Handoff — what Saaf still needs from you

*Written 2026-09-03, at 27/54 tasks. Read alongside `docs/PROJECT-STATE.md`.*

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
| A3 | **Create the GitHub repo and push** | backup + Actions | Your account can push; only third-party OAuth is blocked |
| A4 | **Add `SUPABASE_SERVICE_ROLE_KEY` as a GitHub Actions secret** | TASK-037 daily ingest | Repo → Settings → Secrets → Actions. **Never** put this in Vercel |
| A5 | **`npx vercel login` and deploy** | TASK-010 | CLI only — the GitHub integration needs OAuth you cannot grant |
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
