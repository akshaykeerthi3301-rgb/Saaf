import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { readAccountSummary } from '@/lib/services/workspace'
import { AccountProvider } from '@/components/features/account-context'

/**
 * The signed-in workspace. Reads the account once for the shell's user card.
 *
 * ⚠️ NOT AN AUTH GATE. Every page below still calls getUser() and redirects
 * itself — a layout does not re-run on every navigation, and a page is its own
 * entry point. A signed-out render here simply provides no account.
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return children

  const account = await readAccountSummary(user.id, user.email ?? '')
  return <AccountProvider value={account}>{children}</AccountProvider>
}
