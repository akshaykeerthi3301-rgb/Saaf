---
version: beta
name: Jobinko
description: >
  "First light", 2026-11-10 (ROADMAP TASK-323). One quiet blue hue family, a
  light ground by default, a dark ink-blue palette that follows the device, no
  gradient, no glow, no glass. It replaced the zinc + indigo→violet system of
  2026-09-23 (TASK-107), which ran its brand at oklch chroma 0.288 and broke
  this file's own ban on a purple-to-blue gradient. Every value is argued in
  docs/UI-MAKEOVER-DECISIONS.md; every contrast ratio is measured on each test
  run by src/app/__tests__/theme-contrast.test.ts.
themes:
  default: light
  dark: >
    `.dark` on <html>, added before first paint by the inline script in
    src/app/layout.tsx when the device prefers dark or the candidate chose it.
  switch: "Auto / Light / Dark in the account menu (theme-toggle.tsx); stored as localStorage `saaf.theme`"
  parity: "every :root token has a .dark value — theme-tokens.test.ts"
colors:
  # oklch, exactly as in src/app/globals.css. Hex is approximate.
  background:           { light: "oklch(0.975 0.006 250)", dark: "oklch(0.17 0.02 255)" }    # ~#F4F7FB / ~#091018
  foreground:           { light: "oklch(0.24 0.03 255)",   dark: "oklch(0.95 0.008 250)" }
  card:                 { light: "oklch(1 0 0)",           dark: "oklch(0.215 0.022 255)" }
  popover:              { light: "oklch(1 0 0)",           dark: "oklch(0.215 0.022 255)" }
  primary:              { light: "oklch(0.24 0.045 255)",  dark: "oklch(0.95 0.008 250)" }   # the INK — inverts wholesale
  primary-foreground:   { light: "oklch(0.985 0.004 250)", dark: "oklch(0.17 0.02 255)" }
  secondary / muted:    { light: "oklch(0.95 0.01 250)",   dark: "oklch(0.275 0.022 255)" }
  secondary-foreground: { light: "oklch(0.3 0.035 255)",   dark: "oklch(0.92 0.008 250)" }
  muted-foreground:     { light: "oklch(0.47 0.025 255)",  dark: "oklch(0.74 0.02 255)" }
  accent / ring:        { light: "oklch(0.48 0.13 255)",   dark: "oklch(0.78 0.1 250)" }     # ~#215DA5 — the one accent
  accent-foreground:    { light: "oklch(0.985 0.004 250)", dark: "oklch(0.17 0.02 255)" }
  destructive:          { light: "oklch(0.53 0.2 27)",     dark: "oklch(0.72 0.16 22)" }     # system errors ONLY
  border:               { light: "oklch(0.89 0.012 250)",  dark: "oklch(1 0 0 / 10%)" }      # hairline, dividers
  input:                { light: "oklch(0.62 0.02 255)",   dark: "oklch(1 0 0 / 40%)" }      # a field's boundary — 3:1
  chroma-ceiling: "0.13 for everything except destructive and the score bands"
brand:
  # The action colour: Apply, Send, the active tab, the logo badge. FLAT.
  brand:            { light: "oklch(0.48 0.13 255)",   dark: "oklch(0.76 0.11 250)" }
  brand-foreground: { light: "oklch(0.985 0.004 250)", dark: "oklch(0.17 0.02 255)" }  # dark label on the light-blue dark-theme button
  brand-2:          { light: "oklch(0.47 0.1 225)",    dark: "oklch(0.78 0.09 215)" }  # the résumé tailor's "changed" marker
  classes: "bg-brand text-brand-foreground · edge-hover / edge-selected (a border change, no shadow) · range-dual"
  removed: ".bg-brand-gradient · .text-brand-gradient · .glow-hover · .glow-selected · .glass · --glass · --ease-spring"
score-bands:
  # The ring (src/components/ui/score-ring.tsx) and nothing else colours by
  # score. High starts at HIGH_PRECISION_MIN (75) — the same line as the
  # "High-precision match" label, never a separate threshold.
  score-high: { light: "oklch(0.36 0.09 168)",  dark: "oklch(0.82 0.14 165)", from: 75 }   # teal-green
  score-mid:  { light: "oklch(0.5 0.13 65)",   dark: "oklch(0.8 0.13 80)",   from: 60 }   # ochre
  score-low:  { light: "oklch(0.53 0.03 265)", dark: "oklch(0.7 0.02 255)",  below: 60 }  # slate — NEVER the error red
  cues: "arc length → the number, in ink → the band word → colour. Colour is last."
  separation: "OKLab ΔE ≥ 0.08 with the red–green axis removed (protanopia and deuteranopia, simulated) — tested"
