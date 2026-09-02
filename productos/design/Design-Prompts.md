# Design Prompts

_Drafted: September 2026. Generated from `docs/PRODUCT.md`, `productos/design/1-Product-Identity.md`, and `docs/DESIGN.md`. Paste each prompt below into Pencil (pencil.dev), paper.design, Claude Design, or MagicPath — the brand context and the real design tokens are already inside every prompt, so the output should be on-brand from the first generation._

## How to use this file

1. Open your AI design tool — Pencil (pencil.dev), paper.design, Claude Design, or MagicPath.
2. **Start with Prompt 1, the design system.** Generate the component library first; it becomes the visual foundation the two screens are built on.
3. Copy the entire prompt — from `Design a…` through the final `Use tokens from…` line.
4. Paste it in. Don't add your own styling direction; the prompt already carries the palette, the type pairing, and the exclusions.
5. Run Prompts 2 and 3 **on the same canvas** so the screens pull from the components Prompt 1 just produced.
6. `docs/DESIGN.md` remains the source of truth for exact token values, and `docs/DESIGN.html` renders them live in a browser if you want to check a generated screen against the real system.

**One thing to watch.** This design system is monochrome, flat, and square-cornered by decision. AI design tools drift toward the category default — gradients, pill buttons, drop shadows, a green/red/amber status trio. Every prompt below forbids these explicitly. If a generation comes back with them anyway, regenerate rather than accepting it; the whole identity rests on not looking like the rest of the category.

---

## Brand identity context (embedded in every prompt below)

```
Brand character: refusal-is-the-product — a match score's first job is to refuse, and to publish what it refused and why. Exact, unhedged, quiet.
Tone: Exact, but not clinical. Plain, but not simplified. Certain about method, never about outcome. Matter-of-fact about bad news, never apologetic. Quiet, but not cold.
Visual style: A public notice, not a dashboard. Documents over dashboards; rows separated by hairline rules, never cards floating on gradients. A refused item is DRAWN — struck through with its reason stated — never hidden. Counts are always shown as subtraction, never as a total.
Type pairing: Public Sans for all text (the typeface of civic notices); JetBrains Mono for every number, with tabular numerals.
Color direction: Monochrome on paper. Ground #F0F0F0 (deliberately not white), ink #141414, secondary text #5F5F5F, bone tint #E2E2D7 for the single "stretch" surface, hairline #C5C5C5. One oxide red #8C2F22, reserved exclusively for system errors — never for a gate outcome.
What to avoid: Zero shadows. Zero gradients. No rounded corners beyond 2px on inputs, and no pills. No glassmorphism, no blurred orbs, no Tailwind default green/red/amber. No Inter, Instrument Serif, Outfit or Plus Jakarta Sans. Never write "AI-powered", "top applicant", "perfect match", "dream job", "unlock", "supercharge", "10x", "guaranteed", or "easy to use".
```

---

## Prompt 1: Design system foundation

**Purpose:** Generate the full UI component library — palette, type scale, components, layout — that Prompts 2 and 3 reuse. Run this one first.
**Position in journey:** Foundation. Nothing else should be generated before it.

> Deviation from the standard template, deliberate: this prompt does **not** ask for a five-level shadow scale or a full radius ladder. Saaf has zero shadows and three radii by decision, and asking a tool to invent elevation levels would manufacture exactly what `docs/DESIGN.md` forbids.

### Prompt — paste this into your AI design tool

