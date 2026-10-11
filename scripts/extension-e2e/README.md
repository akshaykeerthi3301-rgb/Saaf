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