paper:
  # The résumé preview is a picture of the .docx. Identical in both themes, on purpose.
  paper: "oklch(1 0 0)"
  paper-ink: "oklch(0.27 0.01 250)"
  paper-muted: "oklch(0.52 0.012 250)"
  paper-rule: "oklch(0.87 0.008 250)"
motion:
  library: none (tw-animate-css, already installed, plus native CSS)
  easing: { ease-out-quint: "cubic-bezier(0.22, 1, 0.36, 1)" }   # the only one; nothing overshoots
  durations: "120ms for a colour or border · 200ms for a position"
  reduced-motion: "prefers-reduced-motion collapses every animation and transition to 0.01ms, globally"
accessibility:
  standard: "WCAG 2.2 AA, measured"
  text: "≥ 4.5:1 — 42 pairs per theme asserted in theme-contrast.test.ts, including text on its own tint"
  control-boundary: "≥ 3:1 — --input, --ring, --brand, the ring arcs"
  focus: "one un-layered :focus-visible rule: 2px solid --ring, 2px offset. It outranks `outline-none`."
  touch: "≥ 44×44 CSS px under @media (pointer: coarse) — buttons, tabs, selects, inputs, nav links, links drawn as controls"
  smallest-text: "11px. There is no 9px or 10px text."
typography:
  families: { sans: Public Sans, mono: JetBrains Mono }   # self-hosted by next/font
  scale:
    display:    { class: "text-4xl sm:text-6xl lg:text-7xl", weight: 600, tracking: "-0.05em" }
    page-title: { class: "text-2xl sm:text-3xl",             weight: 600, tracking: "-0.06em" }
    card-title: { class: "text-xl sm:text-2xl",              weight: 600, tracking: "-0.045em" }
    section:    { class: "text-lg",                          weight: 600, tracking: "-0.03em" }
    body:       { class: "text-sm leading-6",                weight: 400 }
    small:      { class: "text-xs leading-5",                weight: 400 }
    eyebrow:    { class: "text-xs uppercase tracking-[0.18em]", weight: 700, color: accent }
    label:      { class: "text-[11px] uppercase tracking-[0.14em]", weight: 600, color: muted-foreground }
    numeric:    { class: "font-mono tabular-nums",           weight: 400 }
radius: { base: 0.8rem, sm: 0.48rem, md: 0.64rem, lg: 0.8rem, xl: 1.12rem, full: 9999px }
elevation:
  none:   "no shadow — the default, and the whole of the dark theme"
  card:   "shadow-sm — cards, headers"
  raised: "shadow-lg — popovers and the landing page's primary call to action"
spacing:
  field-gap: "mb-6"
  section-gap: "mt-10 / mt-12"
  card-padding: "p-5 sm:p-6"
  page-padding: "p-5 sm:p-8"
  measure: "max-w-2xl prose · max-w-3xl documents · max-w-[1500px] app"
components:
  button-primary: { background: "{colors.primary}", text: "{colors.primary-foreground}", radius: "{radius.lg}", padding: "px-5 py-3.5", hover: "bg-primary/90, translate-y-[-2px]" }
  button-ghost:   { background: "{colors.card}", text: "{colors.primary}", border: "1px {colors.border}", hover: "border-foreground/30, bg-secondary/60" }
  button-action:  { class: "bg-brand text-brand-foreground", use: "the one thing a screen wants done: Apply, Send, Generate" }
  input-field:    { background: "{colors.card}", border: "1px {colors.input}", radius: "{radius.lg}", padding: "px-4 py-3.5", error: "border-destructive, message below in destructive" }
  role-card:      { background: "{colors.card}", radius: "{radius.xl}", padding: "p-5", open: "edge-hover; edge-selected while its detail is open" }
  option-card:    { unselected: "border-input, text-muted-foreground", selected: "border-accent, bg-accent/5, text-primary, Check icon in accent" }
---

# Jobinko

## Brand & Style

Jobinko is a job-search copilot for Indian professionals. Its distinguishing act
is **showing the working behind every number it publishes**, and saying plainly
where it is uncertain. The design system exists to make that working legible —
on a 360-pixel-wide phone, on a variable connection, to someone who is tired.

The aesthetic is a **calm product surface**: a light ground, white cards with
one soft shadow, one quiet blue used for what can be acted on, and colour
otherwise reserved for the match score. Nothing on screen tries to persuade.

**"Hopeful" here means light, quiet and not judging — not cheerful.** A 42% is
drawn in slate, printed in ink, and sits beside the one thing holding it back.
It is a fact about the posting. It is never red, and never a verdict.

