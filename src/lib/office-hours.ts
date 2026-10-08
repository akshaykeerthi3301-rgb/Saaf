/**
 * Office-hour sessions (F-1006, TASK-196) — what the page shows and the calendar file it offers. Pure.
 *
 * ⚠️ SAAF HOSTS NOTHING HERE. A session is a time and a link the host supplied; Saaf lists it, offers
 * an "add to calendar" file, and takes no booking, no payment and no recording. The link is shown only
 * if it is `https` (the table enforces it too).
 */
export type OfficeHour = { id: string; title: string; hostName: string; startsAt: string; durationMin: number; joinUrl: string; description: string | null }

const pad = (n: number) => String(n).padStart(2, '0')
/** 20261012T133000Z — the UTC form every calendar app reads. */
const utc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
/** RFC 5545 text escaping: backslash, semicolon, comma and newline. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** Fold to 75 octets a line, as the standard asks. Plain character count is exact for the ASCII a calendar file mostly holds and safely short for the rest. */
const fold = (line: string) => (line.length <= 73 ? line : line.match(/.{1,73}/g)!.join('\r\n '))

/** A one-event iCalendar file for a session, or null when its time or link is not usable. */
export function icsFor(o: OfficeHour, now: Date = new Date()): string | null {
  const start = new Date(o.startsAt)
  if (Number.isNaN(start.getTime()) || !/^https:\/\//i.test(o.joinUrl)) return null
  const end = new Date(start.getTime() + o.durationMin * 60_000)
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Saaf//Office hours//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${o.id}@saaf`,
    `DTSTAMP:${utc(now)}`, `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`,
    `SUMMARY:${esc(o.title)}`,
    `DESCRIPTION:${esc(`${o.description ? `${o.description}\n\n` : ''}Hosted by ${o.hostName}. Join: ${o.joinUrl}`)}`,
    `URL:${o.joinUrl}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

/** "Sat 12 Oct, 7:00 pm IST" — India time, because that is who it is for. */
export function whenIst(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(d)}, ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d).toLowerCase()} IST`
}

/** Sessions that have not ended yet, soonest first. */
export function upcoming(list: OfficeHour[], now: Date = new Date()): OfficeHour[] {
  return list
    .filter((o) => new Date(o.startsAt).getTime() + o.durationMin * 60_000 > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}
