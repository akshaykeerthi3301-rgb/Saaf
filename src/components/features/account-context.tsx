'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { AccountSummary } from '@/lib/services/workspace'

/**
 * Who is signed in, for the shell's user card. Read once by
 * src/app/(app)/layout.tsx on the server and handed down, so the eleven pages
 * that render the shell do not each re-read it.
 */
const AccountContext = createContext<AccountSummary | null>(null)

export function AccountProvider({ value, children }: { value: AccountSummary; children: ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountSummary | null {
  return useContext(AccountContext)
}
