const formatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/**
 * Formats a YYYY-MM-DD local date, e.g. "Fri 17 Oct".
 *
 * `new Date("2026-10-17")` is parsed as UTC midnight and shown in the
 * browser's zone, which is the previous day west of UTC. Building the
 * date in UTC and formatting it in UTC keeps the calendar day as sent.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return formatter.format(new Date(Date.UTC(year, month - 1, day)))
}
