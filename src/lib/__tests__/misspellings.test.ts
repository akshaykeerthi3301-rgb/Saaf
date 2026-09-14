import { describe, it, expect } from 'vitest'
import nspell from 'nspell'
import dictionary from 'dictionary-en-gb'
import { MISSPELLINGS, ACTION_VERBS, WEAK_OPENER } from '../ats-check'

/**
 * Guard the misspelling list against itself.
 *
 * ⚠️ THE BUG THIS EXISTS TO PREVENT ALREADY SHIPPED. `analyse: 'analyse'` was a
 * live entry: the British spelling registered as a misspelling of itself, so a
 * résumé using it was told «"analyse" (should be "analyse")» and lost 18 points
 * of its content score. British spelling is standard across India — the only
 * market this product serves — so the check was penalising correct English for
 * effectively every user who wrote it.
 *
 * ⚠️ THE DICTIONARY IS A devDependency AND MUST STAY ONE. `ats-check.ts` runs in
 * the browser as well as on the server (the report re-scores client-side after
 * each accepted fix), so importing 576 KB of dictionary there would ship it to
 * every visitor. Here it costs nothing at runtime and turns a list that was
 * previously trusted into one that is checked.
 */
describe('the common-misspelling list', () => {
  // dictionary-en-gb resolves its files at import time and default-exports the
  // {aff, dic} pair directly — it is not a factory.
  const sp = nspell(dictionary)

  it('never flags a word that is correct British English', () => {
    const wrong = Object.keys(MISSPELLINGS).filter((w) => sp.correct(w))
    expect(wrong, `these are real en-GB words and must not be flagged: ${wrong.join(', ')}`).toEqual([])
  })

  it('only ever corrects to a real British English word', () => {
    const bad = Object.values(MISSPELLINGS).filter((w) => !sp.correct(w))
    expect(bad, `these corrections are not en-GB words: ${bad.join(', ')}`).toEqual([])
  })

  it('never suggests a correction identical to the misspelling', () => {
    const same = Object.entries(MISSPELLINGS).filter(([k, v]) => k === v)
    expect(same, `self-correcting entries produce nonsense advice: ${same.map(([k]) => k).join(', ')}`).toEqual([])
  })
})

/**
 * The same principle applied to the two opener lists.
 *
 * ⚠️ 'handled' WAS IN BOTH. A bullet opening "Handled production incidents and
 * release coordination" counted toward action-verb coverage AND raised
 * `weak-openers` — two findings on one screen disagreeing about one line, with
 * the candidate left to work out which we meant. Word lists drift into each
 * other silently; only a test notices.
 */
describe('the opener lists', () => {
  it('never counts the same verb as both strong and weak', () => {
    const both = [...ACTION_VERBS].filter((v) => WEAK_OPENER.test(v))
    expect(both, `in ACTION_VERBS and matched by WEAK_OPENER: ${both.join(', ')}`).toEqual([])
  })
})
