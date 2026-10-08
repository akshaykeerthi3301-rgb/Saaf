import { describe, it, expect } from 'vitest'
import { icsFor, upcoming, whenIst, type OfficeHour } from '../office-hours'

const S: OfficeHour = { id: 'abc-123', title: 'Résumé review, live', hostName: 'Asha Rao', startsAt: '2026-10-12T13:30:00Z', durationMin: 45, joinUrl: 'https://meet.example.com/x?y=1', description: 'Bring a résumé; we will look at two.' }
const NOW = new Date('2026-10-08T00:00:00Z')

describe('office hours', () => {
  it('makes a calendar file a calendar app can read: UTC times, the right end, CRLF lines, and the join link', () => {
    const ics = icsFor(S, NOW)!
    expect(ics).toContain('DTSTART:20261012T133000Z')
    expect(ics).toContain('DTEND:20261012T141500Z')
    expect(ics).toContain('DTSTAMP:20261008T000000Z')
    expect(ics).toContain('UID:abc-123@saaf')
    expect(ics).toContain('URL:https://meet.example.com/x?y=1')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false)
  })
  it('escapes what would break a field — commas, semicolons, newlines — and folds long lines', () => {
    const ics = icsFor({ ...S, title: 'Q&A; "live", now\nreally', description: 'x'.repeat(200) }, NOW)!
    expect(ics).toContain('SUMMARY:Q&A\; "live"\\, now\\nreally')
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
  })
  it('offers no file for a bad time or a link that is not https', () => {
    expect(icsFor({ ...S, startsAt: 'soon' }, NOW)).toBeNull()
    expect(icsFor({ ...S, joinUrl: 'http://meet.example.com' }, NOW)).toBeNull()
    expect(icsFor({ ...S, joinUrl: 'javascript:alert(1)' }, NOW)).toBeNull()
  })
  it('says the time in India, not the reader’s guess', () => {
    expect(whenIst('2026-10-12T13:30:00Z')).toBe('Mon, 12 Oct, 7:00 pm IST')
    expect(whenIst('nonsense')).toBe('')
  })
  it('lists only sessions that have not ended, soonest first', () => {
    const past: OfficeHour = { ...S, id: 'p', startsAt: '2026-10-01T10:00:00Z' }
    const later: OfficeHour = { ...S, id: 'l', startsAt: '2026-10-20T10:00:00Z' }
    expect(upcoming([later, past, S], NOW).map((o) => o.id)).toEqual(['abc-123', 'l'])
    // Still on while it runs, gone once it has ended.
    expect(upcoming([S], new Date('2026-10-12T14:00:00Z'))).toHaveLength(1)
    expect(upcoming([S], new Date('2026-10-12T14:16:00Z'))).toHaveLength(0)
  })
})
