import styles from './row.module.css'

type Outcome = 'cleared' | 'withheld' | 'stretch'

type Props = {
  outcome: Outcome
  title: string
  company: string
  city?: string
  /** The one line explaining the score, or the refusal. Retrieved, never generated. */
  reason: string
  score?: number
  gapYears?: number
  applyUrl?: string
  onReport?: () => void
}

/**
 * The three role states are the product.
 *
 * A withheld role is DRAWN, not hidden: same size, same measure, same rule as a
 * cleared row, with the title struck through and the reason stated. It must not
 * read as an error, a warning, or disabled content — a refusal is a correct
 * answer, and colouring it as a failure would reframe honesty as rejection.
 */
export function RoleRow({
  outcome, title, company, city, reason, score, gapYears, applyUrl, onReport,
}: Props) {
  const heading = (
    <span className={outcome === 'withheld' ? styles.titleWithheld : styles.title}>
      {title} · {company}
      {city ? ` · ${city}` : ''}
    </span>
  )

  return (
    <div className={outcome === 'stretch' ? styles.rowStretch : styles.row}>
      {outcome === 'stretch' && gapYears !== undefined ? (
        <span className={styles.tag}>
          Stretch · {gapYears} year{gapYears === 1 ? '' : 's'} gap
        </span>
      ) : null}

      {applyUrl && outcome !== 'withheld' ? (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer">{heading}</a>
      ) : (
        heading
      )}

      <span className={styles.reason}>
        {score !== undefined ? `${score}% — ` : ''}
        {reason}
      </span>

      {outcome === 'withheld' && onReport ? (
        <button type="button" className={styles.report} onClick={onReport}>
          This shouldn&apos;t be here
        </button>
      ) : null}
    </div>
  )
}
