import styles from './arithmetic.module.css'

type Props = {
  indexed: number
  inFunction: number
  cleared: number
  withheld?: number
  /** Set when the last ingest failed, so the reader knows the data is stale. */
  asOf?: string
  /** The candidate's own preferred-role search text — shown back in the
   *  zero-match empty state so the copy is concrete, not generic. */
  searchTerm?: string
}

/**
 * The brand's signature figure. It always shows the SUBTRACTION, never only a
 * total — the falling number is the argument.
 *
 * On a thin day this carries the coverage attribution, because a short list must
 * never read as a verdict on the candidate. Matching moved from a fixed
 * function bucket to free-text search (see evaluate-user.ts), which introduces
 * a genuinely new failure mode distinct from "matched but none cleared": zero
 * roles matching the search text at all. Both are registry-coverage gaps, never
 * something to attribute to the candidate.
 */
export function Arithmetic({ indexed, inFunction, cleared, withheld, asOf, searchTerm }: Props) {
  const fmt = (n: number) => n.toLocaleString('en-IN')
  return (
    <div>
      <p className={styles.figure}>
        {fmt(indexed)} indexed{asOf ? ` on ${asOf}` : ' today'} · {fmt(inFunction)} matching
        your search · {fmt(cleared)} cleared your experience band
        {withheld !== undefined ? ` · ${fmt(withheld)} withheld` : ''}
      </p>
      {inFunction === 0 ? (
        <p className={styles.note}>
          {searchTerm
            ? `We don't have roles matching "${searchTerm}" in the registry yet — try a broader term.`
            : "We don't have roles matching that search in the registry yet — try a broader term."}
        </p>
      ) : cleared === 0 ? (
        <p className={styles.note}>
          That&apos;s a thin day for our coverage, not a verdict on you.
        </p>
      ) : null}
    </div>
  )
}
