/**
 * Probe candidate company slugs against the six ATS providers and keep the ones
 * that are live and carry India roles.
 *
 * The registry is the moat, so it is built empirically rather than guessed at:
 * a slug either returns roles or it does not. Razorpay was in the 2026-09-02
 * probe and 404s a day later, which is exactly why this is a script and
 * boards.last_error exists.
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { ADAPTERS } from '../ingest/providers'
import { USER_AGENT } from '../ingest/providers/types'
import { resolveInIndia } from '../src/gates/extract'

const CANDIDATES = [
  'razorpay','postman','slice','groww','meesho','sarvam','atlan','zetwerk','cred','swiggy',
  'zomato','dream11','sharechat','unacademy','phonepe','paytm','flipkart','myntra','nykaa',
  'lenskart','urbancompany','zepto','blinkit','licious','mamaearth','boat','cultfit','curefit',
  'khatabook','jupiter','navi','acko','godigit','rupeek','moneyview','kreditbee','indmoney',
  'smallcase','upstox','angelone','dhan','browserstack','freshworks','zoho','chargebee',
  'clevertap','whatfix','mindtickle','darwinbox','innovaccer','icertis','druva','netradyne',
  'hasura','rippling','juspay','setu','decentro','signzy','perfios','m2p','yubi','leadsquared',
  'exotel','knowlarity','haptik','yellowai','gupshup','kaleyra','netcore','moengage','webengage',
  'apnaco','apna','jodo','classplus','physicswallah','vedantu','emeritus','simplilearn','scaler',
  'newtonschool','masaischool','turing','deel','hackerrank','hackerearth','springworks','plum',
  'onsurity','pazcare','nium','open','fampay','stashfin','lendingkart','indifi','flexiloans',
]

const UA = { 'User-Agent': USER_AGENT }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Found = { provider: string; token: string; company_name: string; roles: number; india: number }

async function probe(provider: string, token: string): Promise<Found | null> {
  const a = ADAPTERS.find((x) => x.provider === provider)!
  try {
    const res = await fetch(a.url(token), { headers: UA, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('json')) return null
    const roles = a.parse(await res.json(), token)
    if (roles.length === 0) return null
    const india = roles.filter((r) => resolveInIndia(r.locationRaw)).length
    if (india === 0) return null
    return {
      provider, token,
      company_name: token.charAt(0).toUpperCase() + token.slice(1),
      roles: roles.length, india,
    }
  } catch { return null }
}

async function main() {
  const found: Found[] = []
  const order = ['greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'smartrecruiters']

  for (const token of CANDIDATES) {
    for (const provider of order) {
      const hit = await probe(provider, token)
      await sleep(120) // be a good citizen
      if (hit) {
        found.push(hit)
        console.log(`  ✓ ${hit.provider.padEnd(16)} ${token.padEnd(16)} ${String(hit.india).padStart(3)} India / ${hit.roles}`)
        break // one provider per company is enough
      }
    }
  }

  found.sort((a, b) => b.india - a.india)
  const prev = existsSync('registry/boards.json')
    ? (JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Found[])
    : []
  const merged = [...new Map([...prev, ...found].map((b) => [`${b.provider}:${b.token}`, b])).values()]

  writeFileSync('registry/boards.json', JSON.stringify(merged, null, 2))
  console.log(`\n  ${found.length} live boards · ${found.reduce((n, f) => n + f.india, 0)} India roles`)
  console.log(`  registry/boards.json now holds ${merged.length} boards`)
}
main()
