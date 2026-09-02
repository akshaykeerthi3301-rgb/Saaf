---
version: alpha
name: Saaf
description: A flat, paper-toned, sharp-cornered design system for a product whose core visual act is refusing to show something. Monochrome by construction, hairline-ruled, no shadows, no rounding — derived from zerodha.tech and the plain-text credibility of a public notice.
colors:
  primary: "#141414"
  on-primary: "#F0F0F0"
  secondary: "#5F5F5F"
  neutral: "#F0F0F0"
  surface: "#FFFFFF"
  surface-container: "#E9E9E4"
  surface-container-high: "#E2E2D7"
  on-surface: "#141414"
  on-surface-variant: "#5F5F5F"
  outline: "#7A7A7A"
  outline-variant: "#C5C5C5"
  inverse-surface: "#141414"
  inverse-on-surface: "#F0F0F0"
  error: "#8C2F22"
  on-error: "#F0F0F0"
  dark-primary: "#E8E8E4"
  dark-on-primary: "#131313"
  dark-secondary: "#A0A09A"
  dark-neutral: "#131313"
  dark-surface: "#1C1C1C"
  dark-surface-container: "#1F1F1C"
  dark-surface-container-high: "#23231F"
  dark-on-surface: "#E8E8E4"
  dark-on-surface-variant: "#A0A09A"
  dark-outline: "#727270"
  dark-outline-variant: "#3A3A38"
  dark-inverse-surface: "#E8E8E4"
  dark-inverse-on-surface: "#131313"
  dark-error: "#E08C7E"
  dark-on-error: "#131313"
typography:
  display-lg:
    fontFamily: Public Sans
    fontSize: 44px
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.3
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.35
  body-lg:
    fontFamily: Public Sans
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Public Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: Public Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.08em
  numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0
  sm: 2px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
  margin: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 12px 24px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 12px 20px
    height: 44px
  button-ghost-hover:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px 14px
    height: 44px
  input-field-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  row-role:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: 16px 0
  row-role-withheld:
    backgroundColor: transparent
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: 16px 0
  row-role-stretch:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: 16px
  arithmetic-figure:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.numeric-md}"
    rounded: "{rounded.none}"
    padding: 0
---

# Saaf

## Brand & Style

Saaf is a free daily job shortlist for Indian professionals in their first five years of work. Its distinguishing act is not showing roles — it is *refusing* to show them, and publishing what it refused and why. The design system exists to make that refusal legible, checkable, and impossible to mistake for a marketing claim.

The aesthetic intent is **a public notice, not a dashboard**. Pages should read like something printed and posted rather than something rendered and animated — a nutrition label, a published audit, a shareholders' letter. The emotional response is trust through plainness: nothing here is trying to persuade you, which is exactly why you believe it. The brand's tone is exact, unhedged, and quiet, and the surface has to match — a product that tells a candidate "no" with a stated reason cannot be wrapped in gradients and glow without the two contradicting each other.

Two anti-patterns govern everything below. **This must never look like an AI product** — no purple-to-blue gradient, no glassmorphism, no blurred orb, no rounded-square icon card above a heading, no oversized italic serif hero. And **it must never look like a dashboard** — no widget grids, no sparkline chrome, no metric tiles competing for attention. If a screen starts to feel like an analytics panel, return it to a single column.

The anti-reference is **resumly.ai**, and it is named here deliberately rather than described in the abstract. Measured on its live page in September 2026, it runs **196 shadowed elements** across four shadow recipes, **eight** corner radii in simultaneous use (999px pills on 473 elements, plus 20, 16, 12, 10, 8, 6 and 50%), **four** gradient recipes including a `135deg` blue-to-lighter-blue hero, **two** banned typefaces (Inter and Plus Jakarta Sans), five font weights, and eight ad-hoc type sizes with no scale between them. The anchor this system is built from runs zero shadows, one radius, one font and one dominant weight. These are not two points on a spectrum; they are opposite answers to the same question, and when a future screen drifts, it will drift toward Resumly. Measure against those numbers, not against a feeling.

The contradiction runs deeper than surface. Resumly's headline is *"Your Job Search, Fully Automated — applies for you while you sleep"*, which is the auto-apply behaviour this product exists to argue against. Borrowing its visual language would put the look and the argument in opposition. One device is worth taking: framing the product screenshot inside browser chrome, which is an honest way to show a screenshot-first product and carries no ideological freight.

## Colors

