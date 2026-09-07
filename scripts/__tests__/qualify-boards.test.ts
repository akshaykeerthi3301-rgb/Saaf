import { describe, it, expect } from 'vitest'
import { workdayName } from '../qualify-boards'

/**
 * Workday display names.
 *
 * These end up on a candidate's shortlist next to "Swiggy", so
 * "Bristolmyerssquibb" is a product defect, not a cosmetic one. Workday
 * publishes no usable company name — the detail payload's `hiringOrganization`
 * is the per-requisition legal entity ("IL00 Mellanox Technologies, Ltd." for
 * NVIDIA) — so the only signal is the site name, which preserves the word
 * boundaries and capitalisation the tenant slug lost.
 *
 * Every case below is a real board from the 2026-09-07 harvest, and most of
 * them are here because an earlier version of this function got them wrong.
 */
describe('workdayName', () => {
  const name = (t: string) => workdayName(t).name

  it('splits a tenant that ran two real words together', () => {
    expect(name('automationanywhere.wd5.myworkdayjobs.com/AutomationAnywhereJobs'))
      .toBe('Automation Anywhere')
    expect(name('westernunion.wd5.myworkdayjobs.com/WesternUnionCareers')).toBe('Western Union')
    expect(name('springernature.wd3.myworkdayjobs.com/SpringerNature')).toBe('Springer Nature')
    expect(name('alfalaval.wd3.myworkdayjobs.com/Alfa_Laval_jobs')).toBe('Alfa Laval')
  })

  it('keeps a compound brand whole', () => {
    // Splitting every capital gave "Res Med" and "Go To". Both halves of a
    // compound brand are short; a real word runs to five characters or more.
    expect(name('resmed.wd3.myworkdayjobs.com/ResMed')).toBe('ResMed')
    expect(name('goto.wd1.myworkdayjobs.com/GoTo')).toBe('GoTo')
    expect(name('topbloc.wd1.myworkdayjobs.com/TopBloc')).toBe('TopBloc')
  })

  it('splits an acronym from the word it is glued to', () => {
    expect(name('chrobinson.wd5.myworkdayjobs.com/CHRobinson')).toBe('CH Robinson')
    expect(name('fticonsulting.wd5.myworkdayjobs.com/FTIConsulting')).toBe('FTI Consulting')
    expect(name('kiongroup.wd3.myworkdayjobs.com/KIONGroup')).toBe('KION Group')
  })

  it('keeps a short acronym but not a site name shouting', () => {
    // NVIDIA is how the company writes itself. HEIDELBERG is a site name in
    // caps, and accepting it turned "Heidelberg" into "HEIDELBERG".
    expect(name('nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite')).toBe('NVIDIA')
    expect(name('heidelberg.wd3.myworkdayjobs.com/HEIDELBERG')).toBe('Heidelberg')
  })

  it('separates a glued corporate suffix', () => {
    expect(name('hpinc.wd5.myworkdayjobs.com/HPINC')).toBe('HP Inc')
  })

  it('falls back to the title-cased tenant rather than guessing', () => {
    // The site proves nothing here: it does not concatenate back to the tenant.
    expect(name('dxctechnology.wd1.myworkdayjobs.com/DXCJobs')).toBe('Dxctechnology')
    expect(workdayName('dxctechnology.wd1.myworkdayjobs.com/DXCJobs').proven).toBe(false)
    // A site that merely repeats the tenant adds nothing — and must not
    // lower-case it. This turned "Hitachi" into "hitachi".
    expect(name('hitachi.wd1.myworkdayjobs.com/hitachi')).toBe('Hitachi')
    expect(name('novartis.wd3.myworkdayjobs.com/novartis')).toBe('Novartis')
  })

  it('never returns an all-lowercase name', () => {
    for (const t of [
      'hitachi.wd1.myworkdayjobs.com/hitachi',
      'brookfield.wd5.myworkdayjobs.com/brookfield',
      'ankura.wd5.myworkdayjobs.com/ankura',
      'adobe.wd5.myworkdayjobs.com/external_experienced',
    ]) {
      expect(name(t), t).not.toBe(name(t).toLowerCase())
    }
  })
})
