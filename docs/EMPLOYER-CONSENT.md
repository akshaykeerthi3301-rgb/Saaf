# Employer side — the consent model (design only)

**Status:** DRAFT for the founder · written 2026-10-08 · ROADMAP TASK-169 · **no schema, no UI, no code follows from this file until you approve it.**
**Read this first:** `CLAUDE.md` invariant 4 sets the order — **consent model → second set of database access rules → employer identity → screens.** Skipping ahead is how a candidate's profile gets read by someone they never agreed to, which is a security failure, not a product preference. This file is step one.

**Not legal advice.** India's Digital Personal Data Protection Act, 2023 (DPDP) governs how a candidate's consent must be asked for and withdrawn. Section 7 below lists what a lawyer must confirm *before* anything is built.

---

## 1. Why this is the hard part

Saaf's three promises to a candidate (PRODUCT.md) are: nothing you are disqualified from, nothing invented in your documents, **nothing shared about your search** — "no recruiter can find you here". Four of the five personas are **employed and hiding their search**. An employer side that lets recruiters find candidates would break the third promise for exactly the people Saaf was built for.

So the employer side is allowed (Stage AK, 2026-10-07) only as an **opt-in**: a candidate is invisible to every employer until *they* say otherwise, and what they say is specific, limited and reversible.

## 2. The four levels (per candidate)

| Level | Name | What an employer can see | Who sets it |
|---|---|---|---|
| **0** | **Hidden** — the default, for everyone, forever until changed | **Nothing. Not even that the candidate exists.** | — |
| **1** | **Open to approach** (opt-in, anonymous) | A summary with no name and no contact: role family, years-of-experience band, city, skills. Nothing that identifies a person. | The candidate, once, from Profile |
| **2** | **Shared with one employer** | For **that employer only** and **only the role they named**: the candidate's name, contact and the one résumé version the candidate picked | The candidate, per employer, each time |
| **—** | **Always blocked** | The candidate's **current employer, their affiliates and any company the candidate names are invisible at every level**, including Level 1 | The candidate (current employer is suggested from their profile) |

A candidate can drop from any level to 0 in **one action**. There is no level in which an employer sees the tracker, the scores, the search history or the fact of searching.

## 3. What an employer may read, and when

| Data | L0 | L1 | L2 (that employer, that role) |
|---|---|---|---|
| That the candidate exists | ✗ | ✓ (anonymous card) | ✓ |
| Role family, years band, city, skills | ✗ | ✓ | ✓ |
| Name, email, phone, LinkedIn | ✗ | ✗ | ✓ |
| The chosen résumé version | ✗ | ✗ | ✓ (read-only; the candidate sees exactly which) |
| Current employer | ✗ | ✗ (and blocked) | ✗ unless the candidate's résumé itself states it |
| Saaf's match score for *this employer's* role | ✗ | ✗ | ✓ (the same itemised score the candidate sees, if the candidate allows it) |
| Scores for any other company's roles | ✗ | ✗ | ✗ |
| Tracker (applications, stages, notes), saved jobs, search history, hidden jobs | ✗ | ✗ | ✗ |
| Self-ID answers, answer bank, credits, referrals | ✗ | ✗ | ✗ |
| Who else has looked at the candidate | ✗ | ✗ | ✗ |

**Rules that hold at every level**
1. An employer reads only through a small, named set of *views* — never the candidate tables themselves — so a future column is **not** exposed by default.
2. No employer can export or bulk-read: a per-employer daily limit on Level 1 cards, no CSV, no API listing.
3. Every read an employer makes is **logged and shown to the candidate** ("Acme viewed your anonymous card on 12 Oct; Acme asked to connect").

## 4. How a candidate gives and takes back consent

