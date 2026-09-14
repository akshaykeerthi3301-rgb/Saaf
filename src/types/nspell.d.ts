/**
 * Ambient shim for `nspell`, which ships no types.
 *
 * ⚠️ devDependency ONLY, and deliberately so. This is used by
 * src/lib/__tests__/misspellings.test.ts to prove the curated misspelling list
 * contains no real British-English word — it is never imported by application
 * code. `ats-check.ts` runs in the browser as well as the server, so an actual
 * dictionary in its import graph would ship 576 KB to every visitor.
 */
declare module 'nspell' {
  type Dictionary = { aff: Uint8Array; dic: Uint8Array }
  type NSpell = {
    correct(word: string): boolean
    suggest(word: string): string[]
  }
  export default function nspell(dictionary: Dictionary): NSpell
}

declare module 'dictionary-en-gb' {
  const dictionary: { aff: Uint8Array; dic: Uint8Array }
  export default dictionary
}