The palette is monochrome by construction, derived from computed styles on `zerodha.tech` — an Indian product in an adjacent trust-critical category, aimed at the same person.

- **Neutral (#F0F0F0):** The page ground, taken directly from the reference. Deliberately not white — it reads as paper and lowers the glare for a user who is on a laptop in a dark room at 11pm.
- **Surface (#FFFFFF):** True white, used only for genuinely elevated content — input fields and modal sheets — so that "raised" means something.
- **Surface-container-high (#E2E2D7):** The bone tint, the single non-grey surface in the system, lifted from the reference's one panel. Reserved for the **Stretch tier** — the only place the product shows a role the candidate does not fully clear.
- **Primary (#141414):** Near-black ink, not pure black. Headlines, body, primary buttons, and links. Links are undecorated ink, following the reference — no blue, no underline.
- **On-surface-variant (#5F5F5F):** Secondary text — the *reason* line on every recommendation, timestamps, metadata, and the text of a withheld role.
- **Outline (#7A7A7A) vs Outline-variant (#C5C5C5):** A deliberate split. `outline-variant` is the soft hairline from the reference, used for decorative dividers between rows, where WCAG's non-text contrast rule does not apply. `outline` is darker and reserved for **interactive component boundaries** — input borders, focus rings — where 3:1 is required. It measures 3.77:1 on neutral, 4.29:1 on surface, and 3.29:1 on the bone container.
- **Error (#8C2F22):** A low-chroma oxide red, the one chromatic value in the system. It is reserved **exclusively for system errors** — failed form validation, a broken upload, a destructive confirmation. It is **never** used for a gate outcome. A refused role is not an error; it is a correct answer, and colouring it red would reframe an honest no as a failure.

Dark-mode values are carried in the same map under a `dark-` prefix (`dark-surface`, `dark-on-surface`, and so on) so both palettes stay machine-readable in one flat schema. Every foreground/background pair in both modes has been verified: body text ranges from 4.89:1 to 18.42:1, and no pair falls below the 4.5:1 AA threshold.

## Typography

The system is set in **Public Sans** throughout, with **JetBrains Mono** carrying numbers. Both are free for commercial use.

Public Sans is not a neutral default here — it is the typeface of United States civic communication, drawn for public notices and government forms. A product whose central claim is *we publish what we refused, in a form you can check* should be set in the type of an official notice. It also substitutes cleanly for the Inter found on the reference site, which is excluded as a vibe-coded default.

- **Display (44px/300)** carries the light weight observed on the reference, where 182 of 210 elements were weight 300. That lightness is kept **only at display size**. Body drops to 400, because 300 is fragile at 15–17px on the low-DPI Windows displays a large share of Indian office users are on. This is a deliberate deviation from the anchor.
- **Body-lg (17px/1.6)** is the reference's exact body size and rhythm, and is the default for role listings and long-form reading.
- **Label-sm (11px/600, 0.08em, uppercase)** carries metadata, gate-type tags, and column headers on the audit table.
- **Numeric-md (JetBrains Mono 15px)** exists for one reason: the arithmetic device. `3,200 → 47 → 3` is the brand's signature figure, and a monospaced tabular face makes the subtraction legible and columns align. Every number in a table, an audit row, or an empty state uses it. Set `font-variant-numeric: tabular-nums` alongside.

## Layout & Spacing

The layout model is a document, not a canvas.

- **Content width:** 950px maximum, taken from the reference's measured `max-width`. Prose and role listings sit in a single column and never widen into a grid. Outer margins start at 48px (`margin`) and compress to 16px (`md`) on mobile — the primary surface for a user hiding a search on a personal phone.
- **Vertical rhythm:** An 8px base governs everything: `xs (4) — sm (8) — md (16) — lg (32) — xl (64)`, with `gutter (24)` and `margin (48)` as named layout tokens. The reference's irregular 15px and 18px paddings were normalised onto this scale rather than copied.
- **Rows over cards:** The core object — a role — is a **row separated by a hairline**, not a card. Cards imply containers a user can rearrange; rows imply a list someone else compiled and is accountable for. Row padding is 16px vertical, 0 horizontal, so the rule runs the full measure.
- **Section breaks** use 64px (`xl`), and this is the only generosity in the system. Density is otherwise comfortable rather than airy — the audit table should feel like a document with a lot on it.

## Elevation & Depth

There is no elevation. The reference returned an empty set for box-shadows across every element on the page, and that is reproduced here exactly.

- **Level 1 (Page):** The neutral ground. No shadow, no border.
- **Level 2 (Rows and sections):** Separated by a single 1px `outline-variant` hairline. That rule is the entire depth model.
- **Level 3 (Inputs, modals):** A white `surface` with a 1px `outline` border. Still no shadow — a raised element is identified by its lighter surface and its darker border, never by a cast shadow.

This is a conviction, not a style preference. Shadow simulates a physical object floating above a plane; this product is arguing that it is a published document, and documents do not float. Anything softer than a hairline breaks the argument.

## Shapes

Corners are square. The reference contained no rounded rectangles at all — the only radius on the entire page was `50%` on circular avatars.

`rounded.none (0)` is the default for every surface, button, row, table, and container. `rounded.sm (2px)` exists for one purpose: input fields, where a hair of softening signals "you can type here" and distinguishes a field from a static cell. `rounded.full` is reserved for genuinely circular elements — avatars and status dots.

The scale deliberately has **no `md`, `lg`, or `xl` levels.** They are omitted rather than left unused, so that no future screen can quietly reach for a 12px radius and drift the system toward the consumer-app default.

## Components

### Buttons

Primary buttons are solid `#141414` ink with `#F0F0F0` text, square-cornered, 44px tall, one per screen. Hover shifts the background to `secondary` — a lightening, not a colour change. Ghost buttons are transparent with ink text and a `surface-container` hover, used for everything secondary. There is no tertiary or outlined button variant; two are enough, and a third invites hierarchy the product does not have.

### Inputs

Input fields are white on the neutral ground with a 1px `outline` border at 2px radius. Focus does not add a glow or a coloured ring — the border thickens to 2px in `primary` ink. Labels sit above the field; helper text sits below in `body-sm` `on-surface-variant`. Error states swap the border to `error` and surface the message below in `error` — the only place chromatic colour appears in the interface.

### Role rows — the three states

These three are the product, and they are the reason this system exists.

**`row-role`** is the default: a role that cleared every gate. Ink text at `body-lg`, hairline rule beneath, with its score and one-line reason in `on-surface-variant` `body-sm` underneath. Nothing decorates it — a role that qualifies simply appears.

**`row-role-withheld`** is a role the gate refused. It is **drawn, not hidden.** The title is set in `on-surface-variant` with a 1px `line-through` in the same colour, and the reason follows in `body-sm` — *"asks for a chartered accountant; your profile doesn't carry one."* No red, no warning icon, no alert styling. The refusal reads as a stated fact, which is the entire brand position: colouring it as an error would make an honest answer look like a failure.

**`row-role-stretch`** is the only experience-typed near-miss the product will show, capped at a two-year gap. It sits on the `surface-container-high` bone tint with 16px padding — the single tinted surface in the system — and carries a `label-sm` uppercase "STRETCH" tag. The tint exists so that a stretch role can never be mistaken for a cleared one at a glance, without resorting to colour coding.

### Arithmetic figure

`arithmetic-figure` renders the empty-state and audit numbers in JetBrains Mono: `3,200 indexed · 47 in your function · 3 cleared your experience band`. It is the brand's signature graphic device and appears on the empty state, the gate audit page, and the daily digest. It always shows the **subtraction**, never only the total — the falling number is the argument.

## Do's and Don'ts

**Do**

- Show the arithmetic. Every count that narrows is displayed as a sequence, never as a single total.
- Draw refusals. A withheld role appears struck through with its reason stated, never silently omitted.
- Attribute thinness to coverage. A short list says "that's a thin day for our coverage, not a verdict on you."
- Use rows and hairlines for the role list. Reach for a card only when content is genuinely a self-contained object.
- Set every number in `numeric-md` with tabular numerals so columns align down the page.
- Keep the reason line adjacent to the score. A number never appears without its explanation.

**Don't**

- Don't use `error` red for a gate outcome. It is reserved for system failures; a refusal is a correct answer.
- Don't add a shadow — not one. The anti-reference has 196 of them; this system has zero. If something needs to separate, it gets a hairline or a lighter surface.
- Don't round a corner beyond the 2px reserved for inputs. There is no `md` radius on purpose, and no pills — the anti-reference has 473 pill-shaped elements and eight competing radii.
- Don't introduce a second chromatic accent, and never reach for a Tailwind default green/red/amber trio. The system is monochrome and the one oxide red is already spoken for.
- Don't render a score without its reason, anywhere — that is the exact failure the product exists to correct.
- Don't build a dashboard. No metric tiles, no widget grid, no sparkline chrome. One column, one document.
