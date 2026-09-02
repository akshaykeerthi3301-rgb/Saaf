import styles from './arithmetic.module.css'

type Props = {
  indexed: number
  inFunction: number
  cleared: number
  withheld?: number
  /** Set when the last ingest failed, so the reader knows the data is stale. */
  asOf?: string
}

/**
 * The brand's signature figure. It always shows the SUBTRACTION, never only a
 * total — the falling number is the argument.
 *
 * On a thin day this carries the coverage attribution, because a short list must
 * never read as a verdict on the candidate.
 */
export function Arithmetic({ indexed, inFunction, cleared, withheld, asOf }: Props) {
  const fmt = (n: number) => n.toLocaleString('en-IN')
  return (
    <div>
      <p className={styles.figure}>
        {fmt(indexed)} indexed{asOf ? ` on ${asOf}` : ' today'} · {fmt(inFunction)} in your
        function · {fmt(cleared)} cleared your experience band
        {withheld !== undefined ? ` · ${fmt(withheld)} withheld` : ''}
      </p>
      {cleared === 0 ? (
        <p className={styles.note}>
          That&apos;s a thin day for our coverage, not a verdict on you.
        </p>
      ) : null}
    </div>
  )
}
