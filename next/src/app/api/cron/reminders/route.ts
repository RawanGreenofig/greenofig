import type { NextRequest } from 'next/server'
import { json, serviceUnavailable, unauthorized } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/cron/reminders
 *
 * The server-side reminder scheduler. Driven by an external cron (a
 * GitHub Actions workflow hitting this endpoint every ~10 min) so it
 * works regardless of the Vercel plan's cron limits. Auth is the
 * shared server-to-server secret (x-secret == OPENCLAW_WEBHOOK_SECRET).
 *
 * Each run:
 *   1. For every user with a notification_preferences row, converts
 *      "now" into their timezone and fires any meal / hydration /
 *      workout / weekly-progress reminder whose time just passed —
 *      once per day (reminder_log de-dups).
 *   2. Sweeps clinic_payments for due/overdue charges and notifies the
 *      owning coach (once per charge, via due_notified_at).
 *
 * Delivery reuses /api/notifications/send (x-secret mode), so each
 * reminder lands in the bell AND as a web-push + Android (FCM) push —
 * the same channels users already subscribe to.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOW_MIN = 15 // a reminder fires if its time fell in the last 15 min
const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || 'America/New_York'

interface Prefs {
  user_id: string
  breakfast_enabled: boolean
  breakfast_time: string
  lunch_enabled: boolean
  lunch_time: string
  dinner_enabled: boolean
  dinner_time: string
  hydration_enabled: boolean
  hydration_start_time: string
  hydration_end_time: string
  hydration_interval_hours: number
  workout_enabled: boolean
  workout_time: string
}

const COPY: Record<string, { title: string; titleAr: string; body: string; bodyAr: string; url: string }> = {
  breakfast: { title: 'Breakfast time 🍳', titleAr: 'وقت الفطور 🍳', body: 'Log your breakfast and start the day on plan.', bodyAr: 'سجّل فطورك وابدأ يومك وفق خطتك.', url: '/dashboard/meal-plan' },
  lunch: { title: 'Lunch time 🥗', titleAr: 'وقت الغداء 🥗', body: 'Time for a balanced lunch.', bodyAr: 'حان وقت غداء متوازن.', url: '/dashboard/meal-plan' },
  dinner: { title: 'Dinner time 🍽️', titleAr: 'وقت العشاء 🍽️', body: 'Keep the streak — log your dinner.', bodyAr: 'حافظ على التزامك — سجّل عشاءك.', url: '/dashboard/meal-plan' },
  workout: { title: 'Workout reminder 🏋️', titleAr: 'تذكير التمرين 🏋️', body: 'Time to move — your workout is due.', bodyAr: 'حان وقت الحركة — تمرينك مستحق.', url: '/dashboard' },
  hydration: { title: 'Time to hydrate 💧', titleAr: 'وقت شرب الماء 💧', body: 'Drink a glass of water.', bodyAr: 'اشرب كوباً من الماء.', url: '/dashboard' },
  progress: { title: 'Weekly check-in 📈', titleAr: 'مراجعة أسبوعية 📈', body: 'Log this week’s weight & measurements.', bodyAr: 'سجّل وزنك وقياساتك لهذا الأسبوع.', url: '/dashboard/progress' },
}

function toMin(hhmmss: string | null): number | null {
  if (!hhmmss) return null
  const m = hhmmss.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** Local wall-clock for a timezone: minutes-since-midnight + weekday. */
function localNow(tz: string): { minutes: number; weekday: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    let h = Number(get('hour'))
    if (h === 24) h = 0 // some ICU builds emit 24 at midnight
    return { minutes: h * 60 + Number(get('minute')), weekday: get('weekday') }
  } catch {
    return localNow(DEFAULT_TZ === tz ? 'UTC' : DEFAULT_TZ)
  }
}

const inWindow = (timeMin: number | null, nowMin: number) =>
  timeMin != null && timeMin <= nowMin && timeMin > nowMin - WINDOW_MIN

