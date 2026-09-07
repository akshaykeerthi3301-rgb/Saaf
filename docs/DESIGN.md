---
version: beta
name: Saaf
description: >
  The shadcn/Tailwind system exported in saaf-ai/, adopted 2026-09-05 and
  completed 2026-09-07. Paper-blue ground, white cards, one green accent, a
  single 0.8rem radius scale, and one soft shadow used only on cards. It
  replaced a monochrome, zero-shadow, square-cornered system derived from
  zerodha.tech — see "What was retired, and why" for what that cost and what
  survived it.
colors:
  # oklch, exactly as they sit in src/app/globals.css. Hex equivalents are
  # approximate and are here only to make the values readable at a glance.
  background:            "oklch(0.975 0.008 240)"   # ~#F1F4F8 — page ground
  foreground:            "oklch(0.22 0.025 250)"    # ~#2B3140 — body text
  card:                  "oklch(1 0 0)"             # #FFFFFF — every raised surface
  card-foreground:       "oklch(0.22 0.025 250)"
  popover:               "oklch(1 0 0)"
  popover-foreground:    "oklch(0.22 0.025 250)"
  primary:               "oklch(0.22 0.04 250)"     # ~#28304A — ink, headings, solid buttons
  primary-foreground:    "oklch(0.985 0.005 240)"
  secondary:             "oklch(0.95 0.014 235)"    # ~#E9EDF3 — quiet fills, chips
  secondary-foreground:  "oklch(0.28 0.035 250)"
  muted:                 "oklch(0.95 0.014 235)"
  muted-foreground:      "oklch(0.5 0.025 245)"     # ~#6E7689 — secondary text
  accent:                "oklch(0.54 0.12 163)"     # ~#12876A — the one chromatic value
  accent-foreground:     "oklch(0.98 0.01 160)"
  destructive:           "oklch(0.577 0.245 27.325)" # system errors ONLY
  border:                "oklch(0.89 0.018 235)"    # ~#D6DCE6 — every hairline
  input:                 "oklch(0.89 0.018 235)"    # field borders
  ring:                  "oklch(0.54 0.12 163)"     # focus ring == accent
typography:
  # Two faces, self-hosted at build time by next/font (src/app/layout.tsx).
  # Tailwind's font-sans / font-mono resolve through --font-sans / --font-mono
  # set in :root; nothing else reads a raw font variable.
  families:
    sans: Public Sans
    mono: JetBrains Mono
  scale:
    # Tailwind's own scale. Sizes below are what the shipped screens use.
    display:   { class: "text-4xl sm:text-6xl lg:text-7xl", weight: 600, tracking: "-0.05em" }
    page-title:{ class: "text-2xl sm:text-3xl",             weight: 600, tracking: "-0.06em" }
    card-title:{ class: "text-xl sm:text-2xl",              weight: 600, tracking: "-0.045em" }
    section:   { class: "text-lg",                          weight: 600, tracking: "-0.03em" }
    body:      { class: "text-sm leading-6",                weight: 400 }
    small:     { class: "text-xs leading-5",                weight: 400 }
    eyebrow:   { class: "text-xs uppercase tracking-[0.18em]", weight: 700, color: accent }
    label:     { class: "text-[10px] uppercase tracking-[0.14em]", weight: 600, color: muted-foreground }
    numeric:   { class: "font-mono tabular-nums",           weight: 400 }
radius:
  # One scale, generated from --radius: 0.8rem in @theme inline.
  base: 0.8rem
  sm:   0.48rem   # calc(base * 0.6)
  md:   0.64rem   # calc(base * 0.8)
  lg:   0.8rem    # base
  xl:   1.12rem   # calc(base * 1.4)  — the card radius (rounded-2xl reads here)
  full: 9999px    # pills, avatars, status dots
elevation:
  none:  "no shadow — the default"
  card:  "shadow-sm — cards, headers, the brand mark"
  raised:"shadow-lg shadow-primary/10 — the landing page's primary call to action, and nothing else"
spacing:
  # Tailwind's 0.25rem step. Named rhythms the screens actually keep to:
  field-gap:    "mb-6"      # between form fields
  section-gap:  "mt-10 / mt-12"
  card-padding: "p-5 sm:p-6"
  page-padding: "p-5 sm:p-8"
  measure:      "max-w-2xl prose · max-w-3xl documents · max-w-[1500px] app"
