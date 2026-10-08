import { describe, it, expect } from 'vitest'
import { DEFAULT_ALERTS, describeAlerts, istWeekday, lookbackHours, sanitizeAlertSettings, shouldSendToday } from '../alert-settings'

describe('sanitizeAlertSettings', () => {
  it('gives a candidate with nothing saved exactly what the digest always did', () => {
    for (const raw of [null, undefined, {}, [], 'x', 5]) expect(sanitizeAlertSettings(raw)).toEqual(DEFAULT_ALERTS)
  })
  it('keeps what the controls can make and nothing else', () => {
    expect(sanitizeAlertSettings({ frequency: 'weekly', weekday: 5, minScore: 80, maxJobs: 10 })).toEqual({ frequency: 'weekly', weekday: 5, minScore: 80, maxJobs: 10 })
    expect(sanitizeAlertSettings({ frequency: 'hourly', weekday: 9, minScore: 77, maxJobs: 999, extra: 1 })).toEqual(DEFAULT_ALERTS)
    expect(sanitizeAlertSettings({ weekday: '3', minScore: 80.5 })).toEqual(DEFAULT_ALERTS)
  })
})

describe('who gets an email on this run', () => {
  // 21:30 UTC on Sunday 2026-10-04 is already Monday morning in India.
  const sundayNightUtc = new Date('2026-10-04T21:30:00Z')
  it('reads the weekday in India, not in UTC', () => {
    expect(sundayNightUtc.getUTCDay()).toBe(0)
    expect(istWeekday(sundayNightUtc)).toBe(1)
  })
  it('daily always, off never, weekly only on its own weekday', () => {
    expect(shouldSendToday({ ...DEFAULT_ALERTS, frequency: 'daily' }, sundayNightUtc)).toBe(true)
    expect(shouldSendToday({ ...DEFAULT_ALERTS, frequency: 'off' }, sundayNightUtc)).toBe(false)
    expect(shouldSendToday({ ...DEFAULT_ALERTS, frequency: 'weekly', weekday: 1 }, sundayNightUtc)).toBe(true)
    expect(shouldSendToday({ ...DEFAULT_ALERTS, frequency: 'weekly', weekday: 0 }, sundayNightUtc)).toBe(false)
  })
  it('a weekly email reaches back a week; a daily one a day plus slack', () => {
    expect(lookbackHours({ ...DEFAULT_ALERTS, frequency: 'weekly' })).toBe(170)
    expect(lookbackHours({ ...DEFAULT_ALERTS, frequency: 'daily' })).toBe(26)
  })
})

describe('describeAlerts', () => {
  it('says it in a sentence', () => {
    expect(describeAlerts({ frequency: 'weekly', weekday: 5, minScore: 80, maxJobs: 8 })).toBe('Every Friday morning: up to 8 new roles, roles scoring 80 or above.')
    expect(describeAlerts({ frequency: 'daily', weekday: 1, minScore: 0, maxJobs: 3 })).toBe('Every morning: up to 3 new roles, every new role.')
    expect(describeAlerts({ ...DEFAULT_ALERTS, frequency: 'off' })).toBe('No alert emails.')
  })
})