export async function POST(req: NextRequest) {
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  if (!secret) return serviceUnavailable('Cron secret')
  if (req.headers.get('x-secret') !== secret) return unauthorized()

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  const todayUTC = new Date().toISOString().slice(0, 10)

  // ── 1. Timed reminders from notification_preferences ──────────────
  const { data: prefRows } = await service
    .from('notification_preferences')
    .select(
      'user_id, breakfast_enabled, breakfast_time, lunch_enabled, lunch_time, dinner_enabled, dinner_time, hydration_enabled, hydration_start_time, hydration_end_time, hydration_interval_hours, workout_enabled, workout_time',
    )
    .limit(5000)
  const prefs = (prefRows as Prefs[] | null) ?? []

  // Resolve each user's timezone.
  const tzByUser = new Map<string, string>()
  if (prefs.length > 0) {
    const { data: profs } = await service
      .from('profiles')
      .select('id, timezone')
      .in('id', prefs.map((p) => p.user_id))
    for (const r of (profs as { id: string; timezone: string | null }[] | null) ?? []) {
      tzByUser.set(r.id, r.timezone || DEFAULT_TZ)
    }
  }

  // Build { kind → userIds } batches of who's due right now (de-duped).
  const batches = new Map<string, string[]>()
  const logRows: { user_id: string; kind: string; sent_on: string }[] = []

  // What's already been sent today, in one query.
  const sentToday = new Set<string>()
  if (prefs.length > 0) {
    const { data: logs } = await service
      .from('reminder_log')
      .select('user_id, kind')
      .eq('sent_on', todayUTC)
    for (const l of (logs as { user_id: string; kind: string }[] | null) ?? []) {
      sentToday.add(`${l.user_id}:${l.kind}`)
    }
  }

  const queue = (userId: string, kind: string, copyKey: string) => {
    if (sentToday.has(`${userId}:${kind}`)) return
    sentToday.add(`${userId}:${kind}`) // guard against dups within this run
    const bk = `${copyKey}|${kind}`
    const arr = batches.get(bk) ?? []
    arr.push(userId)
    batches.set(bk, arr)
    logRows.push({ user_id: userId, kind, sent_on: todayUTC })
  }

  for (const p of prefs) {
    const tz = tzByUser.get(p.user_id) || DEFAULT_TZ
    const { minutes: nowMin, weekday } = localNow(tz)

    if (p.breakfast_enabled && inWindow(toMin(p.breakfast_time), nowMin)) queue(p.user_id, 'breakfast', 'breakfast')
    if (p.lunch_enabled && inWindow(toMin(p.lunch_time), nowMin)) queue(p.user_id, 'lunch', 'lunch')
    if (p.dinner_enabled && inWindow(toMin(p.dinner_time), nowMin)) queue(p.user_id, 'dinner', 'dinner')
    if (p.workout_enabled && inWindow(toMin(p.workout_time), nowMin)) queue(p.user_id, 'workout', 'workout')

    if (p.hydration_enabled) {
      const start = toMin(p.hydration_start_time)
      const end = toMin(p.hydration_end_time)
      const step = Math.max(1, Math.round(p.hydration_interval_hours || 2)) * 60
      if (start != null && end != null) {
        for (let slot = start; slot <= end; slot += step) {
          if (inWindow(slot, nowMin)) {
            const hh = String(Math.floor(slot / 60)).padStart(2, '0')
            const mm = String(slot % 60).padStart(2, '0')
            queue(p.user_id, `hydration:${hh}:${mm}`, 'hydration')
          }
        }
      }
    }

    // Weekly progress nudge — Monday ~09:00 local.
    if (weekday === 'Mon' && inWindow(9 * 60, nowMin)) queue(p.user_id, 'progress', 'progress')
  }

  // Dispatch each batch via /api/notifications/send (web push + FCM + bell row).
  let reminderPushes = 0
  for (const [bk, userIds] of Array.from(batches.entries())) {
    const copyKey = bk.split('|')[0]
    const c = COPY[copyKey]
    if (!c || userIds.length === 0) continue
    try {
      const res = await fetch(`${appUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-secret': secret },
        body: JSON.stringify({ userIds, title: c.title, titleAr: c.titleAr, body: c.body, bodyAr: c.bodyAr, type: 'meal_plan', url: c.url }),
      })
      if (res.ok) reminderPushes += userIds.length
    } catch {
      /* keep going; unsent rows simply aren't logged below */
    }
  }
  // Only log the kinds we actually attempted to send (all batches were attempted).
  if (logRows.length > 0) {
    await service.from('reminder_log').insert(logRows as never)
  }

  // ── 2. Clinic payment due / overdue sweep (all coaches) ───────────
  let paymentPushes = 0
  const { data: dueRows } = await service
    .from('clinic_payments')
    .select('id, coach_id, clinic_client_id, amount_cents, currency, due_date')
    .eq('status', 'due')
    .is('due_notified_at', null)
    .not('due_date', 'is', null)
    .lte('due_date', todayUTC)
    .limit(500)
  const due = (dueRows as { id: string; coach_id: string; clinic_client_id: string; amount_cents: number; currency: string; due_date: string }[] | null) ?? []
  if (due.length > 0) {
    const clientIds = Array.from(new Set(due.map((d) => d.clinic_client_id)))
    const { data: clients } = await service.from('clinic_clients').select('id, full_name').in('id', clientIds)
    const nameById = new Map<string, string>()
    for (const r of (clients as { id: string; full_name: string }[] | null) ?? []) nameById.set(r.id, r.full_name)

    for (const d of due) {
      const name = nameById.get(d.clinic_client_id) ?? 'A clinic client'
      const amount = `${(d.amount_cents / 100).toFixed(2)} ${d.currency}`
      const overdue = d.due_date < todayUTC
      try {
        const res = await fetch(`${appUrl}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-secret': secret },
          body: JSON.stringify({
            userIds: [d.coach_id],
            title: overdue ? 'Payment overdue' : 'Payment due',
            titleAr: overdue ? 'دفعة متأخرة' : 'دفعة مستحقة',
            body: `${name} — ${amount} due ${d.due_date}.`,
            bodyAr: `${name} — ${amount} — تاريخ الاستحقاق ${d.due_date}.`,
            type: 'billing',
            url: `/nutritionist/clinic-clients/${d.clinic_client_id}`,
          }),
        })
        if (res.ok) paymentPushes += 1
      } catch {
        continue
      }
    }
    await service
      .from('clinic_payments')
      .update({ due_notified_at: new Date().toISOString() } as never)
      .in('id', due.map((d) => d.id))
  }

  return json({ ok: true, reminderPushes, paymentPushes, usersChecked: prefs.length })
}
