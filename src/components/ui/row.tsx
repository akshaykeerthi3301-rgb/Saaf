import styles from './row.module.css'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'

type Outcome = 'cleared' | 'withheld' | 'stretch'

export type EvidenceItem = {
  kind: string
  minYears?: number
  credential?: string
  valueText?: string
  /** The literal sentence from the posting. Rendered as plain text — never
   *  dangerouslySetInnerHTML — since it's untrusted third-party content. */
  sourceQuote: string
  confidence: number
}

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
  isNew?: boolean
  /** Every requirement extracted for this role, gated or not — a founder or
   *  candidate debugging a wrong verdict needs to see what was read, not just
   *  what fired. */
  requirements?: EvidenceItem[]
  refusedOn?: string | null
  /** The candidate's own city on file, shown next to a location requirement
   *  so a mismatch is checkable at a glance. */
  profileCity?: string
  /** The posting mentions an experience requirement we could not read
   *  confidently. Never silently cleared — see roles.unread_experience_mention. */
  unverified?: boolean
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
  isNew, requirements, refusedOn, profileCity, unverified,
}: Props) {
  const heading = (
    <span className={outcome === 'withheld' ? styles.titleWithheld : styles.title}>
      {title} · {company}
      {city ? ` · ${city}` : ''}
    </span>
  )

  return (
    <div className={outcome === 'stretch' ? styles.rowStretch : styles.row}>
      {isNew ? <span className={styles.tag}>New</span> : null}
      {unverified ? <span className={styles.tag}>Check the experience bar</span> : null}
      {/* Stated on every row rather than discovered after the click. No ATS
          board in the registry publishes pay, so this is true of all of them —
          and finding out only on the employer's site is the whole complaint. */}
      {outcome !== 'withheld' ? <span className={styles.tag}>Salary not stated</span> : null}
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

      {/* Stated, not hidden, and never coloured as an error — an unreadable
          posting is our limitation, not a verdict on the candidate. */}
      {unverified ? (
        <span className={styles.reason}>
          This posting mentions an experience requirement we couldn&apos;t read reliably.
          Check it against the description before you spend the forty minutes.
        </span>
      ) : null}

      {requirements && requirements.length > 0 ? (
        <details className={styles.evidence}>
          <summary className={styles.evidenceToggle}>Evidence ({requirements.length})</summary>
          {requirements.map((r, i) => (
            <div key={i} className={styles.evidenceItem}>
              <span className={styles.evidenceKind}>
                {r.kind}
                {r.kind === refusedOn ? ' — this is why' : ''}
                {r.confidence < CONFIDENCE_THRESHOLD ? ' · below the gating threshold, ignored' : ''}
              </span>
              {r.kind === 'location' && profileCity ? (
                <span className={styles.evidenceCompare}>Your city on file: {profileCity}</span>
              ) : null}
              <blockquote className={styles.evidenceQuote}>{r.sourceQuote}</blockquote>
            </div>
          ))}
        </details>
      ) : null}

      {outcome === 'withheld' && onReport ? (
        <button type="button" className={styles.report} onClick={onReport}>
          This shouldn&apos;t be here
        </button>
      ) : null}
    </div>
  )
}
