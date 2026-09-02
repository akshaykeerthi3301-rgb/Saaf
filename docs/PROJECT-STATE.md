# jobmatch — Project State

**Last updated:** 2026-09-02 · **Phase:** Define (3 of 5 steps done) · **Code written:** none

Read this first. It carries decisions and verified facts from the originating session so they don't get re-derived or accidentally reversed.

---

## What this is

A free job-matching product for Indian candidates. It sources roles from company ATS boards, gates out anything the candidate is genuinely disqualified from, scores and ranks what remains, and generates a tailored résumé/cover letter **only on request**.

**Not** an auto-apply tool. **Not** a niche engineering platform — the engine is role-general across all corporate functions.

**Frame:** portfolio artifact first, built like a real product. ₹0 forever, no ads, no paid tier.

`jobmatch` is a working directory name, not a decided brand. Naming happens in Design (`studio-design-identity-creator`).

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

## Files

```
productos/define/
  1-Product-Offer.md      ✅ 166 lines · six elements locked, typed gates folded in
  2-Customer-Persona.md   ✅ 235 lines · Rohan (engineering) at full framework depth
  2b-Persona-Set.md       ✅ 169 lines · five functions, ranked by design priority
  3-Pricing-Strategy.md   ⏭️ deliberately skipped — ₹0, decisions recorded in-file
  4-Mini-Launch.md        ⬜ template
docs/
  PRODUCT.md              ⬜ NEXT — gates the entire Design and Develop chain
```

`productos/` is gitignored (licensed to the member, not the public). `docs/`, `CLAUDE.md`, `AGENTS.md` are tracked. **Nothing has been committed yet.**

---

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

Run **`studio-define-product`** → produces `docs/PRODUCT.md`, the plain-English roll-up every downstream Design and Develop skill reads. Nothing else in the chain runs until it exists. Business-model section will be thin given the pricing skip — fill from the ₹0 decisions above rather than leaving blank.

Then: Design phase (`productos/design/DESIGN-CHECKLIST.md`) — identity/naming, then design system, then PRD + roadmap.

---

## Open questions

1. **Proof is 100% future-tense.** The offer currently has zero present-tense evidence. The **refusal screenshot** is the cheapest and most persuasive artifact to earn — a portal calling the candidate a "Top Applicant" for a 15-year role beside this product correctly withholding it. Build should target it first.
2. **All five personas are interview-unvalidated.** Ten interviews (2 each) planned; priority questions listed at the bottom of `2b-Persona-Set.md`.
3. **Distribution is fragmented.** No single channel reaches all five personas — r/developersIndia reaches only Rohan, ICAI only Arjun, and LinkedIn is the sole overlap and the most crowded surface there is. Plan five small channel entries, not one launch.
4. **Non-technical persona research is thinner than engineering.** Indian marketing communities are the weakest-mapped section; named creators were deliberately left blank rather than invented.
5. **Mini-Launch (Define step 4) skipped for now.** It's the only step producing external evidence. Recommendation: run it once a refusal screenshot exists — it'll land far harder with one image than with a description.
