import type { Gala } from '../types'

const MANILA_UTC_OFFSET_HOURS = 8
const DEFAULT_EVENT_DURATION_HOURS = 2

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function parseManilaDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())
  if (!dateMatch || !timeMatch) throw new Error('This gala has an invalid date or call time.')

  const [, year, month, day] = dateMatch
  const [, rawHour, rawMinute, rawMeridiem] = timeMatch
  const hour12 = Number(rawHour)
  const minute = Number(rawMinute)
  if (hour12 < 1 || hour12 > 12 || minute > 59) throw new Error('This gala has an invalid call time.')

  const hour = (hour12 % 12) + (rawMeridiem.toUpperCase() === 'PM' ? 12 : 0)
  const localDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute))
  if (localDate.getUTCFullYear() !== Number(year) || localDate.getUTCMonth() !== Number(month) - 1 || localDate.getUTCDate() !== Number(day)) {
    throw new Error('This gala has an invalid date.')
  }

  return new Date(localDate.getTime() - MANILA_UTC_OFFSET_HOURS * 60 * 60 * 1000)
}

function toUtcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function foldLine(line: string) {
  const segments: string[] = []
  let segment = ''
  let segmentBytes = 0

  for (const character of line) {
    const characterBytes = new TextEncoder().encode(character).length
    if (segmentBytes + characterBytes > 73) {
      segments.push(segment)
      segment = ` ${character}`
      segmentBytes = 1 + characterBytes
    } else {
      segment += character
      segmentBytes += characterBytes
    }
  }
  segments.push(segment)
  return segments.join('\r\n')
}

function makeEventTimes(gala: Gala) {
  const start = parseManilaDateTime(gala.date, gala.callTime)
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000)
  return { start, end }
}

function formatLocation(gala: Gala) {
  const venue = gala.venue.trim()
  const address = gala.address.trim()
  if (!venue) return address
  if (!address || address.toLocaleLowerCase('en').includes(venue.toLocaleLowerCase('en'))) return address || venue
  if (venue.toLocaleLowerCase('en').includes(address.toLocaleLowerCase('en'))) return venue
  return `${venue}, ${address}`
}

export function makeGoogleCalendarUrl(gala: Gala) {
  const { start, end } = makeEventTimes(gala)
  const details = [gala.notes.trim(), `GC time: ${gala.gcTime}`, 'Planned with Galaan.'].filter(Boolean).join('\n\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: gala.title,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
    ctz: 'Asia/Manila',
    details,
    location: formatLocation(gala),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function makeIcsFile(gala: Gala) {
  const { start, end } = makeEventTimes(gala)
  const description = [gala.notes.trim(), `GC time: ${gala.gcTime}`, 'Planned with Galaan.'].filter(Boolean).join('\n\n')
  const location = formatLocation(gala)
  const uid = `${gala.id}@galaan.app`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Galaan//Galaan Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(uid)}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeCalendarText(gala.title)}`,
    `LOCATION:${escapeCalendarText(location)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
