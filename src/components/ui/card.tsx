import type { ReactNode } from 'react'

/**
 * The surface, and the eyebrow that labels it.
 *
 * ⚠️ THESE TWO STRINGS ARE THE MOST-REPEATED IN THE CODEBASE. Every raised
 * surface in the product is `rounded-2xl border border-border bg-card p-5
 * shadow-sm` typed out again, and every small caps label is
 * `text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`.
 * Repeating them is how a second shadow recipe or a ninth radius arrives —
 * `DESIGN.md:280` warns that drift toward the anti-reference "will start by
 * adding a second" shadow, and :295 forbids a radius outside the scale.
 *
 * `shadow-sm` is the ONLY recipe here. The single `shadow-lg` in the product
 * lives on one landing-page button and stays there.
 */
export function Card({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  /** `accent` marks a confirmed or selected state — never an outcome. */
  tone?: 'default' | 'accent' | 'quiet'
}) {
  const surface =
    tone === 'accent'
      ? 'border-accent/40 bg-card'
      : tone === 'quiet'
        ? 'border-border bg-secondary/50'
        : 'border-border bg-card'
  return (
    <div className={`rounded-2xl border ${surface} p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>
  )
}

export function Eyebrow({
  children,
  tone = 'muted',
  className = '',
}: {
  children: ReactNode
  tone?: 'muted' | 'accent'
  className?: string
}) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
        tone === 'accent' ? 'text-accent' : 'text-muted-foreground'
      } ${className}`}
    >
      {children}
    </span>
  )
}
