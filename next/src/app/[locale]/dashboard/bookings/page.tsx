'use client'


import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  Video,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from '@/icons'
import { NUTRITIONIST } from '@/lib/tokens'

type SessionId = 'introCall' | 'followUp' | 'deepDive'
type Step = 'type' | 'when' | 'confirm'
type Tab = 'new' | 'upcoming' | 'past'

interface SessionType {
  id: SessionId
  Icon: LucideIcon
  durationMin: number
  priceLabel: string
  free?: boolean
  recommended?: boolean
}

interface BookingRecord {
  id: string
  type: SessionId
  /** ISO date like 2026-05-08 */
  date: string
  time: string
  status: 'upcoming' | 'past'
  notes?: string
}

const SESSIONS: SessionType[] = [
  { id: 'introCall', Icon: Sparkles, durationMin: 20, priceLabel: '0',  free: true },
  { id: 'followUp', Icon: Video,    durationMin: 30, priceLabel: '15', recommended: true },
  { id: 'deepDive', Icon: Calendar, durationMin: 60, priceLabel: '35' },
]

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
]

/** Demo seed — replaced by `bookings` table query in Cluster H */
const SEED: BookingRecord[] = [
  {
    id: 'b1',
    type: 'followUp',
    date: '2026-05-08',
    time: '15:30',
    status: 'upcoming',
    notes: 'Want to review the past two weeks of food logs.',
  },
  {
    id: 'b2',
    type: 'introCall',
    date: '2026-04-19',
    time: '10:00',
    status: 'past',
  },
]

function fmtDate(iso: string, locale = 'en-US') {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function BookingsPage() {
  const t = useTranslations('bookings')
  const { profile } = useUser()
  const userId = profile?.id ?? null
  const [tab, setTab] = useState<Tab>('new')
  const [bookings, setBookings] = useState<BookingRecord[]>(SEED)

  // Hydrate from bookings table
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      type Row = {
        id: string
        type: SessionId
        scheduled_at: string
        status: 'scheduled' | 'completed' | 'cancelled' | 'noShow'
        notes: string | null
      }
      const { data } = await supabase
        .from('bookings')
        .select('id, type, scheduled_at, status, notes')
        .eq('client_id', userId)
        .order('scheduled_at', { ascending: false })
        .limit(40)
      if (cancelled) return
      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0) return
      const now = Date.now()
      setBookings(
        rows.map((r) => {
          const dt = new Date(r.scheduled_at)
          const isFuture = dt.getTime() > now
          return {
            id: r.id,
            type: r.type,
            date: r.scheduled_at.slice(0, 10),
            time: dt.toLocaleTimeString(undefined, {
              hour: '2-digit', minute: '2-digit', hour12: false,
            }),
            status: isFuture && r.status === 'scheduled' ? 'upcoming' : 'past',
            notes: r.notes ?? undefined,
          }
        }),
      )
    })()
    return () => { cancelled = true }
  }, [userId])

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-1 border-b border-border" aria-label="Booking tabs">
        <TabBtn label={t('newBooking')}      active={tab === 'new'}       onClick={() => setTab('new')} />
        <TabBtn label={t('upcoming')}        active={tab === 'upcoming'}  onClick={() => setTab('upcoming')} />
        <TabBtn label={t('past')}            active={tab === 'past'}      onClick={() => setTab('past')} />
      </nav>

      {tab === 'new' && (
        <NewBookingFlow
          t={t}
          drName={NUTRITIONIST.name}
          onConfirm={async (rec) => {
            setBookings((curr) => [rec, ...curr])
            setTab('upcoming')

            const supabase = getBrowserSupabase()
            if (!supabase || !userId) return

            // Persist the booking
            const scheduledAt = new Date(`${rec.date}T${rec.time}:00`).toISOString()
            const durationMin =
              rec.type === 'introCall' ? 20 :
              rec.type === 'followUp'  ? 30 : 60
            const { data: row } = await supabase
              .from('bookings')
              .insert({
                client_id: userId,
                nutritionist_id: userId, // placeholder until nutritionist assignment is wired
                type: rec.type,
                scheduled_at: scheduledAt,
                duration_min: durationMin,
                status: 'scheduled',
                notes: rec.notes ?? null,
              } as never)
              .select('id')
              .maybeSingle()
            const realId = (row as { id?: string } | null)?.id
            if (realId) {
              setBookings((curr) =>
                curr.map((b) => (b.id === rec.id ? { ...b, id: realId } : b)),
              )
              // Paid sessions go through Stripe; intro is free
              if (rec.type !== 'introCall') {
                try {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind: 'booking', bookingId: realId }),
                  })
                  if (res.ok) {
                    const { url } = (await res.json()) as { url: string }
                    if (url) window.location.href = url
                  }
                } catch {
                  /* leave the booking as scheduled — user can retry payment from the row */
                }
              }
            }
          }}
        />
      )}

      {tab === 'upcoming' && (
        <BookingList
          t={t}
          drName={NUTRITIONIST.name}
          empty={t('noUpcoming')}
          rows={bookings.filter((b) => b.status === 'upcoming')}
          onCancel={async (id) => {
            setBookings((curr) => curr.filter((b) => b.id !== id))
            const supabase = getBrowserSupabase()
            if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
              await supabase
                .from('bookings')
                .update({ status: 'cancelled' } as never)
                .eq('id', id)
            }
          }}
        />
      )}

      {tab === 'past' && (
        <BookingList
          t={t}
          drName={NUTRITIONIST.name}
          empty={t('noPast')}
          rows={bookings.filter((b) => b.status === 'past')}
        />
      )}
    </motion.div>
  )
}