Two anti-patterns govern everything, and the first was broken once already.
**This must not look like a generic AI product** — no purple-to-blue gradient,
no glassmorphism, no blurred orb, no glow. TASK-107 (2026-09-23) shipped a
gradient, glass and two orbs against this paragraph; TASK-323 (2026-11-10)
removed all of them, and the utilities no longer exist to reach for. And **it
must not become a dashboard of invented figures** — every number on screen is
one the database holds.

## Colors

**One hue family.** Ink, ground and accent all sit at hue 250–255, and nothing
but the error red and the score bands exceeds chroma 0.13. That ceiling is the
point: saturated colour raises arousal (Wilms & Oberfeld 2018), and the palette
this replaced ran at 0.288.

**Blue, because the other hues are spoken for.** Green means a high match, ochre
a middling one, red a system error. An accent in any of them would read as an
outcome. Blue is what is left, and it is also the calm end of the spectrum.
Thirteen competitors were checked: three are blue. Joining them is deliberate —
hue can be copied in an afternoon, and what cannot is what the card says.

- **background / card** — a very light blue-grey page with white cards (light);
  a deep ink-blue page with slightly lifted cards (dark). Not black, and the
  dark text colour is off-white: full contrast without #fff-on-#000 glare.
- **primary** — the ink. Headings and the solid button. Inverts wholesale.
- **accent** — links, eyebrows, the focus ring, a selected state.
- **brand** — the action colour, flat. In dark it is a *light* blue with a
  *dark* label, because a saturated fill on a dark ground is the glare this
  system removes.
- **border vs input** — `border` is a hairline for dividers and card edges.
  `input` is the boundary of a field and clears 3:1. Do not swap them.
- **destructive** — system errors only. Never a match outcome.
- **score bands** — teal-green, ochre, slate. See the score ring below.

**Both themes are live.** Light is the default because every competitor checked
is light, because 84% of India's web traffic is a phone often read in daylight,
and because dark text on light reads better at small sizes. Dark is kept for
the documented user — searching in bed at 11pm — and follows the device unless
the candidate chooses otherwise.

**Contrast is tested, not claimed.** Change a token and
`theme-contrast.test.ts` tells you which of 42 pairs you broke. Do not write a
ratio in a comment.

## Typography

Two faces, both free for commercial use and both self-hosted at build time by
`next/font`, so no request reaches Google from a candidate's browser. That
matters for this product specifically: a font CDN request from a job-search page
is exactly the leak the privacy guarantee rules out.

- **Public Sans** carries everything, unchanged by the 2026-11-10 pass. It is the typeface of United States civic
  communication, drawn for public notices and government forms — the right voice
  for a product whose claim is *check our working*. It survived the system
  change unchanged.
- **JetBrains Mono** carries every number that is meant to be compared: scores,
  counts, the index audit table, the arithmetic figure. Always with
  `tabular-nums` so columns align down the page.

Weight 600 does the work at every heading size, with tight negative tracking
(−0.03em to −0.06em) that increases as the size does. Body is 400 at
`text-sm`/`leading-6`. **The smallest text anywhere is 11px** — 147 uses of 9–10px
were raised on 2026-11-10, because small text is where a phone in daylight fails first.

## Layout & Spacing

Three shells, and every screen uses one of them.

- **`AppShell`** (`src/components/features/app-shell.tsx`) — the signed-in
  frame. ~~Fixed 256px sidebar on desktop, a drawer on mobile, and a 80px header
  carrying eyebrow, page title and the account initials.~~ **Since 2026-10-08 (feed
  redesign): an 84px icon-over-label rail on desktop (one-word labels, the long name
  as the hover title; the account card is a popover behind the avatar), a full
  drawer on mobile, and a 56px header carrying the page title and the account
  initials (the eyebrow is screen-reader text only).** It takes the page body
  as `children`, so every screen inside it stays a **server component** and
  keeps its auth check and its database read on the server. Used by `/today`,
  `/applications`, `/profile`.
- **`OnboardingShell`** (`src/components/features/onboarding-shell.tsx`) — the
  five-step split screen. A sticky panel on the left carrying the mark
  and the two promises the product actually keeps, and the step on the right
  with "Step N of 5" and a progress bar. `STEPS` in that file is the single
  source of truth for the flow's length and pacing.
- **`DocPage`** (`src/components/features/doc-page.tsx`) — the standing
  documents: `/privacy`, `/terms`, `/audit`. Narrow measure, a header that gets
  the reader back out, no marketing furniture.

