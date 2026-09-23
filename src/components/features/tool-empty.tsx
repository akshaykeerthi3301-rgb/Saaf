import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/** The Co-Pilot tools' empty state: says what is missing and where to get it. */
export function ToolEmpty({
  icon: Icon, title, body, href, cta,
}: { icon: LucideIcon; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6">
      <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-base font-semibold text-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4">
        {cta} →
      </Link>
    </div>
  )
}