components:
  button-primary:
    background: "{colors.primary}"
    text: "{colors.primary-foreground}"
    radius: "{radius.lg}"
    padding: "px-5 py-3.5"
    typography: "text-sm font-semibold"
    shadow: "{elevation.card}"
    hover: "bg-primary/90, translate-y-[-2px]"
  button-ghost:
    background: "{colors.card}"
    text: "{colors.primary}"
    border: "1px {colors.border}"
    radius: "{radius.lg}"
    padding: "px-5 py-3.5"
    hover: "border-foreground/30, bg-secondary/60"
  input-field:
    background: "{colors.card}"
    border: "1px {colors.input}"
    radius: "{radius.lg}"
    padding: "px-4 py-3.5"
    typography: "text-sm"
    focus: "border-accent + ring-2 ring-accent/10"
    error: "border-destructive + ring-destructive/10, message below in destructive"
  role-card:
    background: "{colors.card}"
    border: "1px {colors.border}"
    radius: "{radius.xl}"
    padding: "p-5 sm:p-6"
    shadow: "{elevation.card}"
  option-card:
    # The repeated single/multi-select control across onboarding.
    unselected: "border-input, text-muted-foreground, hover:border-foreground/30"
    selected:   "border-accent, bg-accent/5, text-primary, Check icon in accent"
    radius: "{radius.lg}"
    padding: "px-4 py-3.5"
---

# Saaf

## Brand & Style

Saaf is a free job-matching product for Indian professionals. Its distinguishing
act is not showing roles — it is **showing the working behind every number it
publishes**, and saying plainly where it is uncertain. The design system exists
to make that working legible and checkable.

The aesthetic is a **calm product surface**: a paper-blue ground, white cards
that carry one soft shadow, a single green accent used sparingly to mark what is
live or confirmed, and generous but not airy spacing. Nothing on screen tries to
persuade; the credibility comes from the fact that every number opens to show
where it came from.

Two anti-patterns still govern everything. **This must not look like a generic
AI product** — no purple-to-blue gradient, no glassmorphism, no blurred orb, no
oversized italic serif hero. And **it must not become a dashboard of invented
figures** — every tile on the signed-in rail shows a number the database
actually holds. The saaf-ai export shipped a profile-strength meter, a weekly
application limit and a B2B discoverability toggle; all three were dropped
because the first two are made up and the third is parked.

The named anti-reference is still **the maximalist résumé-tool look**, but for its argument rather
than its shadows: its headline is *"Your Job Search, Fully Automated — applies
for you while you sleep"*, which is the auto-apply behaviour this product exists
to argue against.

## Colors

The palette is a cool near-neutral with exactly one chromatic accent.

- **background** — the page ground. A very light blue-grey, not white, so a
  white card reads as raised without needing a heavy shadow.
- **card (#FFFFFF)** — every raised surface: role cards, the app header, the
  sidebar, form panels, document pages.
- **primary** — a deep desaturated navy-black. Headings, body emphasis, solid
  buttons, and the active navigation item. It is the ink.
- **muted-foreground** — secondary text: the reason line on every role, helper
  text under every field, metadata.
- **border** — the single hairline value. Used for card borders, dividers,
  table rules and unfocused input borders alike.
- **accent (a deep green)** — the one chromatic value, and it is rationed. It
  marks **eyebrows**, **the focus ring**, **a confirmed or selected state**, and
  **live figures**. It never carries a match outcome.
- **destructive** — reserved **exclusively for system errors**: a failed upload,
  a rejected form, a destructive confirmation. It is **never** used for a match
  outcome. A low score is a correct answer, not a failure.

There is **no dark palette**. `color-scheme: light` is set and the `dark`
variant is declared but undefined. Adding one means defining every token under
`.dark` in a single pass — a partial dark palette previously shipped a real
invisible-button defect, and the note in `globals.css` records it.

## Typography

Two faces, both free for commercial use and both self-hosted at build time by
`next/font`, so no request reaches Google from a candidate's browser. That
matters for this product specifically: a font CDN request from a job-search page
is exactly the leak the privacy guarantee rules out.

- **Public Sans** carries everything. It is the typeface of United States civic
  communication, drawn for public notices and government forms — the right voice
  for a product whose claim is *check our working*. It survived the system
  change unchanged.
- **JetBrains Mono** carries every number that is meant to be compared: scores,
  counts, the index audit table, the arithmetic figure. Always with
  `tabular-nums` so columns align down the page.

Weight 600 does the work at every heading size, with tight negative tracking
(−0.03em to −0.06em) that increases as the size does. Body is 400 at
`text-sm`/`leading-6`. The old system's 300-weight display face is gone with it.

## Layout & Spacing

Three shells, and every screen uses one of them.

- **`AppShell`** (`src/components/features/app-shell.tsx`) — the signed-in
  frame. Fixed 256px sidebar on desktop, a drawer on mobile, and a 80px header
  carrying eyebrow, page title and the account initials. It takes the page body
  as `children`, so every screen inside it stays a **server component** and
  keeps its auth check and its database read on the server. Used by `/today`,
  `/applications`, `/profile`.
- **`OnboardingShell`** (`src/components/features/onboarding-shell.tsx`) — the
  five-step split screen. A sticky gradient panel on the left carrying the mark
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
- **Level 3 — the one call to action.** `shadow-lg shadow-primary/10` on the
  landing page's primary button. Nowhere else.

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
white text, `shadow-sm`, lifts 2px on hover) and `ghost` (white card surface,
ink text, hairline border). A third variant invites hierarchy the product does
not have. Full width is not the default: pass `className="w-full"`, which
onboarding does everywhere and the app shell does nowhere.

