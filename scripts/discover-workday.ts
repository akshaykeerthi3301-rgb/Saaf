/**
 * Find Workday career sites for companies that hire into India.
 *
 * The sibling of discover-boards.ts, and harder for one reason: a Workday board
 * is addressed by TWO unknowns, the host (nvidia.wd5.myworkdayjobs.com) and the
 * site (NVIDIAExternalCareerSite), and neither is derivable from the other or
 * from the company name. So this brute-forces a small grid per tenant and stops
 * at the first hit — a wrong site 404s cleanly, which is what makes that cheap.
 *
 * Prints; it does not write. registry/boards.json stays a hand-curated file,
 * because the registry is the moat and a probe that guessed wrong would put a
 * stranger's company in it.
 */
import { ADAPTERS } from '../ingest/providers/index'
import { resolveInIndia } from '../src/gates/extract'

const WD_HOSTS = ['wd1', 'wd2', 'wd3', 'wd5', 'wd10', 'wd12', 'wd101', 'wd103']

/** Site names, commonest first. Real ones seen in the wild. */
const SITES = (tenant: string) => {
  const T = tenant.toUpperCase()
  const C = tenant.charAt(0).toUpperCase() + tenant.slice(1)
  return [
    'External', 'Careers', 'careers', 'External_Career_Site', 'ExternalCareers',
    `${T}ExternalCareerSite`, `${C}Careers`, `${C}_Careers`, 'jobs',
    'external_experienced', 'Professional_Careers', 'Global_Careers',
  ]
}

const CANDIDATES: [string, string][] = [
  ['nvidia', 'NVIDIA'], ['adobe', 'Adobe'], ['salesforce', 'Salesforce'],
  ['cisco', 'Cisco'], ['dell', 'Dell'], ['vmware', 'VMware'],
  ['intuit', 'Intuit'], ['servicenow', 'ServiceNow'], ['autodesk', 'Autodesk'],
  ['mastercard', 'Mastercard'], ['visa', 'Visa'], ['paypal', 'PayPal'],
  ['expedia', 'Expedia'], ['thomsonreuters', 'Thomson Reuters'],
  ['spglobal', 'S&P Global'], ['moodys', "Moody's"], ['kyndryl', 'Kyndryl'],
  ['dxctechnology', 'DXC'], ['hsbc', 'HSBC'], ['barclays', 'Barclays'],
  ['db', 'Deutsche Bank'], ['ubs', 'UBS'], ['wellsfargo', 'Wells Fargo'],
  ['philips', 'Philips'], ['siemens', 'Siemens'], ['honeywell', 'Honeywell'],
  ['schneiderelectric', 'Schneider Electric'], ['abb', 'ABB'],
  ['unilever', 'Unilever'], ['pepsico', 'PepsiCo'], ['maersk', 'Maersk'],
]

const wd = ADAPTERS.find((a) => a.provider === 'workday')!

async function alive(host: string, tenant: string, site: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch { return false }
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(Array.from({ length: n }, async () => {
    for (let it = queue.shift(); it !== undefined; it = queue.shift()) await fn(it)
  }))
}

const found: { token: string; company: string; india: number }[] = []

async function main() {
await pool(CANDIDATES, 4, async ([tenant, company]) => {
  for (const wdn of WD_HOSTS) {
    const host = `${tenant}.${wdn}.myworkdayjobs.com`
    for (const site of SITES(tenant)) {
      if (!(await alive(host, tenant, site))) continue
      const token = `${host}/${site}`
      try {
        const roles = await wd.fetchAll!(token)
        const india = roles.filter((r) => resolveInIndia(r.locationRaw)).length
        if (india > 0) {
          found.push({ token, company, india })
          console.log(`  ✓ ${company.padEnd(20)} ${String(india).padStart(4)} India · ${token}`)
        }
      } catch { /* board reachable but unreadable — skip */ }
      return
    }
  }
})

found.sort((a, b) => b.india - a.india)
console.log(`\n  ${found.length} Workday boards · ${found.reduce((n, f) => n + f.india, 0)} India roles`)
console.log('\n  registry entries:')
console.log(JSON.stringify(found.map((f) => ({
  provider: 'workday', token: f.token, company_name: f.company,
})), null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