`/` (the landing page) carries its own header and footer and belongs to none of
the three.

Content widths: `max-w-2xl` for forms and prose, `max-w-3xl` for documents,
`max-w-[1500px]` for the signed-in app. Page padding is `p-5` rising to `p-8`
from the `sm` breakpoint — mobile is the primary surface for a candidate hiding
a search on a personal phone.

## Elevation & Depth

There are exactly three levels, and reaching past them is drift.

- **Level 1 — page.** The `background` ground. No border, no shadow.
- **Level 2 — cards.** `bg-card` + `border border-border` + `shadow-sm`. Role
  cards, form panels, rail tiles, headers, the sidebar.
- **Level 3 — floating things.** `shadow-lg` on popovers, menus and the landing
  page's primary button.

A card that can be opened firms its edge on hover (`edge-hover`) and keeps it
while selected (`edge-selected`). That is a border colour, not a shadow: there
is no glow in this system. Sticky headers are opaque — no backdrop blur.

The previous system had **zero** shadows as a matter of conviction. This one has
one soft recipe, used consistently. That is the trade the change made, and the
guard is that it stays *one* recipe: the anti-reference runs 196 shadowed
elements across four recipes, and drift toward it will start by adding a second.

## Shapes

One radius scale, generated from `--radius: 0.8rem`.

Everything interactive is `rounded-xl` (buttons, inputs, option cards, nav
items). Containers are `rounded-2xl` (cards, panels, dropzones). `rounded-full`
is for genuinely round things: status dots, avatars, badges and the score ring.
`rounded-lg` covers small inline chrome — icon tiles, skill chips, the remove
button on a chip.

Do not introduce a radius outside this scale. Eight simultaneous radii is a
measured property of the anti-reference.

## Components

### Buttons

`src/components/ui/button.tsx`. **Two variants only** — `primary` (solid ink,
`shadow-sm`, lifts 2px on hover) and `ghost` (card surface, ink text, hairline
border). The **action** treatment, `bg-brand text-brand-foreground`, is applied
directly where a screen has one thing it wants done (Apply, Send, Generate). A third variant invites hierarchy the product does
not have. Full width is not the default: pass `className="w-full"`, which
onboarding does everywhere and the app shell does nowhere.

### Inputs

`src/components/ui/input.tsx`. Label above in `text-sm font-semibold`, optional
**provenance** note beside it in `text-xs` muted — the mechanism that turns
typing into checking on the confirm screen. Field is white on the page ground
with an `input` border that clears 3:1; focus draws the global 2px `ring`
outline. Error swaps border and ring to `destructive` and puts
the message below in `destructive` — the only place chromatic red appears.

### Score ring

`src/components/ui/score-ring.tsx`. One flat colour per band — teal-green from
75, ochre from 60, slate below. It was a gradient that ran each band into its
neighbour's colour; that is gone. **Colour is the last of four cues**: the arc's
length is the score, the number is printed in ink at full contrast, the band
word sits beside it, and only then the colour. The bands are tested to stay
apart with the red–green axis removed. **Slate, never red, for a low score** —
a test fails if `--score-low` and `--destructive` ever share a value again.

### Role card

`src/components/features/role-card.tsx`. Still a **server component**.

Left: logo tile · quiet chips (at most four) · title · `company / one line` ·
a grid of facts · the actions (hide, save, apply). Right: the score panel —
ring, band word, up to two ticks for what is strong. On a phone the panel is
hidden and the ring rides beside the title **with its band word under it**
(since 2026-11-10; before, a phone showed a bare percentage).

**A score below the high band names the one thing holding it back** — "Some
skills missing", "Experience differs", "Title differs" — from the same stored
arithmetic as the ticks, as one muted line (in the score panel on desktop, under
the company line on a phone). Never a paragraph: the full
reasoning opens in the job's detail. The 2026-10-09 rebuild had removed every
reason from the card's face, which left a low score as a bare verdict and broke
this system's oldest rule (*never a score without its reason*). The card's
budget is enforced by `__tests__/role-card.test.ts`; adding an element means
changing a number there, in review, on purpose.

**The band follows the bucket, not the score** (`bandFor` in `fit-ring.tsx`):
a card and the heading above it must never disagree.

### Option card

The repeated select control across onboarding — portals, credential, job type.
Unselected is a muted hairline box; selected takes `border-accent`, a 5% accent
wash and a `Check` in accent. It is a `<button aria-pressed>` for multi-select
groups and never a coloured pill.

### Arithmetic figure

