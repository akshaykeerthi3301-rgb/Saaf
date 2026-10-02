# Agent scorecard — the [EVAL] role

The founder's working team is eleven roles run by one session (PM, TPM, AI-ENG,
CTX, UX, BE, QA, AUDIT, EVAL, BIZ, REALITY). **[EVAL]** was added 2026-09-25; **[BIZ]**, the
business success evaluator, the same day; **[REALITY]**, the evidence gatekeeper,
the same evening — after the founder caught marketing numbers presented as facts. It scores the
other eight after each piece of work, before the session's final message, and
appends the result here so scores can be compared over time.

## The rule that makes it worth anything

**Every score cites evidence a stranger can check** — a file and line, a test
count, a command's output, a screenshot, a sentence in `docs/`. A score with no
evidence is recorded as `TBD`, never as a number.

⚠️ **Known weakness, stated rather than hidden:** the evaluator is the same
session that did the work, so it is grading itself. The evidence rule limits
that, it does not remove it. For an independent grade, ask for one: a separate
reviewer with no memory of the session re-scores from the repo alone. It costs
more and is worth it at the end of a phase.

## [REALITY] — the evidence gatekeeper (added 2026-09-25)

It reads every reply before it is sent and **can stop it**. Every number and
every verdict carries one tag:

| Tag | Means | Allowed as a verdict? |
|---|---|---|
| **OBSERVED** | Seen in the actual product or page, with the date and where | Yes |
| **MEASURED** | Our own data, with the command or test that produced it | Yes |
| **CLAIMED** | Someone's self-report — a competitor's marketing, a store listing | Only labelled "they claim" |
| **INFERRED** | My own reasoning or tally | Never as a number or verdict |

Rules: marketing copy is not the product. A parity verdict needs OBSERVED on
**both** sides. "We lack X" also needs checking — grep our own code first. A
count of my own list is INFERRED, however precise it looks.

Why it exists: on 2026-09-25 a "9 of 16 features match" verdict was built from
Jobright's landing pages, with their "2 million users" repeated as fact. Inside
the real product the same evening, Jobright's feed turned out to offer no India
option at all, and a dozen features Saaf lacks.

## Scale

| Score | Meaning |
|---|---|
| 9–10 | Did the job, proved it, nothing a reviewer would send back |
| 7–8 | Did the job; one real miss that did not reach users |
| 5–6 | Did the job with a miss that could reach users, or skipped a required step |
| 0–4 | Did not do the job, or claimed something that was not true |

**Automatic caps:** claiming "works" without an executed check → max 4. A
founder-only item left out of HANDOFF → TPM max 5. A hardcoded colour in `src/`
→ UX max 6. A broken architecture invariant (CLAUDE.md) → BE max 4.

## What each role is scored on

| Role | Scored on |
|---|---|
| PM | Acceptance criteria written before building; locked decisions respected or reversal asked for |
| TPM | Blueprint before multi-file work; ROADMAP ticked with counts; HANDOFF current |
| AI-ENG | Model choice justified with cost; ₹0 promise kept or its break priced |
| CTX | Targeted reads; no re-deriving what the docs already say |
| UX | Tokens only; checked by looking, at desktop and 375 px |
| BE | Five invariants held; untrusted input validated; security residuals named |
| QA | Every claim backed by an executed check; unverified things labelled |
| AUDIT | Parity claims sourced; coverage gaps admitted |
| EVAL | (scored by the next evaluation) did the last scorecard's fixes happen? |
| BIZ | Judges work by whether it moves real users, activation or revenue — and says when it does not. Scored on whether its calls were backed by numbers we hold |
| REALITY | Every number tagged; no INFERRED verdicts shipped; caught claims before the founder did |

---

## 2026-09-25 — Phases 13 and 14 (extension parity, public job pages)

| Role | Score | Evidence | Fix |
|---|---|---|---|
| PM | **6** | Asked before reversing "index behind sign-in" and the four autofill refusals (Stage AE, AF). But no written acceptance criteria before either build — the tasks were defined after they were done | Write "done means…" into ROADMAP before building, not after |
| TPM | **6** | ROADMAP Phases 13–14 ticked with counts; HANDOFF names 0029, merge, Search Console. **No Execution Blueprint** before either multi-file build, which the founder's own rules require | Emit the blueprint first |
| AI-ENG | **TBD** | No model work this session. Corrected out-of-date model names and priced the ₹0 break in words only | — |
| CTX | **7** | Mostly targeted reads (`grep`, `sed -n`). Several whole-file reads (`content-script.js`, `autofill.js`, `practice-box.tsx`) where a range would have done | Read ranges |
| UX | **8** | Every screen opened and screenshotted, 375 px checked, pinned phone bar added after looking. Misses: `color: #fff` in the extension overlay (`extension/content-script.js` `.primary`) is a raw colour; employer names like "Modulrfinance" shown raw on the new public page | Token for the overlay's button text; clean display names before pages are public |
| BE | **7** | Invariants held (new DB access in `src/lib/services/`, Zod on both new actions). SSRF fence tested. Misses: `/jobs/[id]` reads the database **twice per render** (`generateMetadata` and the page both call `readPublicJob`, no `cache()`); `sitemap.xml` is built once at build time and silently drops every job if the build cannot reach the database | Wrap `readPublicJob` in React `cache()`; log when the sitemap falls back |
| QA | **7** | 855 tests, build, browser walks, "not verified" lists in Stage AE/AF. **`/security-review` not run** on the new server-side URL fetch — the most security-sensitive code of the session | Run `/security-review` on `src/lib/services/job-link.ts` before deploy |
| AUDIT | **7** | Pass/fail table sources every Jobright claim to a page read on 2026-09-25. Signed-in Jobright not seen — stated | Signed-in audit once the founder logs in |
| EVAL | **TBD** | First evaluation | Next scorecard checks the fixes above |

