'use client'

import Link from 'next/link'
import { useAccount } from '@/components/features/account-context'

const STATUS = { active: 'Actively looking', open: 'Open to offers', closed: 'Not looking' } as const

/** Who is signed in, at the top of the feed's sidebar — a name, a status, a link to the profile. */
export function ProfileChip() {
  const account = useAccount()
  if (!account) return null
  return (
    <Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-foreground/30">
      <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">{account.initials}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-primary">{account.name ?? 'Your profile'}</span>
        <span className="block truncate text-xs text-muted-foreground">{STATUS[account.status] ?? ''}</span>
      </span>
    </Link>
  )
}