**Giving it** (DPDP: free, specific, informed, unambiguous, as easy to withdraw as to give)
- *Level 1:* a switch in Profile with a plain-language notice that says in one screen: what is shown, who can see it, that the current employer is blocked, that it can be turned off any time. Off by default; **never pre-ticked, never bundled with sign-up or a feature.**
- *Level 2:* a prompt **per request**: "Acme wants to contact you about Product Manager. Share your name, contact and *this* résumé with Acme only?" — yes / no / report. Declining is silent: the employer is told nothing beyond "not available".

**Taking it back**
- One button, "Hide me again": Level → 0 and **all open Level 2 grants end**. Effect is immediate for new reads.
- **What revocation cannot do — said on the screen, not buried:** an employer who already saw a name or résumé cannot be made to forget it. The employer terms (below) forbid keeping or reusing it after revocation, but Saaf cannot enforce a memory.
- Deleting the account removes everything, including grants and logs of reads (the candidate's data export includes the log).

## 5. What employers agree to (terms, to be written with counsel)

Use only for the role they named · no resale or sharing · delete on request or on revocation within a stated period · no contacting a candidate who declined · Saaf may suspend an account for misuse. Verification of the employer (domain email, a named person) before any Level 1 card is shown.

## 6. Sequencing — the recommended order of the build

1. **Stage 1 — candidate-initiated sharing only (no discoverability).** A "Share my profile with this employer" button on a role; employer sees only candidates who chose to share *with them*. This delivers F-1301/F-1303 value (an employer finds a person for a role) while **no candidate can be found who did not act**. Needs: consent + log + identity + the second rule set.
2. **Stage 2 — Level 1 "open to approach"** (F-1304, the talent network) — only after Stage 1 has run and the notice has been reviewed by counsel.
3. **Stage 3 — employer pricing and any AI-recruiter features** (F-1301/F-1302), after the paid-plan decision (TASK-170).

This order means the first thing built can never expose a hidden candidate.

## 7. Questions a lawyer must answer before Stage 1 is built (TBD)

- DPDP notice content and language requirements (the Act provides for notices in the Eighth Schedule languages on request).
- Whether Saaf is a data fiduciary *and* the employer is a separate fiduciary at Level 2 (joint?), and what that means for liability.
- Retention and breach duties; how a withdrawal must be recorded.
- Whether the logged "who viewed you" list is itself personal data about the employer's staff.
- Cross-border: employers outside India reading Indian candidates.

## 8. What follows, once you approve (still no code in this task)

**(a) The second rule set (TASK-207).** Every current database rule assumes the signed-in person is a candidate. An employer must be a *different kind of identity* with its own rules, default-deny, reading only the views in §3. `npm run verify:rls` gains checks, each written to **fail** if the rule is wrong: an employer cannot read a candidate profile; cannot read a Level 0 candidate through any view; cannot read a Level 1 candidate's name; cannot read a Level 2 grant for another employer; cannot read the current-employer block list; a revoked grant reads nothing the next second.

**(b) The identity table** with an account-type marker (candidate / employer) that no one can set on themselves; **(c) side-aware routing** in `src/proxy.ts`; **(d) screens.**

## 9. Decisions for you (nothing is built until these are answered)

| # | Decision | Recommendation |
|---|---|---|
| 1 | Start with **Stage 1 only** (no discoverability)? | **Yes.** It cannot expose anyone who did not act. |
| 2 | Is Level 1 ever shipped, or is the talent network permanently out? | Decide after Stage 1; do not promise it publicly. |
| 3 | Block list default: current employer **and its affiliates** automatically? | **Yes**, with the candidate able to add companies. |
| 4 | May an employer pay for more Level 1 cards per day? | Not before the paid-plan decision. |
| 5 | Who writes the employer terms and the DPDP notice? | A lawyer, before Stage 1 — this is the one thing that cannot be improvised. |
| 6 | Does the public copy change? | Yes, **at the same time**, and not before: "no recruiter can find you" becomes "no recruiter can find you unless you turn that on". |

**Acceptance for TASK-169 (met by this file):** a written model that says what an employer may read (§3), when (§2, §6), and how a candidate revokes (§4); no schema, no UI.
