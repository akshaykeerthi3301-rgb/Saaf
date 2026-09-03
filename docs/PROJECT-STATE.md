# Saaf — Project State

**Last updated:** 2026-09-03 · **Phase:** Develop — **complete. 53 of 53 tasks. Live at https://saaf-akshay-keerthi.vercel.app**.** Define 4 of 5 and Design 6 of 7 — both remaining steps are launches, still deferred, and **nothing has yet been shown to a real person.**

> **Resuming? Read [`docs/HANDOFF.md`](HANDOFF.md) first.** It lists the four decisions only the founder can make, the six actions needing their accounts, and the seven invariants a fresh session must not undo.

Read this first. It carries decisions and verified facts from the originating session so they don't get re-derived or accidentally reversed.

---

## What this is

A free job-matching product for Indian candidates. It sources roles from company ATS boards, gates out anything the candidate is genuinely disqualified from, scores and ranks what remains, and generates a tailored résumé/cover letter **only on request**.

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
| **Gates, not weights — typed by function** | Engineering gates on years; finance/law on a **credential** (binary); marketing on **channel + budget scale**; consulting on **institute tier**; HR on a **recruiter-vs-generalist split**. A years-only gate is itself a bug. |
| **Stretch tier ≤2 years, experience-typed only** | A credential you don't hold is never stretched, because it cannot be. |
| **No volume promise** | Precision over quantity. A short honest list beats a padded one. |
| **Never turn users away** | No signup gating, even for poorly-served segments. Instead the **honest empty state**: *"3,200 roles indexed today · 47 in your function · 3 cleared your experience band"* — thinness attributed to registry coverage, never to the candidate. Gating would reproduce the exact harm the product exists to fix. |
| **Parse-then-confirm onboarding** | Résumé parsed to pre-fill; candidate confirms every field before the first match runs. Source file **deleted after parsing** (DPDP posture + confidentiality guarantee). |
| **Fabrication guard blocks, not warns** | Generated documents may only reorder/trim/re-word confirmed profile facts. Blocked output's remedy is "add it to your profile," never "let the model assert it." |
| **Open-source the gate, keep the registry private** | Gate code is portfolio proof; the registry is the moat. |
| **₹0, no paid tier** | Beta at ₹0. Vercel Hobby is non-commercial only — *advertising* a paid product counts as commercial, so even announcing a tier breaks it. |
| **⛔ Founder's personal job tracker is NOT publishable** | It informed the design (origin of the precision thesis) but is personal data. Must never appear in a landing page, launch post, case study or any public artifact. Flagged in `1-Product-Offer.md` Evidence Sources. |
| **Name is Saaf** | Decided 2026-09-02. `jobmatch` was killed: Job Match Pro (`jobmatchpro.in`) is an Indian product in the identical wedge. Also killed — Winnow (Winnow Career Concierge sells an "Interview Probability Score"), Yogya (Yogya.ai, Bengaluru), Sirf (active Indian e-commerce app). ⚠️ Registrar/handle availability for Saaf is **unverified** — search presence only. |
| **Design system is monochrome, flat, square-cornered** | Anchored on live computed styles from `zerodha.tech`: zero shadows, one radius, `#F0F0F0` paper ground. The named anti-reference is `resumly.ai` (196 shadows, 8 radii, 4 gradients, 2 banned fonts). Error red is for system errors only — **never** for a gate outcome. |

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
- **The full ingest takes ~34s at 20 boards**, about 1.7s per board.

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

**Built and verified live:** the gate engine against 211 real postings (48 tests),
the résumé parser against real PDF and .docx, RLS proven to deny by seeding a row,
the daily ingest at 20 boards / 964 roles / 34s, the shortlist rendering real
refusals, magic-link sign-in end to end, the daily digest actually sending, and a
public audit page at `/audit`.

**Deployed 2026-09-03** to https://saaf-akshay-keerthi.vercel.app, region `bom1`.
Verified live: the landing page serving real audit figures, the public gate audit,
`/api/audit/today` at 935 indexed / 497 withheld, all four security headers, route
protection returning 307 for an unauthenticated `/today`, and both localhost and
production callbacks allowlisted in Supabase.


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

**1 · Deploy (one command).** `npx vercel deploy --prebuilt --prod`, then fix the
Supabase URLs as above. Closes the build at 53/53.

**2 · Buy a domain.** This is the real blocker on having any user at all. Resend
only delivers to the founder's own address until a domain is verified, so **no
beta user can receive a sign-in link today.** A `.in` costs a few hundred rupees.
Everything else on this list is refinement; this one is binary.

**3 · Grow the registry — and stop at 28 boards.** 20 today, found by probing
rather than guessing (`npm run registry:discover`). More boards thickens the
cleared list, which is the weaker half: 43 cleared against 67 withheld for a
two-year engineer. **Hard stop:** the Vercel Cron 60s ceiling breaks at ~30
boards — migrate the scheduler to a Supabase Edge Function *before* that, not
after. See HANDOFF D5.

**4 · The two deferred launches.** `docs/LAUNCHES.md` does not exist; nothing has
shipped to a real person. Define step 5 (Mini-Launch, win = one reply) and Design
step 7 (relaunch, win = one "can I try it?") are both open. Both were sequenced
to follow the refusal screenshot, which was discarded on 2026-09-03 — so they
would now ship on description rather than on the image. Worth deciding
deliberately rather than by default.


## Open questions

1. **Still zero users, and zero first-party proof.** Every success criterion that
   needs people — withheld-section engagement, the eligibility rate — is marked
   *pending cohort* in `VERIFICATION.md`, not ticked. The instrumentation to
   answer them is live and verified.
2. **The refusal screenshot was discarded** (2026-09-03). `PRODUCT.md` § Proof
   names it as the first earnable evidence and both launches were sequenced
   around it. Saaf's half already renders at `/today`; only the portal half is
   missing, so it stays cheap to revisit.
3. **All five personas remain interview-unvalidated.** Ten interviews planned,
   zero done. The product now exists to show them, which makes the conversation
   easier than it was in the Define phase.
4. **Only two of five gate functions ship.** Engineering (experience band) and
   finance (credential). Marketing, consulting and HR users are told plainly on
   their own shortlist that their gate is not live — deliberate, and better than
   silently applying the years gate, which is the bug this product exists to fix.
5. **The scheduler has an expiry date.** Vercel Cron dies at ~30 boards and the
   service-role key now sits in Vercel, which earlier design notes ruled out.
   Migrating to a Supabase Edge Function fixes both. See HANDOFF D5.
6. **Non-technical persona research is still the thinnest part.** Indian marketing
   communities were the weakest-mapped section in the Define phase and nothing has
   changed that.
