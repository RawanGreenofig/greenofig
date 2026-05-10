'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Download,
  Calendar as CalIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Video,
  CalendarClock,
  CalendarX,
  TrendingUp,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

type Status = 'scheduled' | 'completed' | 'cancelled' | 'noShow'
type SessionType = 'introCall' | 'followUp' | 'deepDive'

interface AdminBooking {
  id: string
  type: SessionType
  client: string
  clientInitials: string
  clientEmail: string
  nutritionist: string
  nutritionistInitials: string
  scheduledISO: string
  durationMin: number
  status: Status
}

const STATUS_META: Record<Status, { Icon: LucideIcon; tint: string }> = {
  scheduled: { Icon: Clock,        tint: '#06b6d4' },
  completed: { Icon: CheckCircle2, tint: '#a3e635' },
  cancelled: { Icon: XCircle,      tint: '#9baf9f' },
  noShow:    { Icon: CalendarX,    tint: '#f43f5e' },
}

const TYPE_TINT: Record<SessionType, string> = {
  introCall: '#a3e635',
  followUp:  '#06b6d4',
  deepDive:  '#a855f7',
}

const TYPE_ICON: Record<SessionType, LucideIcon> = {
  introCall: Sparkles,
  followUp:  Video,
  deepDive:  CalIcon,
}

const FILTERS: ('all' | Status)[] = ['all', 'scheduled', 'completed', 'cancelled', 'noShow']

