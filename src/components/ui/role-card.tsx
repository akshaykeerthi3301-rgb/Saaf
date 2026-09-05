import styles from './row.module.css'
import { ReportScore } from '@/components/features/report-score'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import type { ScoreBreakdown } from '@/match/score'
import type { EvidenceItem } from './row'

type Props = {
  /** gate_results.id — what a score report is filed against. */
  gateResultId: string
  title: string
  company: string
  city?: string
  score: number
  breakdown?: ScoreBreakdown | null
  reason: string
  applyUrl?: string
  isNew?: boolean
  requirements?: EvidenceItem[]
  profileCity?: string
}

/**
 * A ranked role.
 *
 * Replaces the three-outcome row. Nothing is withheld now, so the card's job
 * is no longer to deliver a verdict — it is to show a score and let the
 * candidate check the arithmetic behind it. The breakdown is not decoration:
 * the previous score was 70 + posting-verbosity and never read the candidate,
 * and a bare number would hide exactly that class of defect again.
 */
export function RoleCard({
  gateResultId, title, company, city, score, breakdown, reason, applyUrl,
  isNew, requirements, profileCity,
}: Props) {
  const band = score >= 75 ? 'Strong match' : score >= 50 ? 'Worth a look' : 'Weak match'

  const heading = (
    <span className={styles.title}>
      {title} · {company}
      {city ? ` · ${city}` : ''}
    </span>
  )

  return (
    <div className={styles.row}>
      {isNew ? <span className={styles.tag}>New</span> : null}
      <span className={styles.tag}>{band}</span>
      {breakdown?.confidence === 'low' ? (
        <span className={styles.tag}>Check the experience bar</span>
      ) : null}
      {/* Stated on every card rather than discovered after the click. No board
          in the registry publishes pay, so this is true of all of them. */}
      <span className={styles.tag}>Salary not stated</span>

      {applyUrl ? (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer">{heading}</a>
      ) : (
        heading
      )}

      <span className={styles.reason}>
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</strong> — {reason}
      </span>

      {breakdown?.confidence === 'low' ? (
        <span className={styles.reason}>
          This posting mentions an experience requirement we couldn&apos;t read reliably,
          so the experience part of this score is a guess. Check it before you apply.
        </span>
      ) : null}

      {/* data-breakdown is how BreakdownEngaged tells this disclosure from the
          evidence one below it — `toggle` carries no other signal. */}
      {breakdown ? (
        <details className={styles.evidence} data-breakdown="score">
          <summary className={styles.evidenceToggle}>How this score is built</summary>
          {breakdown.components.map((c) => (
            <div key={c.key} className={styles.evidenceItem}>
              <span className={styles.evidenceKind}>
                {c.label} · {c.points}/{c.max}
              </span>
              <span className={styles.evidenceCompare}>{c.note}</span>
            </div>
          ))}
        </details>
      ) : null}

      {requirements && requirements.length > 0 ? (
        <details className={styles.evidence}>
          <summary className={styles.evidenceToggle}>
            What we read from this posting ({requirements.length})
          </summary>
          {requirements.map((r, i) => (
            <div key={i} className={styles.evidenceItem}>
              <span className={styles.evidenceKind}>
                {r.kind}
                {r.confidence < CONFIDENCE_THRESHOLD ? ' · read with low confidence' : ''}
              </span>
              {r.kind === 'location' && profileCity ? (
                <span className={styles.evidenceCompare}>Your city on file: {profileCity}</span>
              ) : null}
              <blockquote className={styles.evidenceQuote}>{r.sourceQuote}</blockquote>
            </div>
          ))}
        </details>
      ) : null}

      <ReportScore gateResultId={gateResultId} />
    </div>
  )
}
