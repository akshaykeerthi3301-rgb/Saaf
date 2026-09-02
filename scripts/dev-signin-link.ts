/**
 * Mint a magic link for the TEST user without sending email.
 *
 * Lets the real signed-in flow be exercised before Resend is configured — the
 * app path is identical, only the delivery is skipped.
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: 'test+rohan@saaf.local',
    options: { redirectTo: 'http://localhost:3000/auth/callback' },
  })
  if (error) { console.error(error.message); process.exit(1) }
  console.log(data.properties?.action_link ?? '(no link returned)')
}
main()
