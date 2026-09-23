/**
 * Where "High-precision match" starts. The one definition: the card band
 * (components/ui/fit-ring.tsx), the tracker chip, /today's rail and /copilot's
 * sentence all read it. Until 2026-09-23 each wrote `>= 75` itself and two of
 * them called the result "strong" — while cards label 60–74 "Strong match", so
 * /copilot's "3 are a strong match" sat beside seven cards saying it
 * (docs/QA-AUDIT.md QA-10).
 *
 * Its own module, with no imports, because the tracker board is a client
 * component: reaching it through src/lib/shortlist.ts would pull the scorer
 * into the browser bundle.
 */
export const HIGH_PRECISION_MIN = 75
