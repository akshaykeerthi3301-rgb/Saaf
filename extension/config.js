/**
 * Public configuration. Both values below are PUBLIC BY DESIGN and appear in
 * every browser that loads the Jobinko web app — the anon key is the key RLS is
 * built to be safe with. The service-role key is not here and must never be:
 * it bypasses RLS entirely, and an extension is the most copyable place a
 * secret could possibly sit.
 */
const SAAF = {
  site: 'https://jobinko.in',
  supabaseUrl: 'https://adofdvkhdgifvmbuolcj.supabase.co',
  supabaseAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkb2ZkdmtoZGdpZnZtYnVvbGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzAxNDksImV4cCI6MjEwMzk0NjE0OX0.pB9rWUDI1AbGiypI-vMHadJ4OevN5kqMbfj6kheP3Uc',
}
if (typeof globalThis !== 'undefined') globalThis.SAAF = SAAF