**Team average (scored roles): 6.9 / 10.** Lowest: PM and TPM — the process
steps before building, not the building.

---

## 2026-09-25 (evening) — the four buildable gaps (TASK-134 → 137)

| Role | Score | Evidence | Fix |
|---|---|---|---|
| PM | **8** | Acceptance criteria were in ROADMAP before building (last fix done). Saved filters placed on the feed, not the sidebar the criteria named — reason written down | — |
| TPM | **8** | Blueprint emitted before building (last fix done); ROADMAP ticked with results; 0030 in HANDOFF | — |
| AI-ENG | **9** | Search deliberately has no model call; zero new cost | — |
| CTX | **7** | Mostly ranges and greps; still several broad reads of `today/page.tsx` regions | Read ranges |
| UX | **8** | Walked at 1440 and 375 px, tokens only. Stale "500 closest matches" line under a filter noticed, left | Fix the line under filters |
| BE | **8** | Invariants held (DB in services, Zod on 4 actions, per-user limit); error-tolerant reads before 0030 | — |
| QA | **7** | Skill correction and search walked and reverted; **Hide and Save not walked end to end** (0030 not applied) — stated in ROADMAP, not claimed. Last scorecard's `/security-review` of the link reader **still not done** | Run it; walk Hide/Save after 0030 |
| REALITY | **8** | Caught the Stage AG miscount before it shipped; every claim above tagged | — |
| EVAL | **7** | 3 of 6 fixes from the last scorecard done (criteria first, blueprint, ranges partly); security review, double DB read on `/jobs/[id]`, sitemap fallback log still open | Carry the three forward |

**Team average (scored roles): 7.8 / 10** (was 6.9).

---

## 2026-09-25 (night) — Phase 16, the eight blocked gaps

| Role | Score | Evidence | Fix |
|---|---|---|---|
| PM | **7** | Stated the three lines that stay (fabricated counts, scraping/email-guessing, CAPTCHAs) before building and built substitutes; no written "done means" per task this time | Criteria first, again |
| TPM | **8** | Blueprint in chat before building; ROADMAP Phase 16 with results; HANDOFF lists 0031, coaches, the browser block | — |
| AI-ENG | **9** | Zero model calls added; open data instead of paid APIs | — |
| CTX | **7** | Targeted reads; some broad greps across docs for the rewrite (necessary) | — |
| UX | **5** | Tokens only; Swiggy page seen. **Cards, panel, question bank, coaching, connections not seen** — classifier block | Walk them (TASK-149) |
| BE | **8** | Invariants held; new tables with owner-only / read-only RLS; every action re-auths, Zod, per-user limits | — |
| QA | **7** | 931 tests; tests caught two real Apply-for-me defects and four company-match defects before shipping. **No browser walk** of most screens, stated as unverified | TASK-149 |
| REALITY | **9** | Every number tagged and measured (0.7% pay, 35/60 companies, GDELT limit quoted); wrong company matches caught in measurement, not after | — |
| EVAL | **8** | All three carried fixes closed (security review, double read, sitemap log) | — |
| BIZ | **4** | Eight features shipped to zero users; three (connections, questions, coaching) are empty until real people use them. Still no domain, no beta | Launch before building more |

**Team average (scored roles): 7.2 / 10.**

---

## 2026-10-02 — TASK-149, the browser walk

| Role | Score | Evidence | Fix |
|---|---|---|---|
| UX | **8** (was 5) | Every new screen walked; the misleading "Check first" caught by reading the cards, not by a test | — |
| QA | **8** (was 7) | Two defects found only by looking (wording, missing-table check), fixed, re-walked; 932 tests | — |
| REALITY | **9** | Measured the 204-with-no-error behaviour before writing the fix | — |
| EVAL | **8** | TASK-149 closed; the only carried item is the Apply-for-me run, which needs the founder's Chrome | — |
| BIZ | **4** | Unchanged: no users, no domain, nothing deployed | Launch |
