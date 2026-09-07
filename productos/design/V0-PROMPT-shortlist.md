# v0 prompt — the Saaf shortlist

*Written 2026-09-07. Paste the block below into v0. Everything above the line is
context for whoever is running it; everything below is the prompt itself.*

## Why this prompt is shaped the way it is

The screen it replaces was correct and demoralising. Six sections, each named
after what was wrong with the roles inside it — "Experience is out of range",
"Location is out of range", "Good match, short on experience". A candidate
scrolling their own shortlist read a running commentary on their shortcomings.

The honesty is not the problem and must not be designed away. What has to change
is *where* the reservation sits: on the role, in the insights, not as the
heading a person reads first. Two constraints follow, and v0 must respect both:

1. **Never hide a reservation.** Every card still carries its reason line, its
   capped score and its full breakdown. "Encouraging" means well-ranked and
   well-presented, not vaguer.
2. **Never invent a number.** No profile-strength meters, no "you're a top 5%
   applicant", no application-limit gauges, no fake urgency ("3 people applied
   today"). This product's entire differentiator is that every figure on screen
   can be checked. An invented one is a defect, not decoration.

---

```
Design a job-recommendation screen for Saaf, an India-first job matching product.
The user is a professional in India reviewing roles matched to them. Output a
single responsive React page using Tailwind and shadcn/ui.

DESIGN TOKENS — use these exactly, do not substitute a palette.
  background        oklch(0.975 0.008 240)   pale blue-grey page ground
  card              #FFFFFF                  every raised surface
  primary / ink     oklch(0.22 0.04 250)     headings, solid buttons
  muted-foreground  oklch(0.5 0.025 245)     secondary text
  accent            oklch(0.54 0.12 163)     deep green — THE ONLY chromatic value
  border            oklch(0.89 0.018 235)    every hairline
  radius            0.8rem base; cards 1.12rem (rounded-2xl); pills full
  shadow            shadow-sm on cards only. Nothing else is raised.
  fonts             Public Sans (sans), JetBrains Mono (all numerals, tabular)
  Light mode only. No dark palette. No gradients, no glassmorphism, no colour
  beyond the single green accent.

STRUCTURE — two ranked sections, in this order.

  Section 1 — "In Bengaluru"  (the user's own city; name it explicitly)
    Subtitle: "In the city you gave us, its commute belt, or fully remote."
  Section 2 — "Worth a move"
    Subtitle: "Strong matches on the work itself, in other Indian cities."

  Location is the only thing that separates the two sections, because it is the
  one constraint a candidate cannot negotiate. Both sections are ranked by match
  score, highest first, and look identical otherwise. Section 2 is NOT a reject
  pile and must not be styled as lesser — no dimming, no collapsing by default,
  no smaller cards.

CONTROLS — a single quiet row above both sections, not a heavy toolbar.
  Sort:  Best match | Newest
  Show:  Everything | Clears the stated bar
  Plain text links with an underline on the active one. No dropdowns, no chips
  with borders, no filter drawer.

THE ROLE CARD — the whole design problem is here.
  Left, in reading order:
    · Job title, then "Company · City" beneath it in muted text
    · ONE reason line, plain sentence, e.g. "Clears every requirement stated in
      this posting." or "Asks for 5 years; you have 2 — 3 short."
      This line is the product. It is never truncated and never hidden.
    · A collapsed "Insights (3)" disclosure. Closed by default. Opening it
      reveals the score components as label + value rows and the exact sentence
      quoted from the posting that each requirement was read from.
  Right:
    · The score, 0–100, large, in tabular monospace numerals
    · A short band label under it: Strong match / Good match / Worth a look /
      Long shot
    · Two actions: a primary "Apply" that opens the employer's own site, and a
      quiet secondary "Save"
  A small green dot marks roles first seen in the last 7 days.

TONE AND FEELING — this is the brief.
  The screen should feel like a well-prepared shortlist handed over by someone
  competent who is on your side: calm, ordered, quietly confident. Generous
  whitespace. Strong typographic hierarchy doing the work instead of colour.
  The green accent appears rarely enough that it still means something.

  Do NOT use: red or amber anywhere, warning triangles, progress bars,
  percentage rings, confetti, emoji, gradients, urgency banners, countdowns,
  or badges that shout. A shortfall is stated in a sentence, in ordinary text
  colour, at ordinary weight — never as an alert.

EMPTY AND THIN STATES — write these as first-class, not afterthoughts.
  · No roles in the user's city: say the coverage is ours, never a verdict on
    them, and point at "Worth a move".
  · Filter hides rows: always state how many were hidden and link to unhide.
  · Nothing new this week: say the matches are all still there.

Show the page populated with about six realistic Indian roles across both
sections — a mix of scores from 92 down to 41, real-sounding Indian employers
and cities, and at least one card whose reason line states a shortfall so the
design has to prove it can carry bad news gracefully.
```
