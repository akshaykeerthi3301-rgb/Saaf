import type { ResumeSections } from '@/lib/parse/sections'
import type { BulletChange } from '@/lib/resume-rewrite'

/**
 * The rewrite treats jobs and projects as one list of entries. The drawer's step 2 lets a person tailor one and leave the
 * other, so after the rewrite whichever was NOT ticked is put back exactly as it was, and the changes reported for it are
 * dropped — a project the person left alone must not appear in "see what's changed".
 *
 * Entries are matched by position: the rewrite returns the same entries in the same order (rule 6 of its prompt, and the
 * count is verified before a rewrite is kept).
 */
export function restoreUnselected(
  rewritten: ResumeSections,
  changes: BulletChange[],
  original: ResumeSections,
  keep: { experience: boolean; projects: boolean },
): { sections: ResumeSections; changes: BulletChange[] } {
  const wanted = (e: { isProject?: boolean } | undefined) => (e?.isProject ? keep.projects : keep.experience)
  return {
    sections: {
      ...rewritten,
      experience: rewritten.experience.map((e, i) => (wanted(original.experience[i]) ? e : (original.experience[i] ?? e))),
    },
    changes: changes.filter((c) => c.entry < 0 || wanted(original.experience[c.entry])),
  }
}
