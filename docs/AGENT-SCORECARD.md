# Agent scorecard — the [EVAL] role

The founder's working team is nine roles run by one session (PM, TPM, AI-ENG,
CTX, UX, BE, QA, AUDIT, EVAL). **[EVAL]** was added 2026-09-25. It scores the
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
