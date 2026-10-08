# Saaf browser extension

Scores the job posting you are looking at against your résumé, and shows the
same arithmetic `/today` shows — every component, and the line from the posting
each one was read from.

## ⚠️ Why LinkedIn and Naukri are not in the host list

They are excluded **by host in `manifest.json`**, not by a policy note, and it is
not an oversight to be corrected later.

- **LinkedIn's User Agreement §8.2** prohibits software that "scrape[s] the
  Services or cop[ies] profiles and data, and **overlay or otherwise modify the
  Services or their appearance**". An overlay is the exact mechanic of this
  extension. Enforcement through 2026 is tiered restriction → government-ID
  unlock → permanent ban, with under 15% of appeals recovering an account.
- **Naukri's terms** separately prohibit automated extraction and "extending
  access to naukri.com to third parties".

**The consequence lands on the candidate, not on us** — a job seeker's LinkedIn
account, banned in the middle of a search. A product whose argument is that it
tells you the truth does not ship that.

The hosts that *are* listed carry no new exposure: they are the same ATS boards
the daily ingest already reads through each provider's own public, zero-auth
API. Reading one in the user's own browser adds no access we do not already have.

## What it does and does not do

| | |
|---|---|
| Reads | The active tab's DOM, on listed hosts only — the page's schema.org `JobPosting` first, the visible text second (`extractor.js`) |
| Sends | Posting text and title, to `/api/extension/score` |
| Stores | Your résumé text and file, form details, salary figures and yes/no answers, in `chrome.storage.local`, on your machine |
| Receives | From the signed-in Saaf website only: your profile, latest saved résumé, and the stage of each tracked job |
| Never sends | Browsing history, page URLs from unlisted hosts, anything from an unlisted host, your salary figures or yes/no answers |
| Never does | ~~Submit, apply, or navigate on your behalf.~~ Get past a CAPTCHA, answer a question it has no stored answer for, or submit anything outside **Apply for me** — which is off until you switch it on (reversed 2026-09-25) |

## Form autofill

Press **“⚡ Fill this application”** on a posting. It is a button and never
automatic — filling a form on page load is surprising. ~~…and the shape of the
auto-apply behaviour this product refuses.~~ Automatic applying now exists as a
separate, opt-in mode — see **Apply for me** below.

It fills name, email, phone, city, preferred cities, current title and employer,
years of experience, notice period, work authorisation, LinkedIn and portfolio —
typed boxes, dropdowns, radio groups, tick-box lists and searchable pickers.
~~It never touches a dropdown, a radio, a tick-box or a file input, and always
refuses salary.~~ **Reversed 2026-09-25 by founder direction (Jobright parity;
PROJECT-STATE Stage AE)** — but only from answers *you* stored:

| Filled only from what you typed | How |
|---|---|
| Current and expected CTC | Stored in lakhs. Written as “18 LPA”, bare lakhs where the box says lakhs, or rupees where the box says rupees. A unit-less number box or a box in another currency is left for you |
| “Authorised to work?”, “Need sponsorship?”, “Willing to relocate?” | From your own yes/no. Never inferred — “Are you based in Bengaluru?” is still left for you |
| Dropdowns, radios, pickers | Only when exactly one option matches. Every pick is listed on the card |
| Résumé upload | Your stored file, only on an upload labelled résumé/CV that accepts its type |

**It will not fill, and tells you so on the card:**

| Refused | Why |
|---|---|
| Gender, caste, religion, marital status, disability, veteran status, date of birth | Yours alone to answer, and several are unlawful to require in India |
| "Why do you want to work here", cover letters, essays | Free text the employer asked *you* |
| Consent boxes (“I agree”, “I certify”) | Agreeing to terms is yours |
| Passwords, Aadhaar, PAN, bank details | Never entered by us |

It never overwrites an answer you already typed or chose. The Fill button
**never presses Submit**; filling a form puts the role on your Saaf tracker as
**Applying** — never Applied, because we cannot see whether you pressed Submit.

## Apply for me (0.5.0, 2026-09-25)

~~Saaf never applies on your behalf.~~ **Reversed 2026-09-25 by founder direction.**
Queue jobs with **Apply for me** on the Saaf website, switch the mode on in the
extension, and press **Start**. The extension opens each job in a background tab,
one at a time, fills it, and presses the form's own Submit button — only when:

| It submits only if | Otherwise |
|---|---|
| Every required field is filled from your own stored answers | Stops, names the unfilled field, leaves the tab open for you |
| There is no CAPTCHA on the page | Stops — a CAPTCHA means the employer wants a person; we never get past one |
| A required upload has your stored résumé file | Stops |
| — | A job counts as **Applied** only when the employer's page confirms it; a click with no confirmation is "check this tab" |

Off by default, runs only when you press Start, at most **25 a day**, only on the
ATS hosts in `manifest.json`. Free-text essays and consent boxes are still never
answered — if the employer made one required, the job waits for you. **Demographic
questions** are left for you unless you typed your own answer to that exact
question on your Saaf profile (0.6.0, TASK-171); date of birth, age and pregnancy
are never answered.

**0.7.0 (2026-10-08, TASK-194):** **custom questions.** Employers add their own free-text
questions. Write your answer once on your Saaf profile (Apply details → *Questions
employers asked*) and the extension fills it only when a form asks **exactly that
question** (compared after lower-casing and dropping punctuation — never "similar").
A *required* question with no answer is not guessed: it is sent to your Saaf profile,
blank, for you to answer. Apply for me uses an answer only if you ticked it for that.
Gender, religion, caste, passwords, ID numbers and consent boxes never come from this.

**0.6.0 (2026-10-08):** the popup shows the **queue** (remove a job, or clear it),
and each finished application shows **how much of what the employer required was
answered** and which fields were missing. Saaf can **pause every extension at
once**: before each job is opened, and again just before each Submit click, the
extension asks `/api/extension/status`; if it says paused, nothing is submitted
and the tab is handed back (docs/RUNBOOK.md). If Saaf cannot be reached it carries
on — the run is yours, and a switch that also failed during an outage would be a
second failure.

## Syncing with the Saaf website

The extension holds no account. When you open Saaf signed in, the website:

1. files the roles you saved or filled on job sites onto your tracker (once each);
2. sends your profile, latest saved résumé and each tracked job's stage to the
   extension, so the card on a job site says “On your Saaf tracker · Interviewing”.

Only `saaf-ten.vercel.app` (and `localhost` in development) can reach it —
`externally_connectable` in the manifest, re-checked in `service-worker.js`. A
sync fills blanks and updates; it never erases what you typed, and never touches
salary, yes/no answers or the résumé file, which the website does not hold.

The server holds nothing for scoring. `/api/extension/score` reads no database
and writes no row — it scores the text in the request and forgets it.

## Install (unpacked, for development)

1. `chrome://extensions` → enable Developer mode
2. "Load unpacked" → select this directory
3. Open Saaf signed in once (profile syncs), or fill the extension's popup by hand
4. Visit any listed ATS posting

## Not yet done

Not submitted to the Chrome Web Store. Review takes days to weeks and is outside
our control, so it must never sit on a critical path.

## Parity with Jobright's extension, and the two gaps that stay

Measured against their Chrome Web Store listing on 2026-09-15 (200,000+ users
and 4.9★ — both CLAIMED on their listing). Their extension fills; their web
**Agent** submits (OBSERVED inside their app, 2026-09-25: "Awaiting Application
Start → Start"). ~~…so the locked "never applies on your behalf" decision costs
us nothing here.~~ Saaf's "Apply for me" is the parity answer (2026-09-25).

| Jobright | Saaf |
|---|---|
| One-click autofill, "thousands of ATS sites" | ✅ 32 host patterns across 22 ATS platforms — text, dropdowns, radios, pickers, résumé upload, CTC (2026-09-25) |
| Match score on the posting | ✅ and every component opens into the posting's own sentence |
| Missing keywords / ATS gaps | ✅ from a vocabulary mined out of our index, not a generic word list |
| Track the application | ✅ filed on the Saaf tracker when you next open Saaf; stage shown back on the card (2026-09-25). ~~via a link into the Saaf tracker~~ — the link's `?add=` was read by nothing |
| AI tailored résumé in the extension | ❌ **budget** — see below |
| Insider connections / referrals | ❌ **structurally impossible** — see below |

**Tailored résumé is a budget limit, not a design one.** It exists on the web
app. Groq's free tier is 8,000 tokens a minute shared across every environment,
so a per-posting generator serves roughly three people a minute site-wide. It
returns when there is a paid tier.

**Insider connections cannot be built and should not be promised.** It needs a
graph of who works where — which means LinkedIn, whose User Agreement §8.2
prohibits exactly the overlay this extension performs, and whose enforcement
falls on the candidate's own account. Jobright can offer it because they operate
a people database we have deliberately not built. This is the one place where
Saaf is behind for a reason it should keep.