```
Design a complete UI design system foundation for Saaf — a free daily job shortlist for Indian professionals in their first five years of work, which removes every role the candidate is structurally disqualified from before ranking what remains, and publishes what it refused and why.

Brand identity:
Brand character: refusal-is-the-product — a match score's first job is to refuse, and to publish what it refused and why. Exact, unhedged, quiet.
Tone: Exact, but not clinical. Plain, but not simplified. Certain about method, never about outcome. Matter-of-fact about bad news, never apologetic. Quiet, but not cold.
Visual style: A public notice, not a dashboard. Documents over dashboards; rows separated by hairline rules, never cards floating on gradients. A refused item is DRAWN — struck through with its reason stated — never hidden. Counts are always shown as subtraction, never as a total.
Type pairing: Public Sans for all text (the typeface of civic notices); JetBrains Mono for every number, with tabular numerals.
Color direction: Monochrome on paper. Ground #F0F0F0 (deliberately not white), ink #141414, secondary text #5F5F5F, bone tint #E2E2D7 for the single "stretch" surface, hairline #C5C5C5. One oxide red #8C2F22, reserved exclusively for system errors — never for a gate outcome.
What to avoid: Zero shadows. Zero gradients. No rounded corners beyond 2px on inputs, and no pills. No glassmorphism, no blurred orbs, no Tailwind default green/red/amber. No Inter, Instrument Serif, Outfit or Plus Jakarta Sans. Never write "AI-powered", "top applicant", "perfect match", "dream job", "unlock", "supercharge", "10x", "guaranteed", or "easy to use".

What to design:
A comprehensive component library, organised by category. This system is monochrome and flat by decision — do not add colour, depth, or rounding to "improve" it.

Foundations
- Color palette, light mode: ground #F0F0F0, elevated surface #FFFFFF, container #E9E9E4, bone container #E2E2D7, ink #141414, secondary text #5F5F5F, component-boundary outline #7A7A7A, decorative hairline #C5C5C5, error #8C2F22 on #F0F0F0.
- Color palette, dark mode: ground #131313, elevated surface #1C1C1C, container #1F1F1C, bone container #23231F, text #E8E8E4, secondary text #A0A09A, outline #727270, hairline #3A3A38, error #E08C7E.
- There is no accent colour and no success/warning/info trio. State is carried by typography, strike-through, and one bone-tinted surface. Do not invent semantic colours.
- Typography scale, all Public Sans except where noted: display 44px/300/1.3/-0.02em · headline-lg 26px/400/1.3 · headline-md 20px/500/1.35 · body-lg 17px/400/1.6 · body-md 15px/400/1.6 · body-sm 13px/400/1.5 · label-md 13px/500/1.4 · label-sm 11px/600/1.4/0.08em uppercase · numeric 15px/400/1.5 in JetBrains Mono with tabular numerals.
- Spacing scale: 4 / 8 / 16 / 32 / 64px, plus a 24px gutter and 48px page margin. 8px base.
- Border radius: exactly three values — 0 (everything), 2px (input fields only), and full (circular avatars and status dots only). There is deliberately no medium or large radius. Do not add one.
- Elevation: there is no shadow scale. Depth is a 1px hairline rule, or a lighter surface. Never a cast shadow, at any level.
- Motion: 150ms, ease-out, opacity and position only. No spring, no bounce, no scale-on-hover.

Components
- Buttons: primary (solid #141414 ink, #F0F0F0 label, square corners, 44px tall) and ghost (transparent, ink label). Two variants only — do not add a third. States: default, hover, focus, disabled, loading.
- Form elements: text input, textarea, select, checkbox, radio, toggle, file upload, search. White surface, 1px #7A7A7A border, 2px radius, 44px tall. Focus thickens the border to 2px ink — no glow, no coloured ring. Label above, helper text below in secondary. Error state swaps the border to #8C2F22.
- List rows, not cards: a row is 16px vertical padding with a 1px #C5C5C5 hairline beneath, running the full measure. Show three states — default, hover, and a struck-through refused state with its reason in secondary text below.
- Tables: header row in label-sm uppercase with a 1px #7A7A7A rule beneath; body rows separated by #C5C5C5 hairlines; every numeric cell in JetBrains Mono with tabular numerals so columns align.
- Modal / dialog: white surface, 1px outline border, square corners, no shadow, with header, body, footer and close.
- Navigation: a single top bar with a wordmark and 3–4 text links. No sidebar, no tab bar chrome.
- Tags and labels: square-cornered, label-sm uppercase, secondary text on the bone container. Never pill-shaped.
- Avatar: initials only, circular, three sizes.
- Toasts and banners: square, 1px outline, ink text on white. Informational and error only.
- Icons: 1.5px stroke, square terminals, no rounded caps, monochrome ink. Show ~10 representative icons.
- Empty state: a headline, a line of monospaced arithmetic, and one sentence of plain explanation. No illustration, no mascot, no graphic.
- Loading: a hairline progress rule, or plain skeleton blocks in the container tint. No spinners, no shimmer.

Layout
- Single column, 950px maximum content width. Never a dashboard grid.
- Page margin 48px desktop, 16px mobile. Breakpoints at 768px and 1024px.
- Mobile is the primary surface — the product is used at night on a personal phone.

Visual notes:
- Documents, not dashboards. If a screen starts to feel like an analytics panel, return it to a single column.
- Maintain WCAG AA contrast on every text pairing, and never rely on colour alone to convey state — this system is monochrome, so state must be carried by type, rule, strike-through or surface tint.
- The overall feel is a published notice: plain, checkable, quietly certain. Nothing here is trying to persuade the reader, which is exactly why they believe it.

Present the design system as a tidy sticker sheet on a single canvas, grouped by category, with clear section headings.

Use tokens from `docs/DESIGN.md` where applicable for exact colors, type, spacing, and component styling.
```

