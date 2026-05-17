'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Calendar as CalIcon,
} from '@/icons'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type View = 'week' | 'month'
type SessionType = 'introCall' | 'followUp' | 'deepDive' | 'inClinicVisit'

interface Session {
  id: string
  /** ISO date `YYYY-MM-DD` */
  date: string
  /** 24h time `HH:mm` */
  start: string
  durationMin: number
  clientName: string
  clientInitials: string
  type: SessionType
  /** True when this booking came from the physical clinic (no online
   *  account). Drives the small "In-clinic" badge in the cell. */
  isClinic?: boolean
  /** Meeting URL set by the Stripe webhook (or admin override) once
   *  the booking is paid. Null while the session isn't joinable yet. */
  meetingUrl?: string | null
}

const TYPE_TINT: Record<SessionType, string> = {
  introCall:      '#a3e635',
  followUp:       '#06b6d4',
  deepDive:       '#a855f7',
  inClinicVisit:  '#f59e0b',
}

const DAY_START_HOUR = 8
const DAY_END_HOUR = 20

export default function CalendarPage() {
  const t = useTranslations('nutritionist')
  const tPage = useTranslations('nutritionist.calendarPage')
  const tBookings = useTranslations('bookings')
  const { profile } = useUser()

  const [view, setView] = useState<View>('week')
  // Anchor the calendar on today, not a hardcoded 2026-05-04 (which
  // was the date the SEED fixtures were dated for). Now that SEED is
  // gone, the calendar would have shown an empty week from May 2026
  // forever otherwise.
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(() =>
    new Date().toISOString().slice(0, 10),
  )

  // Pull bookings inside the visible month window so both week + month
  // views have everything they need without re-fetching on view toggle.
  // A row carries either client_id (online client) OR clinic_client_id
  // (walk-in). We resolve names from both tables and tag the walk-ins
  // so the cell can render an "In-clinic" badge.
  const live = useSupabaseQuery<Session[]>(async (supabase) => {
    if (!profile?.id) return []
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0)
    type Row = {
      id: string
      client_id: string | null
      clinic_client_id: string | null
      type: SessionType
      scheduled_at: string
      duration_min: number
      status: string
      meeting_url: string | null
    }
    const { data: rows } = await supabase
      .from('bookings')
      .select(
        'id, client_id, clinic_client_id, type, scheduled_at, duration_min, status, meeting_url',
      )
      .eq('nutritionist_id', profile.id)
      .gte('scheduled_at', monthStart.toISOString())
      .lt('scheduled_at',  monthEnd.toISOString())
      .order('scheduled_at', { ascending: true })

    const list = (rows as Row[] | null) ?? []
    if (list.length === 0) return []

    const onlineIds = Array.from(
      new Set(list.map((r) => r.client_id).filter((v): v is string => !!v)),
    )
    const clinicIds = Array.from(
      new Set(
        list.map((r) => r.clinic_client_id).filter((v): v is string => !!v),
      ),
    )

    const [{ data: clients }, { data: clinics }] = await Promise.all([
      onlineIds.length
        ? supabase.from('profiles').select('id, full_name').in('id', onlineIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      clinicIds.length
        ? supabase
            .from('clinic_clients')
            .select('id, full_name')
            .in('id', clinicIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ])
    const nameOf = new Map<string, string>()
    for (const c of (clients as { id: string; full_name: string | null }[] | null) ?? []) {
      nameOf.set(c.id, c.full_name ?? 'Client')
    }
    const clinicNameOf = new Map<string, string>()
    for (const c of (clinics as { id: string; full_name: string }[] | null) ?? []) {
      clinicNameOf.set(c.id, c.full_name)
    }

    return list.map((r) => {
      const dt = new Date(r.scheduled_at)
      const isClinic = !!r.clinic_client_id
      const name = isClinic
        ? clinicNameOf.get(r.clinic_client_id!) ?? 'Clinic client'
        : nameOf.get(r.client_id!) ?? 'Client'
      return {
        id: r.id,
        date: dt.toISOString().slice(0, 10),
        start: dt.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).slice(0, 5),
        durationMin: r.duration_min,
        clientName: name,
        clientInitials: initialsOf(name),
        type: r.type,
        isClinic,
        meetingUrl: r.meeting_url,
      }
    })
  }, [profile?.id, anchor.getMonth(), anchor.getFullYear()])

  const sessions = live.data ?? []

  const navLabel = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const sameMonth = start.getMonth() === end.getMonth()
      const sameYear = start.getFullYear() === end.getFullYear()
      const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
        d.toLocaleDateString(undefined, opts)
      return sameMonth
        ? `${fmt(start, { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
        : sameYear
          ? `${fmt(start, { month: 'short', day: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`
          : `${fmt(start, { month: 'short', day: 'numeric', year: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }, [view, anchor])

  const shift = (delta: number) => {
    const next = new Date(anchor)
    if (view === 'week') next.setDate(next.getDate() + 7 * delta)
    else next.setMonth(next.getMonth() + delta)
    setAnchor(next)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-2xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('calendar')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tPage('subtitle')}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {tPage('newSession')}
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-pill bg-surface border border-border p-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              setAnchor(today)
            }}
            className="px-3 h-9 text-xs font-semibold text-fg-1 hover:bg-surface-raised rounded-pill"
          >
            {tPage('today')}
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          </button>
          <span className="px-3 text-sm font-medium text-fg-1 min-w-44 text-center">
            {navLabel}
          </span>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-1">
          {(['week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 h-8 rounded-pill text-xs font-semibold transition-colors ${
                view === v
                  ? 'bg-primary/20 text-lime-400'
                  : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              {v === 'week' ? tPage('viewWeek') : tPage('viewMonth')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid + day panel */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="min-w-0">
          {view === 'week' ? (
            <WeekGrid
              anchor={anchor}
              sessions={sessions}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          ) : (
            <MonthGrid
              anchor={anchor}
              sessions={sessions}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          )}
        </div>
        <DayPanel
          tPage={tPage}
          tBookings={tBookings}
          dayISO={selectedDay}
          sessions={sessions.filter((s) => s.date === selectedDay)}
        />
      </section>
    </div>
  )
}

/* ── Week grid ──────────────────────────────────────────────────── */

function WeekGrid({
  anchor,
  sessions,
  selectedDay,
  onSelectDay,
}: {
  anchor: Date
  sessions: Session[]
  selectedDay: string | null
  onSelectDay: (iso: string) => void
}) {
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map(
    (_, i) => DAY_START_HOUR + i,
  )
  const HOUR_HEIGHT = 56 // px per hour

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border bg-bg-deeper/40">
        <div />
        {days.map((d) => {
          const iso = isoOf(d)
          const isSelected = iso === selectedDay
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={`px-3 py-3 text-start border-s border-border ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p
                className={`mt-0.5 font-mono text-base font-bold ${
                  isSelected ? 'text-lime-400' : 'text-fg-1'
                }`}
                dir="ltr"
              >
                {d.getDate()}
              </p>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="relative grid grid-cols-[64px_repeat(7,1fr)] overflow-x-auto">
        {/* Time axis */}
        <div className="border-e border-border">
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="text-[10px] font-mono text-fg-3 px-2 pt-1 border-b border-border"
              dir="ltr"
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => {
          const iso = isoOf(d)
          const daySessions = sessions.filter((s) => s.date === iso)
          return (
            <div
              key={iso}
              className="relative border-s border-border"
              style={{ height: hours.length * HOUR_HEIGHT }}
            >
              {/* Hour lines */}
              {hours.map((_h, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-b border-border/60"
                  style={{ top: i * HOUR_HEIGHT, height: 0 }}
                />
              ))}

              {/* Sessions */}
              {daySessions.map((s) => {
                const [hh, mm] = s.start.split(':').map(Number)
                const top = ((hh! - DAY_START_HOUR) + (mm! / 60)) * HOUR_HEIGHT
                const height = (s.durationMin / 60) * HOUR_HEIGHT
                const tint = TYPE_TINT[s.type]
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectDay(iso)}
                    className="absolute inset-x-1.5 rounded-md text-start p-2 overflow-hidden hover:-translate-y-px transition-transform"
                    style={{
                      top,
                      height: Math.max(28, height - 4),
                      background: `${tint}1a`,
                      borderInlineStart: `3px solid ${tint}`,
                    }}
                  >
                    <p className="text-[11px] font-mono text-fg-3" dir="ltr">
                      {s.start}
                    </p>
                    <p
                      className="text-xs font-semibold text-fg-1 truncate"
                      style={{ color: tint }}
                    >
                      {s.clientName}
                    </p>
                    {s.isClinic && (
                      <span
                        className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-eyebrow"
                        style={{
                          color: tint,
                          background: `${tint}22`,
                          padding: '1px 6px',
                          borderRadius: 9999,
                        }}
                      >
                        In-clinic
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Month grid ─────────────────────────────────────────────────── */

function MonthGrid({
  anchor,
  sessions,
  selectedDay,
  onSelectDay,
}: {
  anchor: Date
  sessions: Session[]
  selectedDay: string | null
  onSelectDay: (iso: string) => void
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const startWeekday = (first.getDay() + 6) % 7 // Mon-first
  const start = new Date(first)
  start.setDate(first.getDate() - startWeekday)
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      date: d,
      inMonth: d.getMonth() === anchor.getMonth(),
      iso: isoOf(d),
    }
  })

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-7 bg-bg-deeper/40 border-b border-border text-center text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const events = sessions.filter((s) => s.date === c.iso)
          const isSelected = c.iso === selectedDay
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onSelectDay(c.iso)}
              className={`min-h-[96px] text-start p-2 border-s border-b border-border last:border-e first:border-s ${
                !c.inMonth ? 'bg-bg-deeper/20' : ''
              } ${isSelected ? 'bg-primary/10' : 'hover:bg-surface-raised'} transition-colors`}
            >
              <span
                className={`font-mono text-xs ${
                  isSelected
                    ? 'text-lime-400 font-bold'
                    : c.inMonth
                      ? 'text-fg-1'
                      : 'text-fg-3'
                }`}
                dir="ltr"
              >
                {c.date.getDate()}
              </span>
              <ul className="mt-1.5 space-y-1">
                {events.slice(0, 3).map((e) => (
                  <li
                    key={e.id}
                    className="text-[10px] font-medium truncate rounded-sm px-1 py-0.5"
                    style={{
                      background: `${TYPE_TINT[e.type]}1f`,
                      color: TYPE_TINT[e.type],
                    }}
                    dir="ltr"
                  >
                    {e.start} {e.clientInitials}
                  </li>
                ))}
                {events.length > 3 && (
                  <li className="text-[10px] text-fg-3 font-mono">
                    +{events.length - 3}
                  </li>
                )}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Day panel ──────────────────────────────────────────────────── */

function DayPanel({
  tPage,
  tBookings,
  dayISO,
  sessions,
}: {
  tPage: ReturnType<typeof useTranslations>
  tBookings: ReturnType<typeof useTranslations>
  dayISO: string | null
  sessions: Session[]
}) {
  if (!dayISO) {
    return (
      <aside className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <CalIcon className="w-7 h-7 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-fg-1">{tPage('selectDay')}</p>
      </aside>
    )
  }

  const dateLabel = new Date(dayISO).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <aside className="rounded-xl border border-border bg-surface p-5 lg:max-h-[640px] lg:sticky lg:top-4">
      <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
        {tPage('sessionsThisDay')}
      </p>
      <p className="mt-1 text-base font-semibold text-fg-1">{dateLabel}</p>
      <p className="text-xs text-fg-3 font-mono mt-0.5" dir="ltr">
        {tPage('totalSessions', { count: sessions.length })}
      </p>

      {sessions.length === 0 ? (
        <div className="mt-5 text-sm text-fg-3 text-center py-6">
          {tPage('noEvents')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2 lg:overflow-y-auto lg:max-h-[480px] pe-1">
          {sessions
            .slice()
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border bg-bg-deeper/40 p-3"
                style={{ borderInlineStart: `3px solid ${TYPE_TINT[s.type]}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg-1 truncate">
                      {s.clientName}
                    </p>
                    <p
                      className="text-[11px] font-medium uppercase tracking-eyebrow"
                      style={{ color: TYPE_TINT[s.type] }}
                    >
                      {s.isClinic ? 'In-clinic visit' : tBookings(s.type)}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-fg-2 shrink-0" dir="ltr">
                    {s.start} · {s.durationMin}m
                  </p>
                </div>
                {!s.isClinic && (
                  <button
                    type="button"
                    disabled={!s.meetingUrl}
                    title={s.meetingUrl ? undefined : 'Meeting link not yet generated'}
                    onClick={() => {
                      if (s.meetingUrl) window.open(s.meetingUrl, '_blank')
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-pill bg-primary/15 text-lime-400 h-8 px-3 text-[11px] font-semibold hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Video className="w-3 h-3" strokeWidth={2} />
                    {tBookings('joinSession')}
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}
    </aside>
  )
}

/* ── Helpers ────────────────────────────────────────────────────── */

function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const wd = (out.getDay() + 6) % 7 // Mon=0
  out.setDate(out.getDate() - wd)
  out.setHours(0, 0, 0, 0)
  return out
}
