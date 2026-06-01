/**
 * Single source of truth for timezone picker options across the app.
 * Each entry is `[ianaId, humanLabel]`. Used by:
 *   - admin/settings (default site timezone)
 *   - admin/availability (per-nutritionist working-hour timezone)
 * Add new zones here; both pickers pick them up automatically.
 *
 * Labels show offset for quick scanning. They're hand-written rather than
 * computed from Intl because Intl offsets change with DST and we don't
 * want the label flipping +03 ↔ +02 mid-day — the IANA id is the
 * authoritative value, the label is just a hint.
 */
export const TIMEZONE_OPTIONS: readonly (readonly [string, string])[] = [
  // United States — all six mainland + outlying zones
  ['America/New_York',    '(GMT-05/-04) US Eastern — New York'],
  ['America/Chicago',     '(GMT-06/-05) US Central — Chicago'],
  ['America/Denver',      '(GMT-07/-06) US Mountain — Denver'],
  ['America/Phoenix',     '(GMT-07)     US Mountain (no DST) — Phoenix'],
  ['America/Los_Angeles', '(GMT-08/-07) US Pacific — Los Angeles'],
  ['America/Anchorage',   '(GMT-09/-08) US Alaska — Anchorage'],
  ['Pacific/Honolulu',    '(GMT-10)     US Hawaii — Honolulu'],
  // Middle East + Europe (existing defaults)
  ['Asia/Amman',          '(GMT+03)     Amman'],
  ['Asia/Dubai',          '(GMT+04)     Dubai'],
  ['Asia/Riyadh',         '(GMT+03)     Riyadh'],
  ['Asia/Beirut',         '(GMT+02/+03) Beirut'],
  ['Africa/Cairo',        '(GMT+02)     Cairo'],
  ['Europe/London',       '(GMT+00/+01) London'],
  ['Europe/Paris',        '(GMT+01/+02) Paris'],
] as const

/** IANA ids only — for places that just need the list of valid zones. */
export const TIMEZONE_IDS: readonly string[] = TIMEZONE_OPTIONS.map(
  ([id]) => id,
)

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

/**
 * Format an absolute UTC instant as `YYYY-MM-DD` in a specific timezone —
 * the calendar groups bookings by the coach's LOCAL day (a 11pm-Amman
 * booking must not land on the next UTC day). `en-CA` yields ISO order.
 */
export function formatYmdInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