---

## Prompt 2: The daily shortlist

**Purpose:** The main work surface, and the only screen carrying all three role states at once — cleared, withheld, and stretch. It contains the refusal, which is the entire thesis and the first earnable proof in `docs/PRODUCT.md`.
**Position in journey:** Every session after the first. This is the product.

> The load-bearing decision: withheld roles live **on this screen**, open by default, each with a specific stated disqualifier. Collapsing that section or genericising those reasons turns Saaf back into every other product in the category.

### Prompt — paste this into your AI design tool

```
Design the daily shortlist screen for Saaf — a free daily job shortlist for Indian professionals in their first five years of work, which removes every role the candidate is structurally disqualified from before ranking what remains, and publishes what it refused and why.

Brand identity:
Brand character: refusal-is-the-product — a match score's first job is to refuse, and to publish what it refused and why. Exact, unhedged, quiet.
Tone: Exact, but not clinical. Plain, but not simplified. Certain about method, never about outcome. Matter-of-fact about bad news, never apologetic. Quiet, but not cold.
Visual style: A public notice, not a dashboard. Documents over dashboards; rows separated by hairline rules, never cards floating on gradients. A refused item is DRAWN — struck through with its reason stated — never hidden. Counts are always shown as subtraction, never as a total.
Type pairing: Public Sans for all text (the typeface of civic notices); JetBrains Mono for every number, with tabular numerals.
Color direction: Monochrome on paper. Ground #F0F0F0 (deliberately not white), ink #141414, secondary text #5F5F5F, bone tint #E2E2D7 for the single "stretch" surface, hairline #C5C5C5. One oxide red #8C2F22, reserved exclusively for system errors — never for a gate outcome.
What to avoid: Zero shadows. Zero gradients. No rounded corners beyond 2px on inputs, and no pills. No glassmorphism, no blurred orbs, no Tailwind default green/red/amber. No Inter, Instrument Serif, Outfit or Plus Jakarta Sans. Never write "AI-powered", "top applicant", "perfect match", "dream job", "unlock", "supercharge", "10x", "guaranteed", or "easy to use".

Screen purpose:
This is the product. Once a day it shows the candidate every role that cleared their gates, ranked, each with the one line explaining its score — and, on the same screen, every role it withheld and the reason for each. The user opens it for about forty minutes on a weeknight and leaves knowing which two or three roles are worth their effort.

Layout (top to bottom):
- Top bar: "Saaf" wordmark left; three text links right — Today, Audit, Profile. One hairline rule beneath. No logo mark, no avatar chrome, no search field.
- Date heading in headline-lg: the day and date, plain.
- The arithmetic line directly beneath, in JetBrains Mono with tabular numerals — three counts separated by middots, showing the funnel narrowing. This is the screen's signature element; give it room and do not decorate it.
- Cleared roles: three list rows. Each row is the role title, company and city on one line in body-lg ink, with the score and its one-line reason beneath in body-sm secondary. A hairline rule beneath each row, running the full measure. No card, no border box, no score badge, no chevron.
- A single Stretch row below the cleared set: the only tinted surface on the screen, bone #E2E2D7, 16px padding, with a small uppercase label above the title naming the gap in years.
- The withheld section, on this same screen and open by default — not a separate page, not behind a modal. A section heading, then four rows where the role title is struck through in secondary text with a 1px line, and the reason sits beneath it in body-sm. These rows must look deliberate and legible, never greyed-out or disabled.
- Footer: one text link to the full public gate audit, above a hairline rule.

Content / copy hints:
- Date heading: "Wednesday, 3 September"
- Arithmetic line: "3,200 indexed · 47 in your function · 3 cleared your experience band"
- Cleared role 1: "Associate Product Manager · Razorpay · Bengaluru" — reason: "72% — go-to-market and stakeholder management match; the job description's three-year floor is your one gap."
- Cleared role 2: "Business Operations Analyst · Groww · Bengaluru" — reason: "68% — analytics and stakeholder work match; no gaps against the stated requirements."
- Stretch label: "STRETCH · 1 YEAR GAP"
- Stretch role: "Growth Marketing Lead · slice · Bengaluru" — reason: "64% — channel mix matches; the posting's three-year floor is one year above you."
- Withheld section heading: "44 roles withheld today"
- Withheld row 1: "Manager, Financial Planning · Meesho · Bengaluru" — reason: "Withheld — asks for a chartered accountant; your profile doesn't carry one. A credential can't be stretched."
- Withheld row 2: "Principal Engineer · Postman · Bengaluru" — reason: "Withheld — asks for 15 years; you have 2."
- Withheld row 3: "Senior Brand Manager · Meesho · Mumbai" — reason: "Withheld — asks for ownership of ₹50L+ in paid spend; your profile shows ₹6L."
- Per-role action, secondary and understated: "Draft documents for this role"
- Per-role defect report, small text link: "This shouldn't be here"
- Footer link: "See the full gate audit"
- If the day is thin, the line beneath the arithmetic reads: "That's a thin day for our coverage, not a verdict on you."

Visual notes:
- Responsive. Design mobile-first at 390px wide, and show the 950px desktop layout beside it. Mobile is the primary surface — this product is used at night on a personal phone because the work laptop is monitored.
- Single column at every breakpoint. Never a two-column grid, never a card deck.
- The withheld rows carry equal typographic weight to the cleared ones — same size, same measure, same rule. Only the strike-through and the secondary ink separate them. They must not read as errors, warnings, or disabled content.
- Maintain WCAG AA contrast on all text, including the struck-through titles. Never rely on colour alone to distinguish cleared from withheld from stretch — the distinction is carried by strike-through, by the bone surface, and by the stated reason.
- Reuse the components from the design system prompt (Prompt 1) — same list rows, same buttons, same tags, same hairlines.

What this screen should feel like:
The user should finish it knowing exactly where their next forty minutes go — and should trust the short list precisely because they can see what was taken out of it and why. Not encouraging, not apologetic. A published notice that happens to be about them.

Use tokens from `docs/DESIGN.md` where applicable for exact colors, type, spacing, and component styling.
```

