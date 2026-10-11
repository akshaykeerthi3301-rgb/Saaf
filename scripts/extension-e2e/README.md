# Extension end-to-end check

Loads the REAL extension (patched to run on localhost and to talk to the local app) in a real Chromium, signs in through
the dev route, opens a mock job page with an application form, and walks the panel: connect → match → Autofill (typed
fields, attached résumé file, completion bar) → Save → Tailor (a real model call) → re-attach.

```bash
npm run dev                                   # the local app on :3000, signed in as the founder via /api/dev-signin
cd scripts/extension-e2e
npm i --no-save playwright && npx playwright install chromium
node e2e.mjs                                  # prints what the panel showed; writes panel-*.png
node cleanup.mjs                              # ALWAYS after: removes the mock job from the tracker and the "Tailored — … Acme Robotics" résumé
```

⚠️ It writes to the real database (the local app shares it): a tracker row for `http://localhost:4100/job` and a saved
résumé labelled "Tailored — Customer Success Manager at Acme Robotics". `cleanup.mjs` removes exactly those. Check the
saved-résumé count first — the library caps at ten (the primary one is never deleted).

Why Playwright's Chromium: Chrome 137+ removed `--load-extension` from branded builds. Why a mock page: real application
forms are other companies' pages; the mock mirrors the shapes the filler handles (required text, file, select, radio group).

## What each script checks
- `e2e.mjs` — connect → match → Autofill → Save → Tailor → re-attach (writes a tracker row and a "Tailored — … Acme Robotics" résumé; `cleanup.mjs` removes them).
- `icon-toggle.mjs` — the toolbar icon toggles the panel, the ⚙ opens settings, an unsupported site gets the ordinary popup.
- `apply-here.mjs` — **A** an easy form is filled, submitted and confirmed (panel says Applied; tracker row is Applied); **B** a form with a required question the extension cannot answer is NOT submitted and says why; **C** a sign-in page gets the email only — the password box stays empty.
- `real-lever.mjs` — loads a real public Lever application form and checks the panel appears (read-only; fills nothing).
- `autofill-flow.mjs` — the critical one: **1** a posting page with NO form (Apply is a link): Autofill presses Apply itself, follows to the form page, fills, asks "Ready to submit?", Submit → Applied; **2** Apply opens a NEW TAB: the new tab fills by itself; **3** Apply reveals the form on the same page; **4** a site the built-in list does not cover: nothing shows until the icon is pressed, then it works and carries on to page 2; **5** another job extension's panel present → ours docks LEFT.
- `real-veeva.mjs` — the real Veeva careers page → icon → Autofill presses "Apply Now" → real Lever form opens in a new tab and is filled; stops before Submit (never presses it).