/* ── New booking 3-step flow ────────────────────────────────────── */

function NewBookingFlow({
  t,
  drName,
  onConfirm,
}: {
  t: ReturnType<typeof useTranslations>
  drName: string
  onConfirm: (rec: BookingRecord) => void
}) {
  const [step, setStep] = useState<Step>('type')
  const [type, setType] = useState<SessionId | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const next = () => {
    if (step === 'type' && type) setStep('when')
    else if (step === 'when' && date && time) setStep('confirm')
  }
  const back = () => {
    if (step === 'when') setStep('type')
    else if (step === 'confirm') setStep('when')
  }

  const submit = () => {
    if (!type || !date || !time) return
    setConfirmed(true)
    window.setTimeout(() => {
      onConfirm({
        id: `b-${Date.now()}`,
        type,
        date,
        time,
        status: 'upcoming',
        notes: notes.trim() || undefined,
      })
    }, 800)
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Stepper t={t} step={step} />

      {step === 'type' && (
        <SessionPicker t={t} value={type} onChange={setType} />
      )}

      {step === 'when' && (
        <DateTimePicker
          t={t}
          date={date}
          time={time}
          onChangeDate={setDate}
          onChangeTime={setTime}
        />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          t={t}
          drName={drName}
          type={type!}
          date={date!}
          time={time!}
          notes={notes}
          onChangeNotes={setNotes}
          confirmed={confirmed}
        />
      )}

      <footer className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={back}
          disabled={step === 'type' || confirmed}
          className="inline-flex items-center gap-1.5 rounded-pill h-10 px-4 text-xs font-semibold bg-surface-raised border border-border text-fg-2 hover:text-fg-1 disabled:opacity-30"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
          {t('back')}
        </button>
        {step === 'confirm' ? (
          <button
            type="button"
            onClick={submit}
            disabled={confirmed}
            className={`inline-flex items-center gap-2 rounded-pill h-11 px-6 text-sm font-semibold transition-all ${
              confirmed
                ? 'bg-primary/20 text-lime-400'
                : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
            }`}
          >
            {confirmed ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.25} />
                {t('bookingConfirmed')}
              </>
            ) : (
              <>
                {t('confirmBooking')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={
              (step === 'type' && !type) ||
              (step === 'when' && (!date || !time))
            }
            className="inline-flex items-center gap-2 rounded-pill h-11 px-6 text-sm font-semibold bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {t('next')}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
          </button>
        )}
      </footer>
    </div>
  )
}

function Stepper({
  t,
  step,
}: {
  t: ReturnType<typeof useTranslations>
  step: Step
}) {
  const items: { id: Step; label: string }[] = [
    { id: 'type',    label: t('step1') },
    { id: 'when',    label: t('step2') },
    { id: 'confirm', label: t('step3') },
  ]
  const idx = items.findIndex((i) => i.id === step)
  return (
    <ol className="flex items-center gap-2 md:gap-4 text-xs">
      {items.map((it, i) => {
        const isActive = i === idx
        const isDone = i < idx
        return (
          <li key={it.id} className="flex items-center gap-2 md:gap-4">
            <div
              className={`flex items-center gap-2 ${
                isActive
                  ? 'text-fg-1'
                  : isDone
                    ? 'text-lime-400'
                    : 'text-fg-3'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold ${
                  isActive
                    ? 'bg-primary/20 text-lime-400 border border-primary/40'
                    : isDone
                      ? 'bg-primary/15 text-lime-400'
                      : 'bg-surface-raised border border-border'
                }`}
                dir="ltr"
              >
                {isDone ? (
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="font-semibold uppercase tracking-eyebrow text-[10px] md:text-[11px]">
                {it.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="hidden md:block w-12 h-px bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SessionPicker({
  t,
  value,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  value: SessionId | null
  onChange: (v: SessionId) => void
}) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {SESSIONS.map((s) => {
        const Icon = s.Icon
        const selected = value === s.id
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onChange(s.id)}
              className={`relative w-full text-start rounded-xl border p-5 transition-all ${
                selected
                  ? 'border-primary/60 bg-primary/10 shadow-lime-glow'
                  : 'border-border bg-surface hover:border-primary/40'
              }`}
            >
              {s.recommended && !selected && (
                <span className="absolute top-3 end-3 text-[10px] uppercase tracking-eyebrow font-semibold text-amber-300" style={{ color: '#e8912a' }}>
                  ★
                </span>
              )}
              <Icon
                className="w-6 h-6 mb-4 text-lime-400"
                strokeWidth={1.75}
              />
              <h3 className="text-base font-semibold text-fg-1">
                {t(s.id)}
              </h3>
              <p className="mt-1.5 text-xs text-fg-2 leading-relaxed">
                {t(`${s.id}Desc` as 'introCallDesc')}
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs font-mono" dir="ltr">
                <span className="text-fg-3">
                  {t('min', { count: s.durationMin })}
                </span>
                {s.free ? (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                    style={{
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                    }}
                  >
                    {t('free')}
                  </span>
                ) : (
                  <span
                    className="text-base font-semibold"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {s.priceLabel}{' '}
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                      USD
                    </span>
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function DateTimePicker({
  t,
  date,
  time,
  onChangeDate,
  onChangeTime,
}: {
  t: ReturnType<typeof useTranslations>
  date: string | null
  time: string | null
  onChangeDate: (d: string) => void
  onChangeTime: (h: string) => void
}) {
  const [monthOffset, setMonthOffset] = useState(0)
  const today = useMemo(() => new Date(), [])
  const view = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
    return d
  }, [monthOffset, today])

  const monthLabel = view.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const days = useMemo(() => buildMonthGrid(view), [view])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-5">
        <header className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
            {t('pickDate')}
          </p>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonthOffset((m) => m - 1)}
              className="w-8 h-8 rounded-md inline-flex items-center justify-center bg-surface-raised border border-border text-fg-2 hover:text-fg-1"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
            </button>
            <span className="px-3 text-sm font-medium text-fg-1 min-w-32 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setMonthOffset((m) => m + 1)}
              className="w-8 h-8 rounded-md inline-flex items-center justify-center bg-surface-raised border border-border text-fg-2 hover:text-fg-1"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
            </button>
          </div>
        </header>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isOff = !d.inMonth
            const iso = d.iso
            const isPast = d.date.getTime() < startOfDay(today).getTime()
            const isToday = sameDay(d.date, today)
            const isSelected = iso === date
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChangeDate(iso)}
                disabled={isOff || isPast}
                className={`aspect-square rounded-md text-sm font-mono transition-colors ${
                  isOff || isPast
                    ? 'text-fg-3/40 cursor-not-allowed'
                    : isSelected
                      ? 'bg-primary/25 text-lime-400 border border-primary/60 font-bold'
                      : isToday
                        ? 'bg-surface-raised text-fg-1 border border-primary/30'
                        : 'bg-bg-deeper/50 text-fg-1 hover:bg-surface-raised border border-border'
                }`}
                dir="ltr"
              >
                {d.date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5">
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-4">
          {t('pickTime')}
        </p>
        {!date ? (
          <p className="text-sm text-fg-3 text-center mt-8">
            {t('pickDate')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onChangeTime(slot)}
                className={`h-10 rounded-md text-sm font-mono transition-colors ${
                  time === slot
                    ? 'bg-primary/25 text-lime-400 border border-primary/60 font-bold'
                    : 'bg-bg-deeper/50 text-fg-1 hover:bg-surface-raised border border-border'
                }`}
                dir="ltr"
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmStep({
  t,
  drName,
  type,
  date,
  time,
  notes,
  onChangeNotes,
  confirmed,
}: {
  t: ReturnType<typeof useTranslations>
  drName: string
  type: SessionId
  date: string
  time: string
  notes: string
  onChangeNotes: (s: string) => void
  confirmed: boolean
}) {
  const session = SESSIONS.find((s) => s.id === type)!
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <article className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <Row label={t('pickType')} value={t(type)} />
        <Row
          label={t('duration')}
          value={t('min', { count: session.durationMin })}
        />
        <Row label={t('with', { name: drName })} value={drName} />
        <Row label={t('pickDate')} value={fmtDate(date)} />
        <Row label={t('pickTime')} value={time} mono />
        {!session.free && (
          <Row
            label={t('perSession')}
            value={`${session.priceLabel} USD`}
            mono
          />
        )}
      </article>
      <article className="rounded-xl border border-border bg-surface p-5">
        <label
          htmlFor="notes"
          className="block text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3"
        >
          {t('addNotes')}
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          disabled={confirmed}
          rows={6}
          maxLength={1000}
          placeholder={t('notesPlaceholder')}
          className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed resize-none disabled:opacity-60"
        />
      </article>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </span>
      <span
        className={`text-sm text-fg-1 ${mono ? 'font-mono' : 'font-medium'}`}
        dir={mono ? 'ltr' : undefined}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Booking list ───────────────────────────────────────────────── */

function BookingList({
  t,
  drName,
  empty,
  rows,
  onCancel,
}: {
  t: ReturnType<typeof useTranslations>
  drName: string
  empty: string
  rows: BookingRecord[]
  onCancel?: (id: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <Calendar
          className="w-9 h-9 mx-auto mb-3 text-fg-3"
          strokeWidth={1.5}
        />
        <p className="text-base font-semibold text-fg-1">{empty}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((b) => {
        const session = SESSIONS.find((s) => s.id === b.type)!
        const isUpcoming = b.status === 'upcoming'
        return (
          <li
            key={b.id}
            className="rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4"
          >
            <session.Icon
              className="w-6 h-6 text-primary flex-shrink-0"
              strokeWidth={1.75}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg-1">{t(b.type)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-2 font-mono" dir="ltr">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-fg-3" strokeWidth={1.75} />
                  {fmtDate(b.date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-fg-3" strokeWidth={1.75} />
                  {b.time}
                </span>
                <span className="text-fg-3">{t('with', { name: drName })}</span>
              </div>
              {b.notes && (
                <p className="mt-2 text-xs text-fg-3 line-clamp-2">{b.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ms-auto">
              {isUpcoming ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60"
                  >
                    <Video className="w-3.5 h-3.5" strokeWidth={2} />
                    {t('joinSession')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel?.(b.id)}
                    aria-label={t('cancelBooking')}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-raised border border-border text-fg-2 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </>
              ) : (
                <span className="rounded-pill bg-bg-deeper border border-border text-fg-3 px-3 h-7 text-[11px] font-semibold inline-flex items-center uppercase tracking-eyebrow">
                  {t('past')}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ── Helpers ────────────────────────────────────────────────────── */

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-10 px-4 text-sm font-medium transition-colors ${
        active ? 'text-fg-1' : 'text-fg-3 hover:text-fg-1'
      }`}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-0.5 bg-lime-400 rounded-pill"
        />
      )}
    </button>
  )
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface DayCell {
  date: Date
  inMonth: boolean
  iso: string
}

function buildMonthGrid(viewMonth: Date): DayCell[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const startWeekday = (first.getDay() + 6) % 7 // Monday-first
  const start = new Date(first)
  start.setDate(first.getDate() - startWeekday)

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      date: d,
      inMonth: d.getMonth() === viewMonth.getMonth(),
      iso: d.toISOString().slice(0, 10),
    })
  }
  return cells
}
