import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Two variants only. A third invites hierarchy this product does not have. */
  variant?: 'primary' | 'ghost'
}

const VARIANTS = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:-translate-y-0.5',
  ghost:
    'border border-border bg-card text-primary hover:border-foreground/30 hover:bg-secondary/60',
} as const

/**
 * The one button. Square corners and flat ink were the old system; this is the
 * shadcn/Tailwind one, so the shape comes from --radius and the lift from the
 * same shadow the cards use.
 *
 * Full width is not the default — pass `className="w-full"` where the screen
 * wants it, which is most of onboarding and none of the app shell.
 */
export function Button({ variant = 'primary', className, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold',
        'transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
