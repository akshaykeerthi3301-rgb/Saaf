import { describe, it, expect, afterEach } from 'vitest'
import { adapterFor } from '../providers'
import { indiaFacetId, parseOracle } from '../providers/oraclehcm'

const TOKEN = 'jpmc.fa.oraclecloud.com/CX_1001'
const list = {
  items: [{
    TotalJobsCount: 1,
    locationsFacet: [{ Name: 'United States', Id: 1, TotalCount: 5 }, { Name: 'India', Id: 300000000289360, TotalCount: 307 }, { Name: 'Mumbai, Maharashtra, India', Id: 9, TotalCount: 131 }],
    requisitionList: [{ Id: '210707244', Title: ' Quant Analytics Associate ', PostedDate: '2026-10-13', PrimaryLocation: 'Mumbai, Maharashtra, India', WorkplaceType: 'Hybrid' }, { Title: 'no id' }],
  }],
}

describe('oracle hcm career sites', () => {
  afterEach(() => { delete process.env.CAREER_SITES })

  it('finds the country-level India facet, not the city rows under it', () => {
    expect(indiaFacetId(list)).toBe('300000000289360')
    expect(indiaFacetId({ items: [{ locationsFacet: [{ Name: 'Germany', Id: 2 }] }] })).toBeNull()
  })

  it('turns requisitions into roles, with the employer-hosted apply link', () => {
    const roles = parseOracle(list, TOKEN)
    expect(roles).toHaveLength(1)
    expect(roles[0]).toMatchObject({
      externalId: '210707244', title: 'Quant Analytics Associate', locationRaw: 'Mumbai, Maharashtra, India',
      applyUrl: 'https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/210707244',
      postedAt: '2026-10-13T00:00:00.000Z', workMode: 'hybrid', description: '',
    })
  })

  it('reads the description from the detail payload, without the corporate boilerplate', () => {
    const a = adapterFor('oraclehcm')!
    expect(a.detailUrl!(TOKEN, '1')).toContain('/recruitingCEJobRequisitionDetails')
    const text = a.parseDetail!({ items: [{ ExternalDescriptionStr: '<p>Build models.</p>', ExternalQualificationsStr: '<li>3+ years</li>', CorporateDescriptionStr: 'JPMorgan is a leading firm' }] })
    expect(text).toBe('Build models. 3+ years')
  })

  it('is OFF unless CAREER_SITES lists it: no request, incomplete empty read', async () => {
    const orig = globalThis.fetch; let called = false
    globalThis.fetch = (() => { called = true; throw new Error('network used') }) as typeof fetch
    try {
      expect(await adapterFor('oraclehcm')!.fetchAll!(TOKEN)).toEqual({ roles: [], complete: false })
      expect(called).toBe(false)
    } finally { globalThis.fetch = orig }
  })

  it('refuses a tenant whose India filter does not narrow the list', async () => {
    process.env.CAREER_SITES = 'oraclehcm'
    const orig = globalThis.fetch
    const first = { items: [{ TotalJobsCount: 78431, locationsFacet: [{ Name: 'India', Id: 7, TotalCount: 14895 }], requisitionList: [] }] }
    const unfiltered = { items: [{ TotalJobsCount: 78431, requisitionList: [{ Id: '1', Title: 't', PrimaryLocation: 'United States' }] }] }
    const pages = [first, unfiltered]
    globalThis.fetch = (async () => ({ ok: true, text: async () => JSON.stringify(pages.shift()) })) as unknown as typeof fetch
    try { await expect(adapterFor('oraclehcm')!.fetchAll!(TOKEN)).rejects.toThrow(/filter not applied/) } finally { globalThis.fetch = orig }
  })

  it('refuses a WAF block page rather than parsing or retrying around it', async () => {
    process.env.CAREER_SITES = 'oraclehcm'
    const orig = globalThis.fetch
    globalThis.fetch = (async () => ({ ok: true, text: async () => '<html>W4S-402: Blocked</html>' })) as unknown as typeof fetch
    try { await expect(adapterFor('oraclehcm')!.fetchAll!(TOKEN)).rejects.toThrow(/blocked/) } finally { globalThis.fetch = orig }
  })
})