Still the brand's signature graphic device, still in JetBrains Mono, and still a
**narrowing**, never a single total: `650 indexed today · 47 matching your
search · 3 a strong fit`. It appears on the empty state, the index audit page
and the daily digest. **Never only the total.** The falling number is the
argument.

## Do's and Don'ts

**Do**

- Show the arithmetic. Every count that narrows is displayed as a sequence.
- Show the working, as sentences. Every score opens onto the remark for each
  component and the line from the posting it was read from. A number never
  appears without its explanation.

  *Amended 2026-09-07:* the disclosure used to print each component's own points
  (`Role match 28/28`) beside its remark. That is gone at the founder's call —
  it put a second set of numbers on screen for the reader to reconcile against
  the one on the ring, and the remark was always the part that explained
  anything. The score, the reason line and every source quote all stay. The
  label changed with it: **Insights**, not *Working*.
- Attribute thinness to coverage. A short list says "that's a thin day for our
  coverage, not a verdict on you."
- Set every comparable number in `font-mono tabular-nums`.
- Keep the reason line adjacent to the score.
- Reach for an existing shell before inventing a layout.
- Cut a line before adding one. A repeated control is an icon with a `title` and
  an `aria-label`, not a text label repeated down the page; an explanation that
  applies to every row belongs once in the rail, not once per row; and a
  sentence restating the heading above it is not a sentence.

**Don't**

- Don't use `destructive` for a match outcome. It is for system failures.
- Don't add a gradient, a glow, a blur or a glass surface. The utilities were
  deleted so that doing it again takes a decision.
- Don't write a contrast ratio in a comment. Add the pair to the test.
- Don't put text under 11px on screen, or a control under 44px on a phone.
- Don't add a radius outside the `--radius` scale.
- Don't introduce a second accent hue. Green and ochre belong to the score.
- Don't render a score without its reason, anywhere — that is the exact failure
  the product exists to correct.
- Don't ship a number the database does not hold. If the export has a tile for
  it and we cannot compute it, the tile does not ship.
- Don't add a token to one theme. Both, in the same edit — a test enforces it.
- Don't caption a screen three times. An eyebrow, a headline and a subtitle
  saying the same thing is the default failure mode of the export's copy, and
  the app header has usually already named the page.
- Don't cut a reason, a refusal, a deletion promise or a named uncertainty to
  save a line. Those are the product. Shorten them, move them behind a
  disclosure or an icon label, but never remove the fact.

## What was retired, and why

**2026-11-10 — the zinc + indigo→violet system (TASK-107).** Retired because its
brand ran at chroma 0.233–0.288 against a documented 0.12, because it shipped
the gradient, glass and orbs this file forbade, because four of its contrast
pairs failed AA when finally measured (action-button label 4.38:1, field
boundary 1.47:1), and because it made a low score the error colour. Its token
*architecture* was right and is kept: 230 references and not one hardcoded
colour is why this change was six values and a rename.

**Earlier — the monochrome notice system:**

The original system was monochrome by construction, hairline-ruled, zero-shadow
and square-cornered, anchored on live computed styles from `zerodha.tech`, and
set on a `#F0F0F0` paper ground. Its argument was that the product is a
**published notice**, and notices do not float — so no shadow, no rounding, rows
rather than cards.

It was replaced by the saaf-ai export because the founder wanted the product to
read as a product rather than as a document, and because the export carried a
worked-through signed-in application — sidebar, header, score ring, kanban —
that the notice system had no answer for. **That is a taste decision that was
made deliberately, not a defect that was fixed.** The honest cost: the
"published notice" argument no longer runs at the level of the surface.

What survived the change, because it was never really about the visuals:

| Survived | Where it lives now |
|---|---|
| Show the working behind every score | `role-card.tsx` disclosures |
| Never a score without its reason | `role-card.tsx` |
| Chromatic red for system errors only | `destructive`, used in three places |
| Attribute a thin list to coverage | `/today` rail |
| The arithmetic figure, as a narrowing | `/today`, `/audit`, digest |
| Public Sans + JetBrains Mono | `layout.tsx` |
| No invented numbers on screen | `/today` rail, and the three export tiles that were dropped |

Retired with the system and drawn nowhere: `row-role-withheld` and
`row-role-stretch` (nothing is withheld — that went with gating on 2026-09-04),
the `--color-*` / `--type-*` / `--space-*` token block, the `.measure` and
`.rule` global classes, and the CSS modules for button, input, row and
arithmetic. `docs/DESIGN.html`, the live style guide that rendered the retired
system, was deleted with it — a page that renders tokens no screen uses any more
is a trap, not a record, and git history keeps it if it is ever wanted. **There
is no live style guide for this system yet**; this file is the source of truth
until one is built.
