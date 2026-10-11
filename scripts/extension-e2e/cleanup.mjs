import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: rows } = await db.from('applications').select('id, apply_url, status').like('apply_url', 'http://localhost:4100/%')
console.log('test rows found:', rows?.length ?? 0, JSON.stringify(rows?.map((r) => r.status)))
if (rows?.length) {
  const { error } = await db.from('applications').delete().in('id', rows.map((r) => r.id))
  console.log('deleted:', error ? 'ERROR ' + error.message : rows.length)
}
const { count } = await db.from('applications').select('id', { count: 'exact', head: true }).like('apply_url', 'http://localhost:4100/%')
console.log('test rows remaining:', count)

const { data: res } = await db.from('resume_documents').select('id, label, is_primary').like('label', '%Acme Robotics%')
console.log('test résumés found:', res?.length ?? 0, JSON.stringify(res?.map((r) => [r.label, r.is_primary])))
if (res?.length) { const { error } = await db.from('resume_documents').delete().in('id', res.filter((r) => !r.is_primary).map((r) => r.id)); console.log('résumés deleted:', error ? 'ERROR ' + error.message : res.length) }
