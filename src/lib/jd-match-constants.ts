/**
 * Input bounds for the paste-a-JD surface, shared by three callers that must
 * not disagree: the Server Action's Zod schema, the client form's pre-flight
 * check, and the scorer's own guard.
 *
 * Its own plain module for TWO reasons, both load-bearing:
 *
 *  1. A `use server` file may only export async functions — a plain constant
 *     export is rejected outright once Next enforces it, which it does since
 *     next.config.ts configures serverActions. Same reason
 *     src/lib/parse/constants.ts exists.
 *  2. THE FORM IS A CLIENT COMPONENT. Importing these from src/lib/jd-match.ts
 *     would pull the extractor, the scorer and the LLM client — including its
 *     `process.env.*_API_KEY` reads — into the browser bundle to fetch four
 *     numbers. Next would blank the keys, so nothing leaks, but shipping the
 *     scoring engine to every visitor to read a character limit is not a
 *     trade worth making.
 *
 * The maxima are a COST CEILING, not a formatting rule. This runs on a public,
 * unauthenticated surface that can call a paid model, so an unbounded paste is
 * somebody else's bill. 20,000 characters is roughly three times the longest
 * real posting in the live index (95th percentile 6,805) and comfortably past
 * any résumé; src/lib/parse/llm.ts truncates at 24,000 before it sends
 * anything, so nothing above this reaches a provider in any case.
 */
export const MIN_JD_CHARS = 120
export const MIN_RESUME_CHARS = 120
export const MAX_JD_CHARS = 20_000
export const MAX_RESUME_CHARS = 20_000
