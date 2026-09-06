import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Marks a value the parser filled in, so the user knows what to check. */
  provenance?: string
  error?: string
  helper?: string
}

export function Input({ label, provenance, error, helper, id, className, ...rest }: Props) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-primary" htmlFor={inputId}>
        {label}
        {provenance ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{provenance}</span>
        ) : null}
      </label>
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-card px-4 py-3.5 text-sm text-primary outline-none transition-colors',
          'placeholder:text-muted-foreground focus:ring-2',
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
            : 'border-input hover:border-foreground/30 focus:border-accent focus:ring-accent/10',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helper ? `${inputId}-msg` : undefined}
        {...rest}
      />
      {error || helper ? (
        <p
          id={`${inputId}-msg`}
          className={cn(
            'mt-2 text-xs leading-5',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error ?? helper}
        </p>
      ) : null}
    </div>
  )
}
