# Jobinko — UI Makeover Brief

**For:** Claude Fable 5.2 (`claude-fable-5-2`), run at effort `high`, with filesystem
and browser tools, in the repo root `~/Desktop/projects/jobmatch`.
**Written:** 2026-11-10. **Author:** prior session, at the founder's instruction.
**How to use:** paste everything below the line into Fable 5.2 as a single message.
It is the whole task. Do not add to it.

---

You are the design authority for Jobinko's interface. You have creative freedom over
how it looks and feels. You do not have freedom over whether your choices are
justified: every visual decision you make is backed by evidence you cite, or it does
not ship.

Work in the repository at `~/Desktop/projects/jobmatch`. Start by creating and
switching to a branch named `ui-makeover`. Do not commit to `main`. Do not push.

## 1. What Jobinko is

An India-first job-search copilot. A candidate uploads a résumé once; Jobinko pulls
roles from company career pages daily, scores each one against that résumé, explains
the score in words, tailors the résumé and cover letter per role, and — through a
browser extension — can submit applications. Free today. Live at `jobinko.in`.

Read these before you design anything. They are the ground truth and several of
their decisions were made deliberately against the obvious default:

| File | What it gives you |
|---|---|
| `CLAUDE.md` | Five architecture invariants. Breaking one is a defect. |
| `docs/PROJECT-STATE.md` | Locked decisions, measured facts, reversals. Read it fully. |
| `docs/DESIGN.md` | The design system. 480 lines. Token YAML plus component specs. |
| `docs/PRODUCT.md` | Who the customer is and what the product promises. |
| `docs/jobright-map/07-ui-spec.local.md` | A clean-room UI teardown of the closest competitor, already done. Do not redo it. |
| `docs/PARITY.md` | The 133-row feature scoreboard against that competitor. |
| `docs/QA-AUDIT.md` | Known UI defects already catalogued. |

## 2. The brief, in the founder's words

> "I am not satisfied with the UI colours. We need something smooth, interactive,
> clean and professional and hopeful emotionally."
>
> "It feels stressful to the eyes with the neon purple. Its kind of funky."

Treat colour as the entry point, not the whole job. The founder named the symptom
they can see. Your job is to find out whether colour is the whole disease.

## 3. What is already measured — do not re-derive this

Measured 2026-10-28 on this codebase:

- Colour is authored in the oklch colour space, where the second number is chroma
  (saturation). The shipped dark palette runs `--brand` at chroma **0.233** and
  `--brand-2` at **0.288** — the latter near the gamut ceiling. The original light
  palette's single accent was **0.12**, and `docs/DESIGN.md` describes that accent as
  "rationed."
- `docs/DESIGN.md` line 203 of the original spec forbids, in its own words, a
  purple-to-blue gradient, glassmorphism, and blurred orbs. TASK-107 on 2026-09-23
  shipped a purple-to-blue gradient. The founder's complaint is their own design rule
  reasserting itself, not a change of mind.
- **230** references to brand colour across 25+ `.tsx` files. **Zero** hardcoded
  `indigo-/violet-/purple-/fuchsia-` utility classes. Every surface reads tokens.
  A full palette change is ~6 values in `src/app/globals.css`.
- `src/app/layout.tsx:57` hardcodes `className="dark"` on `<html>`. The entire
  `:root` light palette — 42 tokens, including a green accent nothing uses — is
  dead code that ships to every browser. Decide its fate explicitly.
- 34 routes, 101 components, Next 16.3.8, React 19.2.8, Tailwind v4.3.3
  (no `tailwind.config.*` — tokens live in CSS), TypeScript strict, zero `any`.

## 4. Hard constraints — breaking one is a failed run

1. **Tokens are the only way colour enters the product.** Every colour, size,
   spacing, radius and font comes from a custom property in `src/app/globals.css`.
   No hex, no `oklch()`, no Tailwind colour utility (`bg-indigo-500`) in any
   component or page. If you need a value the token set lacks, add a token in both
   `:root` and `.dark` and say why in your decision log.
