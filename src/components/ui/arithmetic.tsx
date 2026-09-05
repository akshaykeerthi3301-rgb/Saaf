import styles from './arithmetic.module.css'

type Props = {
  indexed: number
  /** Roles matching the candidate's preferred role. */
  matched: number
  /** Of those, how many score 75 or above. */
  strong: number
  /** Set when the last ingest failed, so the reader knows the data is stale. */
  asOf?: string
  /** The candidate's own search text, shown back in the zero-match state. */
  searchTerm?: string
}

/**
 * The signature figure.
 *
 * It used to show a SUBTRACTION — indexed, then withheld — because refusal was
 * the product. Under ranking nothing is withheld, so the honest figure is a
 * narrowing: what we hold, what matched the role you asked for, and how much of
 * that is a strong fit.
 *
 * Both thin states still attribute the shortfall to our coverage. A short list
 * must never read as a verdict on the candidate — that principle survives the
 * pivot intact.
 */
export function Arithmetic({ indexed, matched, strong, asOf, searchTerm }: Props) {
  const fmt = (n: number) => n.toLocaleString('en-IN')
  return (
    <div>
      <p className={styles.figure}>
        {fmt(indexed)} indexed{asOf ? ` on ${asOf}` : ' today'} · {fmt(matched)} matching
        your search · {fmt(strong)} a strong fit
      </p>
      {matched === 0 ? (
        <p className={styles.note}>
          {searchTerm
            ? `We don't have roles matching "${searchTerm}" in the registry yet — try a broader title.`
            : "We don't have roles matching that search in the registry yet — try a broader title."}
        </p>
      ) : strong === 0 ? (
        <p className={styles.note}>
          Nothing scored highly today. That&apos;s a thin day for our coverage, not a verdict on you.
        </p>
      ) : null}
    </div>
  )
}
