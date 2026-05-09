/**
 * Convert a local "calendar moment" — date + time strings interpreted in
 * a specific IANA timezone — into the corresponding absolute UTC instant.
 *
 *   localDateTimeInTzToUtc('2026-05-08', '14:30', 'Asia/Amman')
 *     → Date instance for 2026-05-08 14:30:00 local Amman time
 *
 * Native JS has no built-in for this — `new Date('2026-05-08T14:30:00')`
 * always uses the server's local timezone. We work around it by treating
 * the input as UTC, asking Intl what time the target zone reads at that
 * UTC instant, then shifting by the difference.
 *
 * Doesn't handle DST-spring-forward gaps perfectly (no native API does
 * without a TZ database). Good enough for normal hours; off by an hour
 * at most for the once-a-year transition slot.
 */
export function localDateTimeInTzToUtc(
  date: string,
  time: string,
  tz: string,
): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)

  if (!y || !m || !d || hh == null || mm == null) {
    throw new Error('Invalid date or time format')
  }

  const wanted = Date.UTC(y, m - 1, d, hh, mm, 0)
  const guess = new Date(wanted)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(guess)

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)

  const tzAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  )

  const offsetMs = tzAsUtc - wanted
  return new Date(guess.getTime() - offsetMs)
}

/**
 * Format an absolute UTC instant as `HH:MM` in a specific timezone.
 * Inverse of localDateTimeInTzToUtc — used when displaying server-stored
 * timestamps back to the user in the nutritionist's working-hour zone.
 */
export function formatHmInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}