const SEED: AdminBooking[] = [
  { id: 'b1',  type: 'followUp', client: 'Layla Hijazi',     clientInitials: 'LH', clientEmail: 'layla@example.com',  nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-08T15:30', durationMin: 30, status: 'scheduled' },
  { id: 'b2',  type: 'deepDive', client: 'Maya Khalil',      clientInitials: 'MK', clientEmail: 'maya@example.com',   nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-09T11:00', durationMin: 60, status: 'scheduled' },
  { id: 'b3',  type: 'introCall', client: 'Yousef Abu Shaer', clientInitials: 'YA', clientEmail: 'yousef@example.com', nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-09T09:30', durationMin: 20, status: 'scheduled' },
  { id: 'b4',  type: 'followUp', client: 'Tareq Sukkar',     clientInitials: 'TS', clientEmail: 'tareq@example.com',  nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-05T14:00', durationMin: 30, status: 'completed' },
  { id: 'b5',  type: 'deepDive', client: 'Diana Costa',      clientInitials: 'DC', clientEmail: 'diana@example.com',  nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-04T16:00', durationMin: 60, status: 'completed' },
  { id: 'b6',  type: 'followUp', client: 'Rasha Tarawneh',   clientInitials: 'RT', clientEmail: 'rasha@example.com',  nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-05-04T10:30', durationMin: 30, status: 'completed' },
  { id: 'b7',  type: 'introCall', client: 'Omar Saadeh',     clientInitials: 'OS', clientEmail: 'omar@example.com',   nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-04-29T11:00', durationMin: 20, status: 'noShow' },
  { id: 'b8',  type: 'followUp', client: 'Hala Mansour',     clientInitials: 'HM', clientEmail: 'hala@example.com',   nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-04-26T15:00', durationMin: 30, status: 'cancelled' },
  { id: 'b9',  type: 'followUp', client: 'Karim Jubran',     clientInitials: 'KJ', clientEmail: 'karim@example.com',  nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-04-22T13:30', durationMin: 30, status: 'completed' },
  { id: 'b10', type: 'introCall', client: 'Nour Bishara',    clientInitials: 'NB', clientEmail: 'nour@example.com',   nutritionist: 'Dr. Rawan Othman', nutritionistInitials: 'RO', scheduledISO: '2026-04-19T10:00', durationMin: 20, status: 'completed' },
]

export default function AdminBookingsPage() {
  const t = useTranslations('admin')
  const tB = useTranslations('admin.bookingsPage')

  const [filter, setFilter] = useState<'all' | Status>('all')
  const [query, setQuery] = useState('')

  const live = useSupabaseQuery<AdminBooking[]>(async (supabase) => {
    type BookingRow = {
      id: string
      client_id: string
      nutritionist_id: string
      type: SessionType
      scheduled_at: string
      duration_min: number
      status: Status
    }
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, client_id, nutritionist_id, type, scheduled_at, duration_min, status')
      .order('scheduled_at', { ascending: false })
      .limit(120)
    const rows = (bookings as BookingRow[] | null) ?? []
    if (rows.length === 0) return []

    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.client_id, r.nutritionist_id]).filter(Boolean)),
    )
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
    type ProfileRow = { id: string; full_name: string | null; email: string | null }
    const profileMap = new Map(
      ((profiles as ProfileRow[] | null) ?? []).map((p) => [p.id, p]),
    )

    const initials = (name: string) =>
      name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '·'

    return rows.map((r) => {
      const client = profileMap.get(r.client_id)
      const nutri = profileMap.get(r.nutritionist_id)
      const clientName = client?.full_name ?? 'Client'
      const nutriName = nutri?.full_name ?? 'Nutritionist'
      return {
        id: r.id,
        type: r.type,
        client: clientName,
        clientInitials: initials(clientName),
        clientEmail: client?.email ?? '',
        nutritionist: nutriName,
        nutritionistInitials: initials(nutriName),
        scheduledISO: r.scheduled_at,
        durationMin: r.duration_min,
        status: r.status,
      }
    })
  }, [])

  const sourceList = (live.data && live.data.length > 0) ? live.data : SEED

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceList.filter((b) => {
      if (filter !== 'all' && b.status !== filter) return false
      if (
        q &&
        !b.client.toLowerCase().includes(q) &&
        !b.clientEmail.toLowerCase().includes(q) &&
        !b.nutritionist.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [filter, query, sourceList])

  const totalSessions = sourceList.length
  const thisWeek = sourceList.filter(
    (b) => b.status === 'scheduled' && new Date(b.scheduledISO) <= new Date(Date.now() + 7 * 86400 * 1000),
  ).length
  const completed = sourceList.filter((b) => b.status === 'completed').length
  const cancelled = sourceList.filter((b) => b.status === 'cancelled' || b.status === 'noShow').length
  const completionRate = Math.round((completed / Math.max(1, totalSessions)) * 100)
  const cancelRate = Math.round((cancelled / Math.max(1, totalSessions)) * 100)

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('bookings')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tB('subtitle')}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
          {tB('exportCsv')}
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat Icon={CalIcon}        tint="#a3e635" label={tB('totalSessions')}      value={totalSessions} />
        <Stat Icon={CalendarClock}  tint="#06b6d4" label={tB('scheduledThisWeek')}  value={thisWeek} />
        <Stat Icon={TrendingUp}     tint="#e8912a" label={tB('completionRate')}     value={`${completionRate}%`} />
        <Stat Icon={CalendarX}      tint="#f43f5e" label={tB('cancelRate')}         value={`${cancelRate}%`} />
      </section>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tB('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-primary/20 text-lime-400 border border-primary/40'
                  : 'bg-surface border border-border text-fg-2 hover:border-primary/40'
              }`}
            >
              {f === 'all' ? tB('filterAll') : tB(`statuses.${f}` as 'statuses.scheduled')}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <CalIcon className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tB('noBookings')}</p>
          <p className="mt-1 text-sm text-fg-2">{tB('noBookingsBody')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.2fr_1.5fr_1.2fr_1.3fr_0.8fr_0.8fr_auto] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            <div>{tB('col.session')}</div>
            <div>{tB('col.client')}</div>
            <div>{tB('col.nutritionist')}</div>
            <div>{tB('col.scheduled')}</div>
            <div>{tB('col.duration')}</div>
            <div>{tB('col.status')}</div>
            <div className="sr-only">{tB('col.actions')}</div>
          </div>
          <ul className="divide-y divide-border">
            {visible.map((b) => (
              <Row key={b.id} tB={tB} booking={b} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ tB, booking }: { tB: ReturnType<typeof useTranslations>; booking: AdminBooking }) {
  const status = STATUS_META[booking.status]
  const TypeIcon = TYPE_ICON[booking.type]
  const tint = TYPE_TINT[booking.type]
  const dt = new Date(booking.scheduledISO)
  return (
    <li className="md:grid md:grid-cols-[1.2fr_1.5fr_1.2fr_1.3fr_0.8fr_0.8fr_auto] gap-3 items-center px-5 py-3 hover:bg-surface-raised transition-colors">
      {/* Session type */}
      <div className="flex items-center gap-2 mb-2 md:mb-0">
        <TypeIcon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: tint }} />
        <p className="text-sm font-semibold text-fg-1">
          {tB(`types.${booking.type}` as 'types.introCall')}
        </p>
      </div>

      {/* Client */}
      <Cell label={tB('col.client')}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center font-display text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg,#5c7262,#2c3e35)', color: '#f0ede6' }}
          >
            {booking.clientInitials}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-fg-1 truncate">{booking.client}</p>
            <p className="text-[10px] text-fg-3 font-mono truncate" dir="ltr">
              {booking.clientEmail}
            </p>
          </div>
        </div>
      </Cell>

      {/* Nutritionist */}
      <Cell label={tB('col.nutritionist')}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center font-display text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1a12' }}
          >
            {booking.nutritionistInitials}
          </span>
          <p className="text-sm text-fg-1 truncate">{booking.nutritionist}</p>
        </div>
      </Cell>

      {/* Scheduled */}
      <Cell label={tB('col.scheduled')} mono>
        {dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
        {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </Cell>

      {/* Duration */}
      <Cell label={tB('col.duration')} mono>
        {tB('minLabel', { count: booking.durationMin })}
      </Cell>

      {/* Status */}
      <Cell label={tB('col.status')}>
        <span
          className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
          style={{ background: `${status.tint}1a`, color: status.tint }}
        >
          {tB(`statuses.${booking.status}` as 'statuses.scheduled')}
        </span>
      </Cell>

      {/* Actions */}
      <div className="md:justify-self-end flex items-center gap-1">
        {booking.status === 'scheduled' && (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md h-8 px-2.5 text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25"
              style={{ color: '#e8912a' }}
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              {tB('refundBooking')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md h-8 px-2.5 text-[11px] font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
            >
              <XCircle className="w-3 h-3" strokeWidth={1.75} />
              {tB('cancelBooking')}
            </button>
          </>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md h-8 px-2.5 text-[11px] font-semibold bg-surface-raised border border-border text-fg-1 hover:border-primary/40"
        >
          {tB('viewDetails')}
        </button>
      </div>
    </li>
  )
}

function Cell({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
      <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </span>
      <div className={`text-xs ${mono ? 'font-mono text-fg-2' : 'text-fg-1'}`} dir={mono ? 'ltr' : undefined}>
        {children}
      </div>
    </div>
  )
}

function Stat({
  Icon,
  tint,
  label,
  value,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: string | number
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: tint }} />
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {label}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {value}
      </p>
    </article>
  )
}
