# Paid plan — the decision, on one page

**Status:** DRAFT for the founder · prepared 2026-10-08 · ROADMAP TASK-170 · **nothing is built, priced or announced until you decide.** The public copy keeps saying "free" until a plan exists.
**What is already built and waiting for a price:** a credits ledger, a wallet, promo codes and referrals (TASK-197/198; every price is empty on purpose) and a rule for who may open an employer's interview questions (TASK-195; today everyone may).

Tags: **OBSERVED** = read from the vendor's own page on 2026-10-08 · **INFERRED** = my arithmetic from stated assumptions · **TBD** = needs your accountant or lawyer.

---

## 1. What stays free, whatever you decide (already locked)

"Never gate users out" is a locked decision. So a plan can sell **extra capacity or convenience, never being scored or seeing a result**. These stay free: the daily shortlist and every score with its working; the ATS checker; "Should I apply?"; the public job pages and search; the tracker; the extension's filling. A candidate must never be told a role is hidden behind a payment.

## 2. What the infrastructure costs, and the one fact that forces a decision

| Item | Today | When paid | Source |
|---|---|---|---|
| Hosting (Vercel) | Hobby $0 — **"personal, non-commercial use"** | Pro **$20/month** + usage beyond a $20 credit; extra developer seat $20 | OBSERVED vercel.com/pricing |
| Database (Supabase) | Free: 500 MB, **paused after a week idle**, no backups | Pro **$25/month**: 8 GB, never paused, daily backups (7 days) | OBSERVED supabase.com/pricing |
| Payments (Razorpay) | — | **2% + GST** per payment, no setup or annual fee; UPI has 0% bank charge but the 2% platform fee still applies | OBSERVED razorpay.com/pricing |
| Email sending | not live (domain unverified) | a verified domain + Resend | TBD cost |
| Model key (tailoring, rewrites) | free shared key, ~8,000 tokens a minute for everyone | a paid key with a per-user budget | to be measured |

**The fact that forces your hand:** Vercel Hobby is non-commercial, and advertising a paid product counts as commercial — so **even announcing a plan needs Pro first** (PROJECT-STATE, Stage AK). The floor is therefore about **$45 a month** (Vercel Pro + Supabase Pro) before any model or email cost — **≈ ₹4,000 a month at ₹88 to the dollar (INFERRED; use today's rate)**. The database also matters on its own: Saaf holds 27,882 roles and is on the 500 MB free tier; Pro's 8 GB is also what lets the registry grow and the Abroad mode (TASK-209) exist.

## 3. Four ways to charge — pick one to start

| | What is sold | Fits what is built | Risk |
|---|---|---|---|
| **A. Stay free** | nothing | everything | the floor above comes out of your pocket from the day you upgrade; no paid model features at scale |
| **B. Monthly plan** ("Saaf Plus") | more AI writing per month (tailoring, cover letters, rewrites), the full interview bank, a deeper résumé history | tailoring and the interview rules already exist; the model budget does not | needs a per-user model budget and refund terms |
| **C. Credit packs** | credits spent on specific actions (a tailored résumé, later an ATS-API application) | the ledger, wallet, promo codes and referrals are built; **every price is empty** | simplest to start; people dislike counting credits |
| **D. Employers pay** | a recruiter pays per role or contact | needs the employer side (TASK-169/207) first — consent model drafted in `docs/EMPLOYER-CONSENT.md` | longest to build; a sales motion |

**My recommendation (a view, not a fact):** start with **C + a small B**, and only after Pro hosting is on — credits because the machinery exists and nothing else is needed to try it; one monthly plan so a regular user is not counting. Do **not** price auto-apply by volume: the 25-a-day cap is a safety and account-ban control for the candidate, not a lever.

## 4. The arithmetic, so the price is a choice and not a guess (INFERRED)

Assumptions to replace: ₹88 per $1; prices below include GST and **GST registration applies** (if your turnover is under the registration threshold, ask your accountant — then there is no GST to remove, **TBD**); Razorpay's 2% is charged on the full amount and carries 18% GST itself.

| Monthly price (incl. GST) | You keep per payment | Paying users to cover the $45 floor (≈ ₹3,960) |
|---|---|---|
| ₹199 | ≈ ₹164 | ≈ 25 |
| ₹299 | ≈ ₹246 | ≈ 17 |
| ₹499 | ≈ ₹411 | ≈ 10 |

("Keep" = price ÷ 1.18, minus Razorpay's 2% + GST.) This is the **infrastructure floor only** — it excludes the model key, email, your time and any refunds. For a ceiling, the compared product's own published prices are in the private teardown (`docs/jobright-map/12-unseen-items-findings.local.md`, OBSERVED 2026-10-07, US dollars, not an Indian price); they are not repeated here because that file is private. Saaf has **no measured conversion rate** (no one has been asked to pay), so I will not guess how many users produce 17 payers.

## 5. What you must decide (nothing is built until these are answered)

| # | Decision | My recommendation |
|---|---|---|
| 1 | Move to Vercel Pro and Supabase Pro? (needed for any announcement) | Yes — the floor is ≈ ₹4,000/month, and Pro is also what makes the database safe |
| 2 | Model: A / B / C / D, or a mix? | C, with one small B |
| 3 | Price points (§4) | ₹299 a month, and credit packs priced from the model cost once measured |
| 4 | Payment provider | **Razorpay** for INR and UPI; add Stripe only for international cards |
| 5 | Refund and cancellation terms | Written with a lawyer before the first payment |
| 6 | GST registration and invoicing | Your accountant — **TBD** |
| 7 | Announce when? | Only after #1, and on the same day the copy changes from "free" to the real terms |

**Acceptance for TASK-170** is a decision, which only you can make; this page is the material for it. Until you do, the landing copy says free — and it is true.
