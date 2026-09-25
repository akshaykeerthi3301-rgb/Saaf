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
| Never does | Submit, apply, or navigate on your behalf. The only clicks are the dropdown option, radio or tick-box it chose |

## Form autofill

Press **“⚡ Fill this application”** on a posting. It is a button and never
automatic — filling a form on page load is both surprising and the shape of the
auto-apply behaviour this product refuses.

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

It never overwrites an answer you already typed or chose, and **never presses
Submit**. Filling a form puts the role on your Saaf tracker as **Applying** —
never Applied, because we cannot see whether you pressed Submit.

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

Measured against their Chrome Web Store listing on 2026-09-15 (200,000+ users,
4.9★). **Their extension fills but does not auto-submit either** — *"instantly
completes every field... so you can submit an application in seconds"* — so the
locked "never applies on your behalf" decision costs us nothing here.

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