2. **`src/app/__tests__/theme-tokens.test.ts` must pass.** Every token in `:root`
   needs a counterpart in `.dark`. This test exists because the half-palette defect
   already shipped once and made a call-to-action invisible.
3. **The score ring's three bands stay semantic and stay distinguishable.**
   `--score-high` / `--score-mid` / `--score-low` encode match quality (≥85 / 60–84 /
   <60). They are independent of brand colour and must survive the most common colour
   blindness — do not rely on hue alone to carry the distinction.
4. **No new runtime dependencies.** Not an animation library, not an icon set, not a
   component kit. What is installed is what you have. `npm run build` must not grow a
   package.
5. **Architecture invariants in `CLAUDE.md` hold.** No `supabase.from()` in
   `src/components/` or `src/app/`. Do not add a 23rd legacy query site. Do not touch
   `ingest/`, `supabase/migrations/`, or any server action's auth. This is a UI task.
6. **Accessibility is not a tradeoff.** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for
   large text and for the boundary of every interactive control, 44×44 CSS px minimum
   touch targets, visible focus rings, `prefers-reduced-motion` honoured on every
   animation you add. Measure the ratios; do not estimate them.

## 5. Evidence standard

Keep a running file, `docs/UI-MAKEOVER-DECISIONS.md`. Every non-obvious design
decision gets one row. Each row carries a class tag, and a decision with no class
higher than INFERRED is a decision you must flag as a guess:

| Tag | Means |
|---|---|
| `MEASURED` | You ran something in this repo and read the number. |
| `OBSERVED` | You opened a live page or image and saw it. Say where. |
| `SOURCED` | A named external source. URL, publication date, and what it actually claims. |
| `INFERRED` | Your reasoning from the above. State the premise you are reasoning from. |

Reject, in your own research, any source that is a vendor blog restating a trend
without data, a "top 10 colour trends 2026" listicle, or a claim about colour
psychology with no cited study. Colour-emotion research is weak and
culture-dependent; if you lean on it, say so and say how weakly.

## 6. The research you owe

Do this before you design, and write it into the decision log.

**The Indian market, because this product is India-first.** Find and cite the current
numbers: mobile share of web traffic in India, the modal Android device class and
screen width, typical connection quality outside metros, and what that implies for
weight, contrast under outdoor sunlight, and tap-target size. A design validated only
at 1440px on a Retina display is not validated.

**The competitive set.** Incumbents: Naukri, Foundit, Shine, Instahyre, Cutshort,
Hirist, Apna, Internshala, LinkedIn India. AI-native: Jobright, Simplify, Teal,
Huntr, Careerflow. Establish what the category's visual defaults are — specifically
the blue every job board uses and the purple every AI product uses — and decide
deliberately whether Jobinko joins a default or departs from it. Either is defensible.
Defaulting without noticing is not.

**Future competition, which the founder named explicitly.** Assume within 18 months
every incumbent ships résumé matching and AI tailoring. Visual differentiation that
can be copied in a sprint is not differentiation. Identify what in this interface can
hold a position structurally — the explanation of a score, the honesty of a rejection,
the speed of a daily return visit — and let the visual language serve that.

**The emotional register.** Job searching is a rejection-heavy, status-threatening
activity, usually done tired, often after a bad day. "Hopeful" here does not mean
cheerful. Look at how products that sit beside anxiety handle tone — banking,
health, debt, grief-adjacent products — and take what applies. A score of 42% has to
be legible without feeling like a verdict on the person.

## 7. What you decide

Everything not nailed down in §4. Explicitly including:

- The full palette, in both themes, and whether light mode lives or dies.
- Type scale, weights, and measure. Density of the job card.
- Motion: what moves, how far, how fast, and what stays still.
- Elevation, borders, radii, and whether the product reads as flat or layered.
- The shape of the job card, the match score, and the daily feed — the three
  surfaces a user sees every single day.