---

## Prompt 3: The parse-then-confirm profile

**Purpose:** The activation screen. A parsed résumé becomes a confirmed profile, and the confidentiality guarantee is made — to a user who is employed, hiding their search, and professionally sceptical of hiring software.
**Position in journey:** First session, immediately before the first match runs.

> The hard part is stating the guarantee without reassurance-theatre. Meera — persona 4, and the most valuable beta user in `docs/PRODUCT.md` — operates an applicant-tracking system for a living and will read a friendly onboarding wizard as evasion.

### Prompt — paste this into your AI design tool

```
Design the profile confirmation screen for Saaf — a free daily job shortlist for Indian professionals in their first five years of work, which removes every role the candidate is structurally disqualified from before ranking what remains, and publishes what it refused and why.

Brand identity:
Brand character: refusal-is-the-product — a match score's first job is to refuse, and to publish what it refused and why. Exact, unhedged, quiet.
Tone: Exact, but not clinical. Plain, but not simplified. Certain about method, never about outcome. Matter-of-fact about bad news, never apologetic. Quiet, but not cold.
Visual style: A public notice, not a dashboard. Documents over dashboards; rows separated by hairline rules, never cards floating on gradients. A refused item is DRAWN — struck through with its reason stated — never hidden. Counts are always shown as subtraction, never as a total.
Type pairing: Public Sans for all text (the typeface of civic notices); JetBrains Mono for every number, with tabular numerals.
Color direction: Monochrome on paper. Ground #F0F0F0 (deliberately not white), ink #141414, secondary text #5F5F5F, bone tint #E2E2D7 for the single "stretch" surface, hairline #C5C5C5. One oxide red #8C2F22, reserved exclusively for system errors — never for a gate outcome.
What to avoid: Zero shadows. Zero gradients. No rounded corners beyond 2px on inputs, and no pills. No glassmorphism, no blurred orbs, no Tailwind default green/red/amber. No Inter, Instrument Serif, Outfit or Plus Jakarta Sans. Never write "AI-powered", "top applicant", "perfect match", "dream job", "unlock", "supercharge", "10x", "guaranteed", or "easy to use".

Screen purpose:
The candidate has uploaded a résumé. It has been parsed to pre-fill this form and the file has already been deleted. Every field must be confirmed by the candidate before the first match runs, because the gates are only as honest as the profile they run against. This screen is also where the confidentiality guarantee is made — to a user who is employed, hiding their search, and professionally sceptical of hiring software.

Layout (top to bottom):
- Minimal top bar: "Saaf" wordmark only. No navigation links during this step. One hairline rule beneath.
- Heading in headline-lg, with a single line of body-md secondary text beneath stating that nothing runs until every field is checked, and that the uploaded file is already deleted.
- Section 1 — the parsed fields, as a vertical stack of labelled inputs on the ground colour: current title, employer, years of experience, function, city, work authorisation. Each field is pre-filled and editable, with a small uppercase label above it and a quiet secondary note marking it as read from the résumé so the user knows what they are checking rather than typing.
- Section 2 — the function-typed gate, separated by a rule and its own heading. This section's fields CHANGE depending on the function selected above, and the screen should show that plainly. Design the finance variant: a credential selector with four square options, and one line of explanation beneath it.
- Section 3 — the confidentiality block, on the bone container surface #E2E2D7 with 16px padding, containing three short factual statements as a plain list. No lock icons, no shield graphics, no badges, no reassuring illustration.
- Footer actions: one primary button and one ghost button, left-aligned, above a hairline rule.

Content / copy hints:
- Heading: "Confirm what we read from your résumé"
- Sub-heading: "Nothing runs until you've checked every field. Your file was deleted the moment parsing finished."
- Field labels, uppercase label-sm: "CURRENT TITLE" · "EMPLOYER" · "YEARS OF EXPERIENCE" · "FUNCTION" · "CITY" · "WORK AUTHORISATION"
- Provenance note beside pre-filled fields: "read from your résumé"
- Section 2 heading: "What gets you filtered in your function"
- Section 2 explanation: "Finance roles gate on a credential, not on years. Engineering gates on an experience band, marketing on budget scale, consulting on institute. We check the one that actually applies to you."
- Credential options: "CA" · "CFA" · "CS" · "None of these"
- Credential note beneath: "A credential you don't hold is never stretched, because it can't be."
- Confidentiality block heading: "What happens to this"
- Confidentiality line 1: "Your résumé file is already deleted. Only the fields above are stored."
- Confidentiality line 2: "No employer is contacted. Nothing here is public, and nothing is sold."
- Confidentiality line 3: "Delete your account in one click. No email required."
- Primary button: "Confirm and run my first match"
- Ghost button: "Save and finish later"
- Error state example, on an empty required field: "We need this to run the experience gate."

Visual notes:
- Responsive. Design mobile-first at 390px wide, and show the 950px desktop layout beside it. Mobile is the primary surface — this product is used at night on a personal phone because the work laptop is monitored.
- Single column at every breakpoint. Inputs are full-measure on mobile and capped at 420px on desktop.
- Input fields are the only rounded elements on the screen, at 2px. Everything else is square.
- The confidentiality block reads as stated fact, not as reassurance. No iconography, no colour, no emphasis beyond the surface tint that separates it.
- Maintain WCAG AA contrast on all text, including the provenance notes and helper text. The oxide red appears only on genuine validation errors, never anywhere else on this screen.
- Reuse the components from the design system prompt (Prompt 1) — same inputs, same buttons, same labels, same hairlines.

What this screen should feel like:
Like reading a form you actually read, rather than clicking through a wizard. The user is employed, hiding this search from their manager, and has been let down by hiring software before — one of them operates an applicant-tracking system for a living. Earn them with plainness and specificity, never with warmth or reassurance.

Use tokens from `docs/DESIGN.md` where applicable for exact colors, type, spacing, and component styling.
```

---

## Sources

- Product context: [`docs/PRODUCT.md`](../../docs/PRODUCT.md)
- Brand strategy: [`1-Product-Identity.md`](1-Product-Identity.md)
- Design tokens: [`docs/DESIGN.md`](../../docs/DESIGN.md), with its live mirror [`docs/DESIGN.html`](../../docs/DESIGN.html)

_Screens deliberately not covered here: the **public gate audit** page — the contrarian belief shipped as a feature, in nutrition-label form, which no competitor has. It sits closer to a marketing artifact than a product screen, so it belongs in Design Step 6 (`studio-design-landing-page`). Revisit it there._
