# Handoff — what Saaf still needs from you

---

## 🔶 2026-10-08 — parity audit done: 50 of 109 match, 24 partial, 3 gaps, 21 could not be checked

~~**Written, not shipped.** Nothing was changed on the site.~~ **CORRECTED 2026-10-08 (late): the fixes are LIVE** at https://saaf-ten.vercel.app — latest deploy `dpl_GDMaDXVVGnVKeAPrkYZdkCkxB4Ts`. Live and re-measured on production: voice input (TASK-214), job-page markup for Google (215), the error-report tunnel `/api/monitoring` (216 — live, not confirmed, see below), "Search all roles" beyond your matches at `/today/explore` (217), a one-line gist of the job on every card (218), the wider filters (219), and the Reposted chip on that search page (220). **Not pushed:** `main` is ahead of both GitLab and GitHub (as of 2026-10-08 evening, 16 commits) — say "push main to gitlab and github" and I will. Result and evidence: ROADMAP Phase 19 (TASK-214–221) and PROJECT-STATE Stage AQ; the full row-by-row table is the local file `docs/jobright-map/20-parity-audit.local.md` (never published).

**Found on the live site:** voice input is broken (a one-line header fix), job pages are missing six Google-recommended fields, and the search box cannot look beyond your 395 matches.

**NEW 2026-10-08 (found while building TASK-216): Sentry rejects Saaf's error reports — a one-minute fix only you can do.** Sentry answers `403 … rejected with_reason: ProjectId` to the DSN that production uses, so no browser or server error has been recorded. In Sentry: Settings → Projects → (your project) → Client Keys (DSN) → copy the DSN → in Vercel set both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` → tell me to redeploy, and I will send a test event through the new tunnel to confirm.

**Only you can do these, so the 21 unchecked rows can be checked:** (1) save a résumé in Saaf — or say "save a synthetic test résumé on my account" (11 rows need it); (2) load the Saaf extension 0.7.0 in Chrome (8 rows need it); ~~(3) say "go" on TASK-214 first, then the rest in order.~~ (3) fix the Sentry DSN above so TASK-216 can be confirmed. Phase 19 is 6 of 8: TASK-216 waits on that DSN, TASK-221 on (1) and (2). Freshness (TASK-220) was measured and deliberately left as a tie-break — a score bonus did not make the top 20 any newer; see ROADMAP TASK-220.

---

## ✅ 2026-10-08 — taken-down jobs are hidden, LIVE (`dpl_9nDhTkTTnTaJQFHYR4HRyeDDoUqb`), and every candidate's matches were recomputed

**Live and checked.** The daily ingest and the recompute ran on production today (roles 27,882 → 28,751; reposted, work mode, contract type, pay and "posting closed" now filled). 7,014 of the stored roles (24%) had been taken down by their employer; the site now hides them. **Checked after the deploy:** the Product Manager page in a real browser says 257 open roles (was 352), the remote page 865 (was 1,070); 5 of 5 sampled taken-down job pages show "not found" and 3 of 3 live ones load; none of the newest 1,000 taken-down jobs is in the sitemap. **After the recompute:** matches pointing at a taken-down job went from 693 of 3,970 to 0 of 3,277.

**Old branches deleted 2026-10-08** (founder's instruction; each had 0 commits that `main` lacks, so nothing was lost): `phase-17` (was `c3cf3db`), `phase-18` (`8ea24fb`), `feed-redesign` (`24436d1`), `extension-parity` (`34455f8`), `jobright-parity` (`1f05a61`), `public-job-pages` (`7ebe935`). Every tip is still reachable from `main`; to get a name back: `git branch <name> <sha>`. Kept on purpose: `main` and `jobright-teardown` (local-only research — never push or delete). **Also deleted 2026-10-08 (founder's instruction): `claude/adoring-allen-089b26`** — locally with its working folder, and on GitLab. Its 38 commits (4 September, tip `c9f13df`) were already in `main` under new hashes (`git cherry main <branch>` marked all 38 `-`; the history had been rewritten) and stay reachable on GitLab through the tag `pre-scrub-backup`. Its 2 unsaved doc edits (`docs/PRD.md`, `docs/PROJECT-STATE.md`, 106+/65−, old pre-pivot text) were saved as `~/Desktop/projects/_saaf-backups/adoring-allen-uncommitted-docs.patch` before removal (re-applies cleanly onto `c9f13df`). Older notes in this file that say "on `phase-18`" mean those commits, which are now simply in `main`.

**Still open, none urgent:** 11 boards returned "not found" in the ingest (probably retired — not yet checked one by one); the match-finder's database function still ranks taken-down jobs before the app drops them (only matters for searches matching 500+ jobs) — **the fix, database update `0050`, is now APPLIED on production** (2026-10-08, after your "apply 0050"): the match-finder skips taken-down jobs before it picks its best 500 — measured on the live database, a "product manager" search went from 500 results with 129 taken-down jobs to 398 results with none, and the security check still passes; ~~`phase-18` is not merged into `main`~~ it IS merged into `main` as of 2026-10-08 (fast-forward, 48 commits, `main` now holds everything that is live) — but ~~nothing is pushed~~ GitLab is up to date as of the update below. ~~"the `origin` remote is no longer configured"~~ was wrong — I had cut off the output of `git remote -v`: there are TWO remotes, `origin` (GitHub, `akshaykeerthi3301-rgb/Saaf`, private — pushed 2026-10-08, `main` read back equal to GitLab's; GitHub then reported 3 dependency vulnerabilities: 1 high, 1 moderate, 1 low — **looked at 2026-10-08: none was reachable on the live site; PATCHED AND DEPLOYED the same day (`dpl_5G3mTdkJCg5Hbov3CLdM1oMC8Aj7`, Next.js 16.3.8; `npm audit` 20 → 12, critical 0) — GitHub's own list updates after the next push, check it then. See PROJECT-STATE Stage AP, TASK-213**) and `gitlab` (private). On 2026-10-08 `main` was 100 commits ahead of GitLab's `main` (`520795c`) — a plain fast-forward, no force needed — and a scan of those commits found none of your secret values, no private files, and only placeholder database URLs. **UPDATE 2026-10-08: GitLab's `main` is at `dfbb3aa`, identical to local `main` (read back with `git ls-remote`). Claude's own push was refused by its safety checker the first time and reported "Everything up-to-date" the second — so the push reached GitLab from outside the session. The two later record commits were pushed by Claude the same day (`dfbb3aa..fdc47ec`, read back equal).** (Original note:) ~~the push needs you to run `git push gitlab main` in your own terminal~~ GitLab also holds a tag `pre-scrub-backup` and a branch `claude/adoring-allen-089b26`; neither is touched by that push.

---

## ✅ 2026-10-08 — ALL DATABASE UPDATES (0029–0049) ARE APPLIED ON PRODUCTION