- Whether `docs/DESIGN.md` needs rewriting rather than amending.

You may propose structural changes to a screen's layout where you can argue the
current arrangement is the problem. You may not rebuild the information architecture
or add features.

## 8. Anti-goals — the failure modes to design away from

- The generic AI-product look: heavy gradient, glow, glassmorphism, oversaturated
  violet. The founder is reacting against exactly this.
- A dark theme that is actually just low contrast. Dim is not calm.
- Decoration that costs weight on a 4G connection in Coimbatore.
- A palette that looks considered in a screenshot and illegible in sunlight.
- Per-screen colour choices. One system, applied everywhere, or it is not a system.
- Changing things you were not asked to change. Every diff line traces to this brief.

## 9. Autonomy protocol

The founder is not watching. Do not end a turn waiting for them.

Ask a question only when the answer would change what you build and §5 and §6 cannot
settle it. When you ask: one question, at most three numbered options, your
recommendation marked, and the line *"Proceeding with (N) unless told otherwise."*

Then wait ten seconds for a reply. If your harness cannot wait on a timer — it
almost certainly cannot — treat the ten seconds as already elapsed: proceed on your
recommendation immediately, and log the question and the default you took in
`docs/UI-MAKEOVER-DECISIONS.md` under a heading **Decided by default**, so the
founder can reverse any of them in one pass at the end. Taking the default is the
expected path, not a failure.

The single exception, where you stop and wait indefinitely: anything irreversible.
Deleting files, force-pushing, merging to `main`, removing a token another part of
the codebase reads, or touching the database. Ask, and stay stopped.

## 10. Verification — this repository has been burned three times

Three times, a session claimed a screen worked after grepping served HTML, and was
wrong three times. The standing rule: **open the page and look at it.**

Run the dev server with the launch config named `saaf-dev-node22` (node v22.23.2 —
the shell default drifts to an older version and the build fails). Sign in locally by
navigating to `/api/dev-signin`, which mints a real session for the founder's account
in development only. Then look at every screen you changed, at desktop width and at
360px, in both themes if both survive.

A palette can be swapped live without editing a file — set `--accent`, `--brand`,
`--brand-2` and `--brand-foreground` as inline styles on `document.documentElement`
and they beat every stylesheet rule. Use that to compare options before committing to
one.

## 11. Definition of done

Do not stop before all of these hold. If one cannot hold, finish every other part in
full and say plainly which one you left and why.

1. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass.
   Paste the output, do not summarise it.
2. Every contrast ratio you depend on is measured and recorded, not estimated.
3. Every screen touched has been opened in a browser at desktop and 360px width, with
   a screenshot saved under `docs/ui-makeover/`.
4. `docs/DESIGN.md` describes the product as it now is, not as it was. A stale design
   doc is worse than none.
5. `docs/UI-MAKEOVER-DECISIONS.md` is complete, including the **Decided by default**
   section.
6. `docs/PROJECT-STATE.md` records the reversal of TASK-107 with the date and the
   measured chroma numbers. Corrections go in struck through, never deleted.
7. `docs/ROADMAP.md` has the task added and ticked, with its `**Status:**` count
   updated in the same edit.
8. Everything is committed to `ui-makeover` in reviewable commits. Nothing is pushed.
   Nothing is deployed. Say so explicitly — committing is not shipping.

## 12. How to report back

Two sections, in this order, written for a non-technical reader:

**Progress** — what changed, what it looks like now, and the measured numbers behind
every claim. Name anything you could not verify as `unverified`.

**Next steps** — what you would do next, kept separate from what only the founder can
do. Those two lists are different and merging them is how founder-only items get
deferred for months.

Write the report in plain English. The founder is a non-technical product manager.
Any unavoidable term gets defined in the same sentence. "Deploy" means putting new
code on the live website — say so the first time it comes up.
