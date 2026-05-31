'use client'

import { useCallback, useEffect, useState } from 'react'
import { Calendar, Loader2, Clock } from '@/icons'
import { FetchError } from '@/components/dashboard/FetchError'

/**
 * /dashboard/appointments — a linked walk-in client's clinic visits
 * (the bookings their coach records). Upcoming first, then past.
 */
interface Appointment {
  id: string
  scheduled_at: string | null
  duration_min: number | null
  status: string | null
  type: string | null
  notes: string | null
}

const TYPE_LABEL: Record<string, string> = {
  introCall: 'Intro call',
  followUp: 'Follow-up',
  deepDive: 'Deep dive',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled: { bg: 'rgba(163,230,53,0.16)', color: '#65a30d', label: 'Scheduled' },
  completed: { bg: 'rgba(148,163,184,0.16)', color: 'var(--gf-fg-3)', label: 'Completed' },
  cancelled: { bg: 'rgba(244,63,94,0.14)', color: '#e11d48', label: 'Cancelled' },
  noShow: { bg: 'rgba(232,145,42,0.14)', color: '#e8912a', label: 'No-show' },
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/my-appointments', { cache: 'no-store' })
      if (res.ok) setItems(((await res.json()) as { appointments: Appointment[] }).appointments ?? [])
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const now = Date.now()
  const upcoming = items.filter((a) => a.scheduled_at && new Date(a.scheduled_at).getTime() >= now && a.status !== 'cancelled')
  const past = items.filter((a) => !upcoming.includes(a))

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-md mx-auto space-y-5">
      <header>
        <h1 className="font-display font-bold text-fg-1 tracking-tight" style={{ fontSize: 'clamp(24px,4vw,34px)', lineHeight: 1.1 }}>
          Appointments
        </h1>
        <p className="mt-2 text-sm text-fg-2">Your clinic visits with your coach.</p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <FetchError onRetry={() => { setLoading(true); void refresh() }} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-fg-2">No appointments yet. Your coach will schedule visits here.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Group title="Upcoming" items={upcoming} />
          )}
          {past.length > 0 && (
            <Group title="Past" items={past} dim />
          )}
        </>
      )}
    </div>
  )
}

function Group({ title, items, dim }: { title: string; items: Appointment[]; dim?: boolean }) {
  return (
    <section>
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-bold mb-2">{title}</p>
      <ul className="space-y-2.5">
        {items.map((a) => {
          const s = STATUS_STYLE[a.status ?? ''] ?? { bg: 'var(--gf-input-bg)', color: 'var(--gf-fg-3)', label: a.status ?? '—' }
          const d = a.scheduled_at ? new Date(a.scheduled_at) : null
          return (
            <li key={a.id} className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3" style={{ opacity: dim ? 0.85 : 1 }}>
              <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: 'rgba(74,222,128,0.14)', color: '#4ade80' }}>
                <Calendar className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-fg-1">
                    {d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                  </p>
                  <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-fg-3 inline-flex items-center gap-2 flex-wrap">
                  {d && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.75} />
                      {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                  {a.duration_min ? <span>· {a.duration_min} min</span> : null}
                  {a.type ? <span>· {TYPE_LABEL[a.type] ?? a.type}</span> : null}
                </p>
                {a.notes && <p className="mt-1.5 text-xs text-fg-2 whitespace-pre-wrap">{a.notes}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
