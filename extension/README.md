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
| Reads | The active tab's DOM, on listed hosts only |
| Sends | Posting text and title, to `/api/extension/score` |
| Stores | Your résumé text, in `chrome.storage.local`, on your machine |
| Never sends | Browsing history, page URLs from unlisted hosts, anything from an unlisted host |
| Never does | Click, submit, apply, or navigate on your behalf |

The server holds nothing. `/api/extension/score` reads no database and writes no
row — it scores the text in the request and forgets it, which is why the
extension needs no account.

## Install (unpacked, for development)

1. `chrome://extensions` → enable Developer mode
2. "Load unpacked" → select this directory
3. Open the extension, paste your résumé once
4. Visit any listed ATS posting

## Not yet done

Not submitted to the Chrome Web Store. Review takes days to weeks and is outside
our control, so it must never sit on a critical path.
