import type { InputHTMLAttributes } from 'react'
import styles from './input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Marks a value the parser filled in, so the user knows what to check. */
  provenance?: string
  error?: string
  helper?: string
}

export function Input({ label, provenance, error, helper, id, ...rest }: Props) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {provenance ? <span className={styles.provenance}>{provenance}</span> : null}
      </label>
      <input
        id={inputId}
        className={error ? `${styles.input} ${styles.inputError}` : styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helper ? `${inputId}-msg` : undefined}
        {...rest}
      />
      {error || helper ? (
        <p id={`${inputId}-msg`} className={error ? styles.error : styles.helper}>
          {error ?? helper}
        </p>
      ) : null}
    </div>
  )
}
