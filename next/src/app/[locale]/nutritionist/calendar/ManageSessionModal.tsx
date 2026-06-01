'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Trash2, Check, Ban, Clock } from '@/icons'

export interface ManageSession {
  id: string
  date: string // YYYY-MM-DD (local)
  start: string // HH:mm (local)
  durationMin: number
  type: 'introCall' | 'followUp' | 'deepDive' | 'inClinicVisit'
  clientName: string
  isClinic: boolean
  status: string
}

interface Props {
  session: ManageSession
  onClose: () => void
  /** Called after any successful change so the calendar reloads. */
  onUpdated: () => void
}

const ONLINE_TYPES: { value: ManageSession['type']; label: string }[] = [
  { value: 'introCall', label: 'Intro call' },
  { value: 'followUp', label: 'Follow-up' },
  { value: 'deepDive', label: 'Deep dive' },
]

export default function ManageSessionModal({ session, onClose, onUpdated }: Props) {
  const [date, setDate] = useState(session.date)
  const [time, setTime] = useState(session.start)
  const [duration, setDuration] = useState(session.durationMin)
  const [type, setType] = useState<ManageSession['type']>(session.type)
  const [busy, setBusy] = useState(false)

  async function patch(payload: Record<string, unknown>, successMsg: string) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/nutritionist/bookings/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        toast.success(successMsg)
        onUpdated()
        onClose()
      } else {
        toast.error(data.error ?? 'Could not update the appointment.')
      }
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setBusy(false)
    }
  }

  function saveReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      toast.error('Pick a valid date and time.')
      return
    }
    void patch(
      {
        // date+time interpreted server-side in the coach's timezone.
        date,
        time,
        duration_min: duration,
        ...(session.isClinic ? {} : { type }),
      },
      'Appointment updated.',
    )
  }

  async function remove() {
    if (busy) return
    if (!confirm('Delete this appointment? This cannot be undone.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/nutritionist/bookings/${session.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Appointment deleted.')
        onUpdated()
        onClose()
      } else {
        toast.error('Could not delete the appointment.')
      }
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary'
  const labelCls = 'text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={saveReschedule}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg-1 truncate">{session.clientName}</h2>
            <p className="text-xs text-fg-3 mt-0.5">
              {session.isClinic ? 'In-clinic visit' : 'Online session'}
              {session.status === 'cancelled' && ' · cancelled'}
              {session.status === 'completed' && ' · completed'}
              {session.status === 'noShow' && ' · no-show'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-fg-3 hover:text-fg-1" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Reschedule */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Time</span>
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Duration (min)</span>
            <input type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls} />
          </label>
          {!session.isClinic && (
            <label className="block">
              <span className={labelCls}>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as ManageSession['type'])} className={inputCls}>
                {ONLINE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
        >
          <Clock className="w-4 h-4" strokeWidth={2} />
          Save changes
        </button>

        {/* Status actions */}
        <div className="pt-3 border-t border-border">
          <span className={labelCls}>Mark as</span>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={busy} onClick={() => void patch({ status: 'completed' }, 'Marked completed.')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-deeper h-9 text-xs font-semibold text-fg-1 hover:border-lime-600/50 disabled:opacity-50">
              <Check className="w-3.5 h-3.5 text-lime-400" strokeWidth={2.25} /> Done
            </button>
            <button type="button" disabled={busy} onClick={() => void patch({ status: 'noShow' }, 'Marked no-show.')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-deeper h-9 text-xs font-semibold text-fg-1 hover:border-amber-500/50 disabled:opacity-50">
              <Ban className="w-3.5 h-3.5" style={{ color: '#e8912a' }} strokeWidth={2} /> No-show
            </button>
            <button type="button" disabled={busy} onClick={() => void patch({ status: 'cancelled' }, 'Appointment cancelled.')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-bg-deeper h-9 text-xs font-semibold text-fg-1 hover:border-rose-500/50 disabled:opacity-50">
              <X className="w-3.5 h-3.5 text-rose-400" strokeWidth={2.25} /> Cancel
            </button>
          </div>
        </div>

        {/* Delete */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button type="button" disabled={busy} onClick={() => void remove()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:underline disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Delete appointment
          </button>
          <button type="button" onClick={onClose}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40">
            Close
          </button>
        </div>
      </form>
    </div>
  )
}