### Inputs

`src/components/ui/input.tsx`. Label above in `text-sm font-semibold`, optional
**provenance** note beside it in `text-xs` muted — the mechanism that turns
typing into checking on the confirm screen. Field is white on the page ground
with a hairline border; focus swaps the border to `accent` and adds
`ring-2 ring-accent/10`. Error swaps border and ring to `destructive` and puts
the message below in `destructive` — the only place chromatic red appears.

### Role card

`src/components/ui/role-card.tsx`. The single shipped role object, and still a
**server component**: the disclosures are native `<details>`, the only client
code is the two action buttons, and **the breakdown is never behind a request**
— a candidate can check the arithmetic without a round trip.

**Four rows of text, and that is the budget.** Left column: title, then
`company · city` on one line, then the reason line, then a single *Insights*
disclosure sitting beside two icon buttons. Right column is the score ring — the
number in `text-3xl tabular-nums` and its band, nothing else.

**The band follows the bucket, not the score.** It read the score alone until
2026-09-07, so a role sitting under *Good match, short on experience* announced
itself as a STRONG MATCH two lines under the heading saying it was not. A card
and the heading above it must never disagree; `BAND` in `role-card.tsx` is
keyed by bucket, and only `matches` falls through to the score bands. A strong match
(≥75, in the `matches` bucket) inverts to ink-on-primary with an accent ring.

It carried nine rows until 2026-09-07. What went, and why none of it was a fact
leaving the page: the band tag above the title said what the ring's band says;
the *Salary not stated* chip was true of all 229 roles and is stated once in the
rail instead of 54 times in the list; the two component readouts under the ring
repeated the top of the working; company and city were two rows in two bordered
chips; *How this score is built* and *What we read from this posting* were two
disclosures answering one question and are now one. `New` is a dot and the
unread-experience warning is an icon, both with labels for assistive tech.

**Two things on this card are not negotiable.** The **reason line** stays at
full length on the face of the card — a score without its reason is the exact
failure this product exists to correct. And **the breakdown is not decoration**:
the score it replaced was `70 + posting verbosity` and never read the candidate
at all, so a bare number would hide that class of defect again.

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
- Don't add a second shadow recipe. There is `shadow-sm` for cards and one
  `shadow-lg` on one button.
- Don't add a radius outside the `--radius` scale.
- Don't introduce a second chromatic accent, and never reach for a Tailwind
  default green/red/amber trio. One green is already spoken for.
- Don't render a score without its reason, anywhere — that is the exact failure
  the product exists to correct.
- Don't ship a number the database does not hold. If the export has a tile for
  it and we cannot compute it, the tile does not ship.
- Don't half-add dark mode. All tokens or none.
- Don't caption a screen three times. An eyebrow, a headline and a subtitle
  saying the same thing is the default failure mode of the export's copy, and
  the app header has usually already named the page.
- Don't cut a reason, a refusal, a deletion promise or a named uncertainty to
  save a line. Those are the product. Shorten them, move them behind a
  disclosure or an icon label, but never remove the fact.

## What was retired, and why

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