**Done, and checked against the database itself.** Applied through the Supabase SQL editor in your signed-in Chrome, each file loaded by script and **checksummed against the file in the repo before Run** (the editor's own paste had cut `0034` short). State when I started: 0029, 0030, 0032, 0033 applied; **0031 half-applied** (only its first block, `connections`, existed — the rest was added); 0034–0049 not applied. **One real gap found and fixed:** 0033 had been applied without its last lines, so anonymous visitors could call `role_interest` (a counts-only function that reads across candidates) — the `revoke … from public, anon` and `grant … to authenticated` were run, plus two missing column descriptions on 0030 and 0032.

**Checked afterwards:** a 21-line state query shows every update present; an audit shows **no table without row-level security** and no credit, referral or interest function callable by a signed-out visitor (three database trigger functions, one of them the original sign-up handler, can be called by `anon` in name only — a trigger function cannot be run directly); `npm run verify:rls` **passes every check**, including all the new tables and "a signed-out visitor cannot call `role_interest` (401)". **Walked in the app, signed in as you:** Profile → Account shows 0 credits and a working invite link; the agent and saved-answers panels save and reload (I added a test answer, checked it persisted, and removed it); Ask Saaf's "queue my best Easy-apply roles" returned a real proposal card (two roles at 70 and 65) with the "nothing is submitted" note — **I did not press the button**; the Coaching page's office-hours section no longer says an update is missing. **Your settings are unchanged** (agent min score 75, target 5 — I briefly set 60 to see a proposal and restored it).

**What is still open:** the extension at 0.7.0 has not been loaded or run by anyone; no promo code, coach or office-hour session exists yet (you add them); the daily ingest has not run since the updates, so the "reposted", "posting closed", pay and work-mode fields fill in at its next run. `scripts/migration-state.sql` re-runs the state check any time.

---

## 🔶 2026-10-08 (session 2) — 48 of 57 Phase 17/18 tasks LIVE (deployed 2026-10-08 10:44 IST, `dpl_HBW4jkVsCzFJdUuTidwnz7iMXdEJ`), nineteen database updates still waiting

**UPDATE — DEPLOYED.** The code below is live at https://saaf-ten.vercel.app. **Checked on the live site as a visitor:** 22 public pages return 200 (the landing page with its "254 roles added to Saaf in the last 24 hours" line, `/jobs` search, `/roles/…`, `/remote`, `/blog`, `/compare/…`, `/extension`, the keyword pages); invented slugs 404; the nine signed-in routes redirect to sign-in; `/api/dev-signin` is 404; the sitemap lists 5,166 URLs (5,000 jobs, 39 role pages, 32 role-in-city, 75 keyword pages, 3 posts, 3 comparisons); a role page carries its list data and a job page its JobPosting data; no browser errors. **NOT checked on the live site:** any signed-in screen (they need your sign-in, and most need the database updates), the extension. The deploy needed one fix first: the extension capability list had to move from `extension/` into `src/` because the deploy leaves `extension/` out. Staging hit the known "Not authorized" reply; the RUNBOOK re-link in the staged copy fixed it on the first try (project and team ids unchanged; the token file was deleted). `phase-18` is not merged into `main`.


**Written, not shipped.** Branch `phase-18` is **38 commits ahead of `main`**; nothing deployed, nothing pushed. The live site is still the 03:01 IST deploy (`dpl_9sX4KDQm9YnKcQkMa31eLmiKN6ST`). Scoreboard (`npm run parity`, a file that exists only on this machine — see PROJECT-STATE Stage AN): **HAS 109 · PARTIAL 13 · MISSING 11 of 133** (it was 36 / 55 / 42 on 2026-10-07). **Checked before this note:** 1,781 tests pass, lint 0 errors, typecheck clean, **`next build` succeeds**. What is **not** checked: the extension on any real page, and every screen that needs a database update has been seen only in its "update missing" state.

**Only you can do these, in this order:**

1. **Apply the database updates, in order, then run `npm run verify:rls`.** ⚠️ **The dashboard's SQL editor cut `0034` short on 2026-10-08** (it sent only the first part of the file: "unterminated dollar-quoted string"). The SQL is fine — all 48 files apply cleanly, in order, to an empty Postgres, and I exercised the credits, referral and ledger rules there — so apply with the script instead: `DATABASE_URL='…' scripts/apply-migrations.sh 0034 0049` (the Session-pooler string from Supabase → Connect; type it in your own terminal, never in chat). It applies each file whole or not at all and stops at the first failure. If you stay with the editor: paste ONE file into an empty tab, click once in it so nothing is selected, then Run. **Measured against production on 2026-10-08 (a read-only query, `scripts/migration-state.sql`): APPLIED = 0029, 0030, 0032, 0033; NOT APPLIED = 0031 and 0034–0049 (17 files).** So the command is `scripts/apply-migrations.sh 0031 0031` and then `0034 0049` (0031 first, because 0043 builds on its `connections` table). The list: `0029` `0030` `0031` (pending from before), `0032`–`0042` (the previous entry), then the new ones — **`0043_connection_sources`, `0044_feedback_inbox_surveys`, `0045_credits_referrals`, `0046_answer_bank`, `0047_site_requests`, `0048_agent_settings`, `0049_office_hours`**. Every screen says plainly when its update is missing, so deploying first is safe. **Read `0045` before applying** — it is the one that handles money-shaped data: the credits ledger can only be written by database functions, and a referrer is paid for at most 20 people.
2. **Reload the extension (now 0.7.0).** New: your own saved answers to employers' custom questions, "Tailor my résumé", the "This site" section with "Ask Saaf to support this site". **It is not in the Chrome Web Store** — the public `/extension` page and the auto-apply comparison page both say so. When it is listed, set `NEXT_PUBLIC_EXTENSION_URL` (it switches on the install nudge and the "Add to Chrome" button).
3. **Decisions only you can make** (each has a page with the numbers and my recommendation — none is built until you answer):
   - **Thin-content threshold N** for the role and city pages: `MIN_ROLES_TO_INDEX` in `src/lib/seo-pages.ts`, now 5. On the newest 5,000 roles that admits 39 role pages and 32 role-in-city pages (N=10: 25 and 14). After the deploy, watch Vercel's usage — the pages are built on first request and refreshed hourly.
   - **The paid plan** — `docs/PAID-PLAN.md`: seven decisions. The one that forces your hand: Vercel Hobby is non-commercial, so even announcing a plan needs Pro first (floor ≈ $45 ≈ ₹4,000 a month). Credits exist and everything is priced at zero.
   - **The employer side** — `docs/EMPLOYER-CONSENT.md`: six decisions. TASK-207/208 wait for your yes. Recommended first step: candidates can share with one employer; nobody can be found who did not act.
   - **Abroad mode** (TASK-209): the database holds only India roles, and the same boards list ~7.6× more elsewhere — ≈ 825 MB (estimated) against a 500 MB free tier. Upgrade the database, allow a download of the US Labor Department's public H-1B files for a company-level lookup, or leave it out.
   - **Four held staffing boards** on SmartRecruiters (8,476 / 3,861 / 1,782 / 294 India roles): leave out (my view) or add.
   - **Should `docs/PARITY.md` be tracked?** It is ignored by `*parity*`; I left it local because it describes the compared product.
   - **Interview-question content source** (TASK-164) — candidate-reported with provenance; no scraping.
4. **Add the first people.** Coaches (Supabase → Table editor → `coaches`, after you have checked who they are) and the first office-hour session (`office_hours`). Promo codes, if you want any, go in `promo_codes` (a code in capitals, a credit amount, an optional expiry and use limit). Until you add them, those screens say plainly that nothing is listed.
5. **Alert emails still will not arrive** until a sending domain is verified (flip `ALERT_EMAIL_LIVE` in `src/lib/alert-settings.ts`). Apple sign-in needs your Apple developer account; the human check on the public tools needs a provider key — neither is built (reasons in ROADMAP TASK-204/205).
6. **Say go and I will deploy** by `docs/RUNBOOK.md`. Recommended order: apply 0029–0049, merge `phase-18`, deploy, run one ingest (so reposts, closed postings and provider fields fill), then walk the new screens signed in — the credits card and invite link (Profile → Account & data), the agent and the saved answers (Profile → Application details), office hours (Coaching).

**Three things I found that you should know:** (a) `first_seen_at` is one instant for a whole ingest batch, so "newest" by it meant nothing — the public lists now sort by the employer's posted date; (b) the 0.6% of postings that state pay (measured today on 4,000) does not match the 2.6% recorded earlier — not reconciled, the blog quotes only the new one; (c) the extension's README said 22 sites; the list has 23, and **only one of them (Greenhouse) has ever been checked against a real form**.

---

## 🔶 2026-10-08 (night) — 16 more tasks BUILT on `phase-18`, NOT LIVE, eleven database updates waiting

**Written, not shipped.** Branch `phase-18` (16 commits off `main`); nothing deployed, nothing pushed. HAS rows on the scoreboard: 48 → 76 of 133 (`npm run parity`; **that file exists only on this machine — see PROJECT-STATE Stage AN**). **Only you can:**

1. **Apply the database updates, in order, in the Supabase SQL editor, then `npm run verify:rls`:** `0029` `0030` `0031` (still pending from before) then **`0032_role_reposts`, `0033_role_interest`, `0034_resume_primary`, `0035_tracker_signals`, `0036_job_reports`, `0037_saved_searches`, `0038_self_id`, `0039_service_flags`, `0040_search_history`, `0041_role_provider_fields`, `0042_alert_settings`**. Each screen says plainly when its update is missing, so deploying first is safe — but none of the new chips, history, saved searches, primary résumé, work-mode filter, reports or alert settings can be seen working until you do. Read `0033` (a function that reads across users, counts only, never ids), `0038` (special-category answers a candidate types themselves) and `0039` (the kill-switch table) before applying.
2. **Reload the extension (now 0.6.0)** — queue view, coverage report, the kill switch and typed self-ID answers are all in it. Try one real application you want, watching the tab.
3. **Know where the kill switch is:** Supabase → Table editor → `service_flags` → `apply_for_me_paused` → `true` stops every extension at its next job and its next Submit (docs/RUNBOOK.md). It fails open if Saaf is unreachable.
4. **Alert emails will not arrive** even with settings saved: the sender is Resend's shared test address. Verify a domain, then flip `ALERT_EMAIL_LIVE` in `src/lib/alert-settings.ts`.
5. **Decide:** (a) should `docs/PARITY.md` be tracked? It is ignored by `*parity*`; I left it local because it describes the compared product. (b) The role/city public pages (TASK-158) need your threshold for "enough roles to index a page". (c) TASK-164/165/166/170 are decisions, not code — see ROADMAP.
6. **Nothing here needs a deploy decision from you yet** — say go and I will follow `docs/RUNBOOK.md`. Recommended order: apply 0029–0042, then deploy, then run one ingest so reposts, closed postings, work modes and contract types start to fill.

---

## 🔶 2026-10-08 (later) — the feed redesign is LIVE: `dpl_9sX4KDQm9YnKcQkMa31eLmiKN6ST`

**Deployed 2026-10-08 03:01 IST** — TASK-211: the compact icon rail, one top row of tabs and search, one row of filter pills, the All-filters drawer, the card inside its four-row budget, and the tabbed detail panel. Checked live as an anonymous visitor (same checks as the earlier deploy, all passing): signed-in routes redirect to `/signin`, `/api/dev-signin` is 404, 5,000 job pages in the sitemap and one returns 200. **Not checked live:** the signed-in screens themselves (they need a magic link) — they were walked on localhost. **Only you can:**

1. **Open it signed in and tell me what still feels wrong.** The structure now follows the teardown's layout; the look is still Saaf's own dark system. If you want the light grey / white-card look, say so — a light theme is already defined in `globals.css`.
2. Everything in the entry below this one still applies (apply migrations 0029–0031, reload the extension, save a résumé to see the tailor review).

---

## 🔶 2026-10-08 — the rebuild is LIVE: 48 of 133 rows, `dpl_F98hGDXtJMUeGWvUUL64NAC7gDRo`

**Deployed 2026-10-08 01:48 IST to https://saaf-ten.vercel.app** — the whole stack since Phase 12 (extension parity, public job pages, feed preferences, the eight "blocked" gaps, and Phase 17 so far). `main` is fast-forwarded to it locally and **not pushed**. Scoreboard: `docs/PARITY.md` (`npm run parity` → HAS 48 · PARTIAL 46 · MISSING 39). Checked live as an anonymous visitor: `/today`, `/applications`, `/profile`, `/resume/tailor`, `/coaching` all redirect to `/signin`; `/api/dev-signin` is 404; the sitemap lists 5,000 public job pages and one returns 200 with `JobPosting` data; the ATS checker, `/audit`, `/api/audit/today` and the extension scoring API respond. **Not checked live:** anything behind sign-in (it needs a magic link to your inbox) — look at it yourself. **Only you can:**

1. **Apply the three database updates** in the Supabase SQL editor, in order, then run `npm run verify:rls`: `supabase/migrations/0029_rejected_stage.sql`, `0030_feed_preferences.sql`, `0031_network_questions_coaching.sql`. Until you do, the live site is **missing** these: the Rejected column on the tracker (0029); hidden jobs and saved filters (0030); the LinkedIn-connections upload, the interview-question bank and the coaching directory (0031). Each screen says plainly that its update is missing; nothing is broken. Read 0031 first — it creates tables that hold other people's names from a candidate's own upload, which makes you the data controller under India's DPDP Act.
2. **Scores correct themselves tonight.** The nightly recompute (23:00 UTC ≈ 04:30 IST) re-scores everyone with the 2026-10-08 skills fix ("Excel" had been matched inside "Excellent"; skills average award 34% → 24%). Until then live scores are a few points high.
3. **Look at it signed in.** The tour on `/today`, the five-tab profile, "Download my data", and the fit analysis. And **save a résumé** (ATS checker → Save) so `/resume/tailor` can be seen: it was tested but never walked, because a session should not put résumé data in your account.
4. **Reload the browser extension (0.5.0)** from the repo's `extension/` folder — Vercel does not ship it — and try "Apply for me" on ONE job you want, watching the tab. A wrong submission cannot be taken back.
5. Still open from before, unchanged: paid-plan decision (price, provider, Vercel Pro), a verified email domain, an Apple developer account, a funding-data licence, coaches, employer-issued ATS keys, a lawful source for interview questions, and the database-size budget for US roles.

---

## 🔶 2026-10-07 — Jobright teardown + build spec done (subproject, nothing deployed, no app code changed)

> ⚠️ **The GitHub repo is PUBLIC.** The 14 teardown files are committed only on the **local** branch `jobright-teardown`, which must **never be pushed** or merged into `main` before counsel reads `docs/jobright-map/10-build-blueprint.local.md` §0 — your own `.gitignore` says competitor research is "not ours to publish". `public-job-pages` carries only the records and `docs/REBUILD-KICKOFF.md` (what to read, preflight, decisions, first task) for the next session.

Files: `docs/jobright-map/` (private, untracked). **Only you can:**

1. **Check your Jobright Agent setting.** It reads *Automated Mode, more than 50
   jobs a week, tailored résumé and cover letter on* — set before this session,
   not changed by it. One job is queued ("Awaiting Application Start"); a session
   never pressed Start. Confirm that is what you want.
2. **Tidy the test traces on your Jobright account (optional):** one Explore
   history entry and one generated cover letter on the DaVita "Analyst, Business
   (ROPS)" job.
3. ~~**Legal check before building from this.** Jobright's Terms of Service bar reverse-engineering
   their software, scraping and bypassing access limits, and claim their text, graphics and design.
   The teardown was black-box and read-only, but have a lawyer read `docs/jobright-map/10-build-blueprint.local.md`
   §0 (guardrails) before a public launch. Never copy their code, wording, visuals or data.~~ **Closed 2026-10-07 by the founder: the legal check is complete, no IP issue (CLAIMED — no written opinion seen).** The teardown files still live only on the local branch `jobright-teardown` because the GitHub repo is public; say so if you want them published.
4. **Status of the two things you asked me to finish (2026-10-07):** (a) the tailored résumé **was generated once** (authorised) — one copy now sits in the DaVita "Analyst, Business (ROPS)" job's tailor history; delete it there if unwanted; (b) the **extension walk was blocked** by a safety classifier when it tried to open a real application form in your Chrome — not retried. If you still want it, do it yourself while I read your description, or tell me a specific form you accept being filled (never submitted) and I'll ask the guard again.
4b. **Four things can only be seen by you (2026-10-07, file 12):** create a throwaway free Jobright account and have me read-only walk **onboarding** and stop at the **checkout** payment form; run the **extension** on a form yourself and describe it; decide whether the **employer** side is worth an account. Prices already found: see `docs/jobright-map/12-unseen-items-findings.local.md`.
5. ~~**Decide Phase 17** (ROADMAP TASK-155–166, proposed only): the comparison found 27 buildable gaps; your 2026-10-02 verdict was ship and launch with no new building. Say which, if any, to start.~~ **Decided 2026-10-07: the rebuild started** on branch `phase-17` (nothing there is deployed or pushed). You also reversed the decisions that pulled back from it (PROJECT-STATE Stage AK). **Only you can:** (a) say whether to **deploy the backlog first** (merge `extension-parity` → `public-job-pages`, apply migrations 0029–0031, follow `docs/RUNBOOK.md`) or keep building on the undeployed stack — recommended: deploy first; (b) if you want a **paid plan** (TASK-170): the price, the provider, and the move from Vercel Hobby to Pro — Hobby bars even announcing a price; (c) for the **employer side** (TASK-169): decide who the first employer user is and what a candidate agrees to share, before any schema.
6. **Say whether to continue:** onboarding, the extension and the plan price were
   not seen (they need a new account, the extension, or you opening the plan page).

---

## 🔶 2026-09-25 (night) — the eight "blocked" gaps are BUILT, NOT LIVE, NOT FULLY SEEN

On `public-job-pages`. Details: ROADMAP Phase 16, PROJECT-STATE Stage AI.
**Your permanent rule "never apply on the candidate's behalf" is reversed** as
you asked — "Apply for me" submits applications (off by default, 25 a day,
never past a CAPTCHA, Applied only on the employer's confirmation).

**What only you can do (TASK-149, TASK-150):**

1. ~~**Let a session look at the screens, or look yourself.**~~ **Done 2026-10-02**
   — the screens were walked on localhost and two small defects fixed. What is
   still unseen: "Apply for me" actually running, which needs the real extension
   in your Chrome (step 4).
2. **Apply `supabase/migrations/0031_network_questions_coaching.sql`** in the
   Supabase SQL editor, then `npm run verify:rls`. It creates tables holding
   your users' uploaded connections (other people's names), so read its
   comments first — you are now the controller of that data under India's
   DPDP Act.
3. **Add your first coaches** in Supabase → Table editor → `coaches` (name,
   headline, booking link). The page is empty until you do; applications land
   in `coach_applications`.
4. **Reload the extension** (0.5.0) and try **Apply for me** on ONE real job
   you want, watching the tab. A wrong submission cannot be taken back.
5. **Decide on funding data.** Company pages show open data but no funding
   rounds; that needs a Crunchbase licence (paid).
6. Then, as before: 0029 + 0030, and say go to deploy.

---

## 🔶 2026-09-25 (later) — public job pages + tracker link reading + Rejected: BUILT, NOT LIVE

**What exists:** on the branch **`public-job-pages`** (built on top of
`extension-parity`, so merging it brings both). Every job Saaf reads gets its own
public page that Google can find; pasting a job link into the tracker fills in
the company and title; the tracker has a Rejected column. Details: ROADMAP
Phase 14, PROJECT-STATE Stage AF (includes the full Jobright pass/fail table).

**What only you can do (TASK-131 + TASK-139), in this order:**

0. **Also apply `supabase/migrations/0030_feed_preferences.sql`** (added later the same day — hidden jobs and saved filters). Paste it in the Supabase SQL editor. Until then Hide and Save this view say the update is missing; search and skill correction work without it.
1. **Apply migration `supabase/migrations/0029_rejected_stage.sql`** in the
   Supabase SQL editor — paste the one line on its own. Until then the Rejected
   column refuses moves and says why; nothing else is affected.
2. **Merge `public-job-pages` into `main` and deploy** (a session can do this
   on your go-ahead). This also ships the extension work from Phase 13.
3. **Tell Google the pages exist:** Google Search Console → add the site →
   submit `https://saaf-ten.vercel.app/sitemap.xml`. Needs your Google account.
   Without it Google finds the pages slowly, if at all. (Worth doing on a real
   domain rather than `vercel.app` if you plan to buy one — rankings do not move
   with you.)
4. **Optional:** sign in to Jobright yourself in the browser pane if you want
   their signed-in screens compared too — a session cannot create an account or
   type a password.

---

## 🔶 2026-09-25 — the extension parity pass is BUILT, NOT MERGED, NOT LIVE

**What exists:** on the branch **`extension-parity`**, committed. The extension
(version 0.4.0) now fills dropdowns, yes/no questions, tick-box lists, searchable
pickers, your résumé file and your CTC (only from figures you type into it),
shows a dark card with a match ring, and syncs with the website — roles you save
or fill on job sites land on your tracker next time you open Saaf. The mock
interview has "Speak your answer" and "Hear the question". **Nothing of it is on
`main`, the live website, or anyone's Chrome.** Details: ROADMAP Phase 13,
PROJECT-STATE Stage AE.

**No migration.** Nothing to paste into Supabase this time.

**What only you can do (TASK-126):**

1. **Decide you want it.** It reverses four refusals the extension was built
   around (salary, dropdowns, radios/tick-boxes, file uploads). Each now works
   only from answers you store, and every pick is listed on the card — but it is
   your call, and it is recorded as reversed.
2. **Merge `extension-parity` into `main` and deploy** the website (putting the
   new code on the live site — a session can run it on your go-ahead, per
   RUNBOOK).
3. **Reload the extension in your own Chrome:** `chrome://extensions` → Saaf →
   the reload arrow. Then open the Saaf website signed in once, so your profile
   syncs into it, and add your CTC and yes/no answers in its popup if you want
   those filled.
4. **Try it on one real application you were going to send anyway** — a
   Greenhouse or Lever form. Nobody has run it on a real ATS form yet; the
   preview browser cannot load extensions.

**Still not done, and not a session's to do:** Chrome Web Store submission
(needs your developer account and a $5 fee; review takes days to weeks).

---

## ✅ 2026-09-24 — the Jobright-style workspace is LIVE, `dpl_RdV14SSjhUtJTeAvZyewSTjDxeHK` (~~BUILT, NOT MERGED, NOT LIVE~~)

**Done on your go-ahead:** migration 0028 was already applied (checked), access
rules re-verified, `main` merged, deployed to https://saaf-ten.vercel.app and
checked there signed-out. **Still yours:** sign in with Google on the live site
and walk the new screens once — a session cannot sign in as you on production —
and sign up once with a throwaway email to see the new onboarding end to end.
`main` is not pushed to GitHub.

### Superseded — the entry as written on 2026-09-23

**What exists:** the whole parity pass (dark zinc/indigo look, three-column
workspace, job feed with filter pills and a match-analysis panel, résumé
tailoring studio, cover-letter studio, outreach drafts, scored mock interviews,
six-stage tracker with drag-and-drop and a table view, new onboarding) is on the
branch **`jobright-parity`**, committed. **Nothing of it is on `main` and
nothing is on the live site.** Checked on localhost against the live database;
every test row was removed afterwards. Details: ROADMAP Phase 12, PROJECT-STATE
Stage AD.

**What only you can do, in this order (TASK-117):**

1. **Decide you want it live.** It changes how every screen looks and
   un-parks the co-pilot — both were your calls to reverse, and both are
   recorded as reversed.
2. **Apply migration `supabase/migrations/0028_workspace_records.sql`** in the
   Supabase SQL editor (paste the whole file). Until it is applied: the
   "Applying" column refuses moves (and says why), the tracker's record fields
   (date applied, résumé version, salary, interview date), seniority / target
   cities / pay floor, and the sidebar status do not save. Everything else works.
3. **Run `npm run verify:rls`** after applying — 0028 adds no policies, but
   this is the standing check.
4. **Merge `jobright-parity` into `main` and deploy** (a session can run the
   deploy on your go-ahead — `saaf` project, rsync without `.git`).
5. **Walk sign-up once on the live site** with a throwaway account — the full
   onboarding (upload → preferences → the new summary screen) was not walked
   end to end, because doing it locally would have re-confirmed your own profile.

**Known limit you should know before it goes out:** the AI drafts are checked
for invented numbers, employers, years and qualifications — but not for
invented *activities* (a draft said "I have led full-cycle recruiting"). The
existing quick-draft panel has the same limit. Recorded, not fixed.

---

## ✅ 2026-09-23 — ~~DEPLOY TASK-106 FIRST~~ DEPLOYED `dpl_CmXXH16qoaxUiWyVvtBthbWB2soS`: email sign-in no longer opens an existing account

On the live site today, typing someone's email on /signin signs you in AS
THEM — their profile, phone, salary expectation, saved résumés, tracker, and
the delete-account button. Instant sign-in (no inbox round-trip, chosen on
2026-09-03 to stay at ₹0) never checked that the typist owns the address, and
for an existing address the token it mints is that account's session.
Reproduced with a throwaway account; nothing real was touched.

~~**The fix is committed and not deployed**~~ **Live since 2026-09-23**
(commit `466c419`, deployment `dpl_CmXXH16qoaxUiWyVvtBthbWB2soS`), verified ON
PRODUCTION with a throwaway address: first use → new account, /start; the same
address again → "That email already has a Saaf account… sign in with Google",
no session. Throwaway deleted; 9 accounts, as before. The exposure window was
2026-09-03 → 2026-09-23. Nothing in the logs available to a session shows
whether it was ever used — if that matters, Supabase's auth logs for that
window are where to look (founder account).

---

## ✅ 2026-09-23 — "Posted N days ago" is LIVE (~~BUILT and NOT LIVE~~ — deployed `dpl_BifT74tcXs6WVeYfSMSjKnApokUg`, backfill run)

TASK-086 works on localhost against the live database (32 of 40 of the founder's
shortlist cards show a date). ~~Nothing is deployed.~~ ~~Nothing is committed — the working tree holds it.~~ **Done 2026-09-23, in this order:** deploy `dpl_BifT74tcXs6WVeYfSMSjKnApokUg`, then the backfill (3,792 written, 0 failed, re-run finds 0). The runbook as it was followed:

1. **Deploy** (the founder's go-ahead; the session can run it — `saaf` project,
   rsync without `.git`, never `--prebuilt`).
2. **Immediately after:** `npm run backfill:posted-dates -- --write`. The dry run
   found 3,802 Greenhouse roles whose stored date is the last edit, a median
   46.9 days too fresh. Run it *before* the deploy and the old live ingest puts
   the wrong dates straight back; skip it and every Greenhouse card on the live
   site overstates freshness for up to a rotation.
3. **Expect Workday cards to show no date at first.** 10,378 roles (41% of the
   index) have none stored; each fills in as ingest next visits its board.

Why, and the six parts of the "Jobright parity" prompt that were declined:
`docs/PROJECT-STATE.md` Stage AA. Next tasks: `docs/ROADMAP.md` Phase 10.

~~Nothing is committed.~~ **Committed as `1ff17d1` on `main`, 2026-09-23.** ~~Still
not deployed, not pushed.~~ **Deployed (with `71a5922`); still not pushed.**

## ✅ 2026-09-23 (end of day) — TASK-091 → TASK-106 DEPLOYED `dpl_CmXXH16qoaxUiWyVvtBthbWB2soS` (~~NONE DEPLOYED~~)

TASK-091 (large upload no longer crashes), TASK-092 (branded error, not-found
and loading screens) and TASK-093 (Jobs page 19.2 s → 2.9 s first load) are in
the working tree, walked in a browser on localhost / a local production build,
with every gate green (test 657, lint 0 errors, typecheck, bench, bench:match).
~~Nothing of this is on the live site yet.~~ **All of it is live** (commit
`466c419`). Verified on production: every public route answers (unknown route →
branded 404; `/api/dev-signin` → 404), the report-only CSP header is sent,
signed-out `/applications` sets the `saaf_next` cookie (Secure, HttpOnly), the
TASK-106 refusal works end to end, and a 4.7 MB file on the checker shows "over
4 MB" with no crash. Signed-in screens are verified on localhost against the
same database — Google sign-in on production is the founder's alone. `main` is
not pushed.

## ⚡ 2026-09-23 — QA pass done; two decisions need the founder

`docs/QA-AUDIT.md` has 25 findings; ROADMAP Phase 11 turns them into TASK-091 →
TASK-104. A session can build all of them **except where these two decisions
gate it**:

| Decision | Why it is yours | Gates |
|---|---|---|
| **The accent green and accessibility.** White text on it measures 4.48:1 (floor 4.5); green text on the score ring's dark panel 3.66:1. The first wants a darker green, the second a lighter one | It is the brand's one colour, and `docs/DESIGN.md` is law — a session may not move a token unasked. Options are in TASK-101b | TASK-101b |
| **Load analytics later on the landing page?** PostHog is ~99 KB of the page's load window and most of its remaining 120–150 ms of blocking time; it does not delay the hero (LCP unchanged without it) | Deferring it to first interaction loses pageviews of visitors who leave within seconds — the number a launch funnel is measured by. Speed vs. measurement is yours to trade | TASK-104 follow-up |
| **Raise the 500-role shortlist cap?** Disclosing it is now built (TASK-094). Measured: **6 of 9 users are at the cap**; your own search matches 5,368 | A bigger cap is a product choice about list length vs precision. Since TASK-093 only the rendered cards are read whole, so page weight no longer grows with the cap — but the nightly scoring time and `gate_results` rows do | a follow-up to TASK-094 |

**Live-site facts from the pass that you should know without reading the audit:**
a résumé between 4.5 and 5 MB crashes the live checker to a blank error page
today (TASK-091 fixes it), and the Jobs page can take 10–19 seconds on the first
visit of the day (TASK-093).

---

## ⚡ Resuming after 2026-09-14? Start here.

~~**All work since 2026-09-12 is on the branch `ats-parity`, not on `main`.**~~
~~Eight commits, 55 files, +4,524/−269.~~ **Merged the same day — corrected in
place rather than deleted, because this block was true when it was written and
false an hour later.** `ats-parity` was fast-forwarded into `main` and the branch
deleted; only the reflog still names it. **Nine commits, 55 files, +4,727/−269
are on `main` now** (the ninth is this file's own handoff commit), working tree
clean, every gate passing. **There is nothing to merge and no branch to check
out.** If a future session reads "the work is on a branch", re-measure before
believing it — this line went stale once already.

~~⚠️ **Still true, and it is the part that matters: nothing is deployed.**~~
✅ **DEPLOYED 2026-09-14**, `dpl_5Ky6uK4tafD6gb9ujfdzvXusf29Z`, verified in a
browser against production. Migration `0025` is applied and its backfill has run.
Everything in the table below is live.

⚠️ **The five-day figure this block briefly carried was wrong, and the
correction is the useful part.** Every commit since the 2026-09-09 deploy is
dated 2026-09-14 — check it with `git log --date=short f98f6b4..HEAD`. Stage R
was written and shipped the same day. What was five days old was the *previous
deploy*, not any unshipped fix.

The real hazard stands, though: for most of today the repository held two scorer
fixes the live site did not have, and this block said "on a branch" rather than
"not deployed". **Committing is not shipping, and this block is where that gets
noticed or missed.** Whoever edits it next: say what is live, not what is
written — and put a date next to it.

~~**`main` is 23 commits ahead of `origin/main` and that is the one chore still
open.**~~ **Stale — corrected 2026-09-15. It was 1, and it is now 0: everything
is pushed.** The remote is a backup and does not deploy — pushing is not
deploying and deploying does not push. Production is *behind* `main`; GitHub is
current. Re-measure with `git rev-list --count origin/main..main` rather than
trusting this line, which has now gone stale once.

```
git log --oneline f98f6b4..HEAD          # the nine commits, oldest first
git rev-list --count origin/main..main   # unpushed — 19 when this was written
git reflog --date=short | grep parity    # the merge, if you want the trace
```

### What landed, in one line each

| Commit | What |
|---|---|
| `Measure the checker before changing it again` | `npm run bench` — the ATS checker's benchmark, 26 documents, accuracy + invariance gates |
| `Read the whole page…` | The PDF parser rewrite, the two-part score, the report UI |
| `Stop comparing a v1 score to a v2 one` | Migration `0024` + the backfill |
| `Write down what the corpus found…` | Stage Q |
| `Stop burying the half nobody else can build` | The index re-score and market panel promoted |
| `Stop the fix button lowering the score` | Round-trip defects found by using the product |
| `Stop the scorer paying out for questions nobody asked` | **The P0 scorer fixes** — see Stage R |
| `Say the employer's name, the city once…` | **The P1 fixes** |

### The one thing blocking everything, still

**Buy a domain and put the product in front of ten people.** It is the third P0
from the 2026-09-14 teardown and the only one a coding session cannot do.

Both scorer defects fixed on 2026-09-14 — a 28-point constant, a 74% "strong
match" on zero skill overlap — are exactly the class of problem that one
afternoon with five real candidates surfaces immediately and that no amount of
solo building does. **Recruit engineering, data and product candidates**, which
is what the index actually serves: HR Business Partner returns three strong
matches and marketing is 1.8% of the index.

Everything else on this page is refinement. This one is binary, and it has been
deferred through four phases.

### Two benchmarks now gate changes, and both must be run

```
npm run bench          # the ATS checker — 26 documents, accuracy + invariance
npm run bench:match    # the MATCH scorer — score spread + average award per component
```

⚠️ **`bench:match` is the one that matters most and is newest.** Any component
averaging above ~90% is a constant wearing a weight, not a component. That check
is what found three of them. Do not change `src/match/score.ts` without running
it before and after.

⚠️ **`bench:match` reads the live index and needs `.env.local`.** It writes
nothing. `npm run bench` is offline.

### The corpus is real and is NOT in git

`bench/corpus/real/` holds nine of the founder's own résumé variants and
`bench/corpus/samples/` holds eleven public samples with invented people. Both
are gitignored — real résumés are personal data and this product's promise is
that an uploaded file is parsed and dropped. **A fresh clone has only the
synthetic corpus and will report 6 documents, not 26.** Re-fetch the public
samples with `npm run bench:samples`; the founder's own variants have to be put
back by hand.

### Scores in the database are from the new model

`npm run recompute` equivalent was run on 2026-09-14 after the scorer change
(`recomputeAll()` from `ingest/recompute.ts`), so `gate_results` holds v2 scores.
The nightly cron does this anyway. If you change the scorer again, **stored
scores are stale until recompute runs** — `/today` reads `gate_results`, it does
not rescore on load.

---

## ⚡ Resuming after 2026-09-15? Build #2 is deployed and waiting on you.

**Live: `dpl_ALc6MEYG1KUt6a6YGt8MLUNwyUAa`.** Phase 8 is 7/14 and **every task a
session can do without real users is finished.** No migration is pending — Build
#2 shipped no schema change, because both epics that needed one were cancelled by
their own measurements.

**Two tasks are left and both are yours.** They have now outlasted six phases.

| | What | Why it blocks everything |
|---|---|---|
| **TASK-075** | Buy a domain, verify it in Resend | Email sign-in reaches nobody. Google OAuth is the only working door, so every beta user must have a Google account |
| **TASK-076** | Put it in front of 10–100 candidates | Engineering, data, product — what the index serves (engineering 39.2%, HR 1.6%) |

⚠️ **Build #2 cancelled two of its own epics, and that is the headline.** Both
were cancelled by measurement, not by opinion, and both had looked finished:

- **Salary scoring** — 2.2% of 3,468 live India roles carry any salary at all.
  The probe's first version said 27.4% and was wrong. `npm run probe:salary`.
- **Interview prep** — described here as the highest-value unshipped asset. Run
  against 60 real postings it asks *"How much have you worked with Poland?"* in
  78% of its questions. Reverted the same day. See PROJECT-STATE Stage U.

**What that pattern means for the next session:** this repository keeps producing
things that pass their tests, read correctly, and are wrong against the live
index. The tests are written against fixtures somebody wrote. **Point it at the
index before believing it**, and the four open judgment calls at the end of Phase
8 are not decidable at all without TASK-076.

---

## ⚡ THERE ARE TWO GIT REMOTES NOW, AND THE GITHUB ACCOUNT IS FLAGGED (2026-09-15)

**`git push` alone still goes to GitHub. GitLab needs `git push gitlab main`.**
Neither deploys anything — production is Vercel, by CLI, and is unaffected by
both.

| Remote | URL | Why it exists |
|---|---|---|
| `origin` | `github.com/akshaykeerthi3301-rgb/Saaf` | The original. Still works for push |
| `gitlab` | `gitlab.com/akshaykeerthi3301/Saaf` | Added 2026-09-15 so colleagues can be granted access at all |

⚠️ **THE GITHUB ACCOUNT IS FLAGGED BY GITHUB'S ABUSE DETECTION, AND IT IS NOT
NEW.** Verified 2026-09-15 with an anonymous positive control:

- The profile and all 8 public repos **404 to logged-out visitors**; the same
  test returns 200 for `torvalds`, `vercel` and `supabase`, so the test is real.
- `/users/akshaykeerthi3301-rgb` 404s **even authenticated**, while the same
  endpoint returns data for other users.
- Adding a collaborator is refused at **read, write, maintain AND admin** —
  HTTP 422 `User could not be added`. The block is total, not permission-level.
- **Push, private repo access and the API still work.** That is why this went
  unnoticed.

⚠️ **ACTIONS HAVE BEEN DISABLED ON THIS ACCOUNT SINCE LATE AUGUST**, which a
session already recorded on 2026-09-03 in the header of
`.github/workflows/daily-ingest.yml` — *"Actions has been disabled for this
user"*, still true today. **That is why ingest runs on Vercel Cron and must stay
there.** Do not try to move scheduling back to Actions.

**Most likely cause, inferred and NOT confirmed** — GitHub never publishes a
reason. `oloop-sandbox-spike` (2026-08-17, two commits) dispatches a workflow to
a **self-hosted runner**, writes Python at runtime, executes it, and measures
dispatch-to-result latency. Structurally that is indistinguishable from using
Actions as a general compute service, which is the most-policed abuse on the
platform. Secondary signal: `derivatives-bot` is **60 of 79 commits** authored by
a bot on a daily schedule. A support appeal is open with GitHub (agent "Tessa").

⚠️ **DO NOT CREATE A SECOND GITHUB ACCOUNT TO GET AROUND THIS.** It is a Terms
of Service violation in itself and identical repository content is among the
clearest signals GitHub matches accounts on. Moving to another host is fine and
is not evasion.

### A full backup exists and was verified by restore

`~/Desktop/projects/github-backup/2026-09-15/` — all 12 repos as mirrors, 327
commits, plus `manifest.json` and `RESTORE.md`. **Verified rather than assumed:**
restoring `Saaf.git` produced tree hash `ec2efcb0`, identical to the live working
copy. ⚠️ It holds **only what was committed** — `.env.local`,
`bench/corpus/real/`, the `productos/` templates and `extension-key/key.pem` are
gitignored and are on the Mac alone. **The extension key is still in a session
scratchpad; if it is lost the extension ID changes and every install breaks.**

---

## ✅ DEPLOYED 2026-09-16 — `dpl_ARvB3JR54u71LNmvLYkNpvUCnbDN`

**Migration `0027` was applied by the founder on 2026-09-15 and the whole
Résumé Studio is LIVE at https://saaf-ten.vercel.app.** Verified in a browser
against production, not by grepping HTML:

| Checked on production | Result |
|---|---|
| Five-stage flow, `STEP 1 OF 5` → `STEP 4 OF 5` | ✅ |
| Stage 1 headline | ✅ "A parser reads 100% … 35 of 40 checks came back clean" |
| Gap table rows | ✅ title · experience · skills · qualification |
| Section picker | ✅ |
| `POST /api/extension/score` | ✅ **400**, i.e. the route exists and validated |
| `/`, `/audit`, `/api/audit/today`, `/tools/ats-checker` | ✅ 200 |
| `/api/dev-signin` | ✅ **404** — the dev door is correctly shut in production |

⚠️ **THE PROFILE SAVE WAS NOT TESTED ON PRODUCTION AND HERE IS WHY.**
`/api/dev-signin` 404s there by design, and email sign-in still needs the domain
(TASK-075), so there is no way to reach `/profile` signed in. It **was** verified
end to end on localhost against the SAME live Supabase database — all five
columns written, read back, confirmed by query — and production runs the same
code against the same schema. Treat it as verified-by-proxy, not verified-live.
**Founder: sign in with Google and save your profile once to close this.**

⚠️ **THE DEPLOY NEARLY SHIPPED A 404, AND THE RUNBOOK WAS THE BUG.** Its rsync
excludes were UNANCHORED — `--exclude 'extension'` and `--exclude 'bench'` match
that name at every depth, so they ate `src/app/api/extension/score/route.ts` and
`src/app/dev/bench/page.tsx`. A missing route deploys as a 404, not a failure;
the build would have gone out green with the scoring endpoint simply absent.
**Checks 2 and 3 in the runbook caught it** — they exist for precisely this and
they earned their place. `docs/RUNBOOK.md` now anchors every directory exclude
with a leading slash. Do not remove those slashes.

**Still true:** `main` is pushed to both remotes. Production is current with
`main` as of this deploy.

---

## ⚡ (historic) PHASE 9 WAS COMPLETE AND NOT LIVE — resolved by the deploy above.

**The whole Résumé Studio — five stages, the gap table, the section picker, the
scoped rewrite — is built, tested and pushed to both remotes. Production still
serves the OLD three-screen report.** It cannot ship until migration `0027` is
applied; see the ⛔ section below, unchanged and still correct. That migration
has now been outstanding for seven sessions and is the only thing between this
work and a user.

**What is live vs. what is written, 2026-09-15:** nothing from Phase 9 is live.
Every stage was walked in a local browser against the dev server, with and
without a target role, and both rewrite paths were exercised for real. That is
not production.

### The one thing to know before touching the rewrite

**Scoping the prose barely saves anything, and the copy must not claim it does.**
Measured with a pasted posting: summary-only **8%** cheaper, experience-only
**2%**. The prompt is ~895 of ~997 tokens and cannot shrink — a summary
rewritten without sight of the bullets is grounded in nothing and
`rewriteFailure()` rejects it, spending the tokens for no output. **Skills-only
is the only real saving (100%) because it makes no model call**, and a test
asserts zero calls because stage 3 prints that promise on screen.

⚠️ **The rate limit is now charged ONLY when a model will run.** Do not move
`checkRateLimit` back to the top of `optimise-resume.ts` — it was there, and it
locked candidates out of the free skills reorder for seven minutes.

⚠️ **`provider` can be `null`.** Any surface printing a provider label must
check it, or it will claim "Written with Groq" over a stable sort.

⚠️ **THE PLAN OF RECORD HAS NOW BEEN MEASURABLY WRONG FIVE TIMES** — Stage W's
two, Stage X's cut fourth row, Stage Y's "24 of 31 checks", and Stage Z's cost
premise. Every one was caught by measuring or by opening the page, never by a
test. `npm test` is 630 green and would have shipped all five. **Point it at the
index or at a browser before believing it.**

---

## ⚡ Resuming after TASK-084? (superseded by the block above)

**The Résumé Studio's first four stages are built, tested and committed. They
are not deployed, and they cannot be until migration `0027` is applied** — see
the ⛔ section below, which is unchanged and still correct.

**What is live vs. what is written, 2026-09-15:** production still serves the
OLD three-screen report (`input → report → preview`). The five-stage flow, the
gap table and the section picker exist only on `main` and on GitLab. Walked end
to end in a local browser against the dev server, with and without a target
role; that is not production.

**What a session picking up TASK-085 needs to know:**

- The flow is `input → score → gap → choose → apply → preview`. `input` is
  deliberately **not** a numbered stage; the stepper counts the five things done
  with a score, not the upload.
- Stage 3 (`choose`) already collects `selection.sections` and
  `selection.terms`. **TASK-085 should spend against that selection rather than
  rewriting the whole document** — that is the entire reason the stage exists.
- `reorderSkills()` is exported and wired as the free path. Keep it labelled
  **no model**; a ₹0 product that buries its free option looks like an upsell.
- ⚠️ **`RewriteResult.reverted` must keep rendering.** `ats-flow.tsx` calls it
  "the persuasive half" and it is the clearest proof the fabrication guard is a
  filter and not a badge.

⚠️ **THE PATTERN FROM THE LAST TWO TASKS, STATED PLAINLY BECAUSE IT KEEPS
PAYING:** the plan of record has now been measurably wrong **four times** —
Stage W's two, Stage X's cut fourth row, and Stage Y's "24 of 31 checks". Every
one was caught by measuring or by opening the page, never by a passing test.
`npm test` is 621 green and would have shipped all four. **Point it at the index
or at a browser before believing it.**

---

## ⚡ Resuming after TASK-083? The blocker below is still the blocker.

**Nothing changed about the deploy situation and nothing new is waiting on you
from this session.** The gap table (Phase 9 TASK-083) is committed, adds **no
migration**, and is unreachable in production until `0027` is applied — because
everything on `main` is. Read the ⛔ section immediately below; it is unchanged
and still correct.

**What is live vs. what is written, as of 2026-09-15:** the gap table is
**written and committed, not deployed**. It was walked end to end in a local
browser against the dev server — both the posting path and the no-posting empty
state — and verified against five real postings from the live index. None of
that is production.

**The one new thing worth knowing** is a judgement made against the plan, and it
should not be silently reversed: the plan's fourth table row was **cut** after it
printed six employer names and prose fragments against real postings. Ten prose
terms (`familiarity`, `science`, `computer`, `san`, …) are now filtered out of
the skill vocabulary at read time. **When `skills.json` is next rebuilt**
(`npx tsx scripts/build-skill-vocabulary.ts`, scans 13,919 descriptions), the
same ten are already in the build script's `NOT_SKILLS`, so the read-time filter
in `src/lib/taxonomy/skills.ts` becomes a no-op and should be deleted then —
**not before.** Full reasoning: `docs/PROJECT-STATE.md` Stage X.

---

## ⛔ STOP — read this before deploying anything (2026-09-15, end of session)

**`main` is NOT deployable right now.** Production is fine and is a few commits
behind; deploying `main` as it stands would break profile saving.

### The one blocker

`supabase/migrations/0027_profile_contact_fields.sql` is **written and not
applied**, and code that depends on it is already committed.
`src/app/actions/confirm-profile.ts:122-126` writes `phone`, `linkedin_url`,
`portfolio_url` and `notice_period`. Those four columns **do not exist in the
live database**, so a profile save would fail with a PostgREST error the moment
this reaches production.

```
1. Apply 0027 by hand in the Supabase SQL editor
2. npm run verify:rls
3. Open /profile signed in and SAVE — the four new boxes must persist
4. Only then deploy
```

⚠️ **`full_name` already exists in the live database and is in no migration.**
It is one of **12 undocumented columns** on `profiles` — `headline`,
`current_city`, `current_state`, `target_job_functions`, `years_of_experience`,
`master_resume`, `master_resume_text`, `target_job_types`, `target_location`,
`open_to_remote`, `resume_storage_path`, `onboarding_completed_at`. All are
empty (`{}`, `[]`, `0`, `false`, null) and nothing reads them. Note
`years_of_experience` duplicates the column the app actually uses,
`years_experience`. **A fresh database built from the migration files will not
match production.** Worth a cleanup migration; not urgent.

### Two things committed under a misleading message

`fecfcc6` says "Measure the rewrite by the same rules…" and its score fix is
real, but an over-broad `git add -A` also swept in migration 0027, the profile
contact fields, `extension/config.js`, the manifest changes and three scratch
files from `.tmp-key/`. The scratch files are now removed and gitignored; the
private key was never committed (`.gitignore:51` `*.pem` caught it). Nothing is
lost — just don't trust that commit's subject line to describe its contents.

---

## ⏳ The browser extension is HALF-MIGRATED to account sign-in

Shipped and working: **v0.2.0**, standalone, no account. The founder has it
installed and has tested it on a Greenhouse posting. It scores any posting on 32
ATS hosts and fills application forms from details typed into its own popup.

**In progress and NOT finished: v0.3.0**, which reads the candidate's Saaf
account instead of asking them to retype. Done so far:

| | |
|---|---|
| ✅ Extension identity pinned | id `idbookligbjgjhnohmgpklloakhoecpd`; the `key` is in `manifest.json` |
| ✅ `externally_connectable` | the web app is allowed to message the extension |
| ✅ `extension/config.js` | Supabase URL + anon key, both public by design |
| ✅ Profile contact fields | form + action + migration 0027 (**unapplied — see above**) |
| ❌ **The connect page** | nothing at `/extension`; no button that hands the session over |
| ❌ **Token handling** | no `onMessageExternal` in the service worker, no refresh |
| ❌ **Reading the account** | autofill still uses the popup, not `profiles` |

⚠️ **The private signing key is NOT in the repo** — correctly, since it is a
secret. It sits in this session's scratchpad at `extension-key/key.pem`. **If it
is lost the extension ID changes**, which breaks `externally_connectable` and
every install. Regenerating is easy; migrating installs is not. Move it
somewhere durable.

⚠️ **The founder's own account has NO saved résumé** (`resume_documents` is empty
for them). So the account-backed extension cannot score from a stored résumé.
The profile itself is rich — 20 skills, title, employer, years, city, preferred
role, and 206 scored roles — so **score from the PROFILE the way `/today` does,
not from résumé text.** That is the design change the connect work was heading
towards and it is not yet reflected in the code.

---

## ✅ Migration 0026 — applied by the founder, 2026-09-15

`supabase/migrations/0026_recruiter_foundation.sql`. **Applied and verified.**

| Check | Result |
|---|---|
| `candidate_discoverability` exists | ✅ — proves the migration actually ran, which the positive control alone does not |
| `npm run verify:rls` | ✅ all checks, including `roles: a signed-in CANDIDATE can still read the index (0026 positive control)` |
| `/today` in a browser, signed in | ✅ **456 matched roles, 219 in Bengaluru**, scores intact |

⚠️ **Both checks were needed and neither was sufficient.** The positive control
passes identically whether the new policy works *or* the migration never ran, so
the table-existence probe is what distinguishes them. And `verify:rls` mints a
fresh probe user with no shortlist, so it proves `roles` reads but never
exercises the `gate_results → roles` join that `/today` actually depends on —
which is the join a policy problem would bite first.

⚠️ **THE FAILURE MODE IS NOT AN ERROR.** This migration replaces the two policies
that let a signed-in account read the index — `roles` and `role_requirements`
were `to authenticated using (true)`. If the JWT claim does not evaluate the way
the migration assumes, nothing throws: **every candidate's shortlist silently
returns zero rows.** `verify:rls` now carries a positive control that asserts a
signed-in candidate can still read the index, precisely so this is caught by a
script and not by a user.

**Why it exists.** `roles` carries `company_name` and `apply_url`, so every
authenticated account can largely reconstruct the registry that the `boards`
table exists to protect. That is fine only while every authenticated account is a
candidate — which a recruiter account invalidates on the day it is created,
before any recruiter code is written. Closing it first is the whole point.

**What it does NOT add:** no recruiter UI, no employer identity table, no
candidate search index, and no way to become a recruiter (`account_type` is
service-role-only). `candidate_discoverability` is opt-in, default absent, and
has **no recruiter read policy at all**.

⚠️ **It fails OPEN towards candidates, deliberately.** A missing claim reads as
`candidate` and the row is allowed. With zero recruiter accounts the cost of
that is zero; the cost of failing closed is every shortlist in the product.
**Revisit that line first when recruiters actually exist.**

---

## ✅ Migration 0025 — applied by the founder, 2026-09-14

`supabase/migrations/0025_role_functions.sql` widened `roles.function` to allow
`sales`, `operations`, `support` and `design`. **Applied, and the backfill has
run** — `npm run reclassify:roles -- --write` moved 2,653 roles out of `other`,
which fell from 44.3% to 32.9%. The coverage panel now names nine functions, with
Sales third at 1,390, verified signed-in in a browser. **Nothing further to do
here**; the nightly ingest classifies on write, so the script is not needed again.

⚠️ **ORDER IS NOT OPTIONAL, AND GETTING IT WRONG LOSES POSTINGS.**
`roles.function` carries a CHECK constraint naming the six values migration 0001
allowed. `ingest/classify.ts` now returns four more. Against the old constraint
an ingest run does not mislabel a role — **the INSERT fails**, and the night's
sales, operations, support and design postings are dropped. Schema first, then
the deploy. Same rule as Stage C.

**Why it exists.** 44.2% of the India index was classified `other`, and `other`
is invisible to `coverageByFunction()` — the one reader of this column, feeding
the message a candidate sees when their shortlist is thin. Confirmed in a
browser on `/today`: *"we are strongest here: Engineering 9,096 · Consulting
1,916 · Finance 1,107 · Marketing 412 · HR 375"*. A sales candidate reads five
functions, none of them theirs, against **1,390 live sales roles** sitting in the
index unnamed. The panel exists to blame our coverage rather than the candidate;
omitting a function inverts it into a false claim about our coverage.

**What it does NOT touch.** Migration 0010 replaced function-bucket equality with
free-text matching on `title_tsv`, so retrieval and scoring never read this
column. **No score moves, no shortlist moves.** `npm run bench:match` was run
before and after: unchanged, 0 components paying out at 90%+.

| Measured over 23,184 India roles | |
|---|---|
| sales | 1,390 |
| operations | 640 |
| support | 314 |
| design | 309 |
| `other` | **44.2% → 32.8%** |

⚠️ **The remaining 32.8% is not a fifth missing function.** Stage R's P2 line said
the unclassified 44% "needs sales and operations as functions" — measured, that
framing is about a quarter right. What is left is the long tail a 1,396-board
index of GCC and pharma employers actually contains: *Senior Statistical
Programmer*, *Regulatory Affairs (CMC, Biologics)*, *Specialist, Payroll*,
*Senior Manager - PMO*, *Scrum Master*. Each needs its own function to be named
honestly, and none is a market this product claims to serve. **Do not chase it
with a sixth pattern.**

⚠️ **The backfill deliberately leaves 30 rows alone.** The dry run reports them:
rows stored `other` that the *current* classifier calls engineering or
consulting, because they were ingested under an older version and the ingest
never re-reads. At least one is a defect rather than an improvement — *"Hindi -
AI Voice Data Collection Project"* reaches engineering through the pattern's bare
`\bai\b`. Folding that into a migration about sales would be importing an
unreviewed change under another change's name. **Open question, not a task.**

**Blocks:** the coverage panel stays five functions until this runs. Nothing
else.

---

## ✅ Migration 0024 — applied by the founder, 2026-09-14

`supabase/migrations/0024_resume_score_model.sql` adds `resume_documents.score_model`.
**Apply it by hand in the Supabase SQL editor**, then:

```
npm run rescore:saved            # dry run — prints every old → new score
npm run rescore:saved -- --write # apply
npm run verify:rls               # the 8 resume_documents checks must still pass
```

**Why it cannot be skipped.** The scoring model changed shape on 2026-09-12, so
a score stored before that date and one computed after it are different kinds of
number. Migration `0023` exists specifically to show "was 57, now 84" — across
the change that line would compare two different rulers and present the gap as
progress the candidate made. The old figures are also wrong in a specific way:
they were produced by a parser that returned one line per page for every PDF.

The backfill rescores from `resume_documents.body`, so no uploaded file is
needed and nothing about the privacy posture changes.

**Blocks:** nothing user-facing. Saved résumés keep working; their scores stay
labelled `v1` until you run it.

---

## ✅ Migration 0023 applied — 2026-09-09

`resume_documents` is live. ~~**No migration is pending.**~~ **This is a dated block, not a live status line** — check §2 A1 for the current answer, which has been wrong here twice.

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
| A1 | **Run migrations** in the Supabase SQL editor | every schema change | A session copies the SQL to your clipboard and opens the editor; you paste and Run. **No migration is pending as of 2026-09-14** — `0025` was applied and backfilled the same day. ~~No migration is pending as of 2026-09-08~~ — `0018` (`role_requirements.max_years`) was recorded here as outstanding but is APPLIED; verified by selecting the column against the live database. Over-qualification is scored. Re-check by query rather than by this line, which went stale once already |
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
